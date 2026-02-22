import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { onboardingStep3Schema } from "@/lib/hr/schemas";
import { upsertEmployeeDocument } from "@/lib/hr/onboarding";
import { cleanNullableString, parseDateInput } from "@/lib/hr/utils";
import { resolveOnboardingRoleName } from "@/lib/hr/access";
import { canActivateOnboarding, assertOnboardingProgression } from "@/lib/hr/domain";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, [], "HR:EMPLOYEES:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => ({}));
  const parsed = onboardingStep3Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const employee = await prisma.hrEmployee.findUnique({ where: { id: resolvedParams.id } });
  if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  try {
    assertOnboardingProgression({ status: employee.onboardingStatus as any, step: employee.onboardingStep || 1 }, 3);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  let userId: string | null | undefined = employee.userId;
  const user = parsed.data.user || { mode: "none" };
  const roleDecision = resolveOnboardingRoleName({ actor: auth.user, requestedRoleName: user.roleName });
  if ("error" in roleDecision) {
    return NextResponse.json({ error: roleDecision.error }, { status: roleDecision.status });
  }
  const roleName = roleDecision.roleName;

  if (user.mode === "link") {
    const target =
      (user.userId && (await prisma.user.findUnique({ where: { id: user.userId } }))) ||
      (user.email && (await prisma.user.findUnique({ where: { email: user.email } })));
    if (!target) return NextResponse.json({ error: "Usuario no encontrado para vincular" }, { status: 400 });

    const linked = await prisma.hrEmployee.findFirst({
      where: { userId: target.id, NOT: { id: employee.id } }
    });
    if (linked) return NextResponse.json({ error: "Usuario ya vinculado a otro empleado" }, { status: 400 });
    userId = target.id;
  }

  if (user.mode === "create") {
    if (!user.email || !user.password) {
      return NextResponse.json({ error: "Correo y password requeridos" }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (existing) return NextResponse.json({ error: "Correo ya utilizado por otro usuario" }, { status: 409 });
    const hash = await bcrypt.hash(user.password, 10);
    const created = await prisma.user.create({
      data: {
        email: user.email,
        name: user.name || null,
        passwordHash: hash,
        isActive: true
      }
    });
    userId = created.id;
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.data.documents) {
        for (const doc of parsed.data.documents) {
          await upsertEmployeeDocument(
            tx,
            employee.id,
            {
              ...doc,
              visibility: doc.visibility || undefined
            },
            auth.user?.id
          );
        }
      }

      if (parsed.data.professionalLicense) {
        const license = parsed.data.professionalLicense;
        await tx.professionalLicense.upsert({
          where: { employeeId: employee.id },
          update: {
            applies: license.applies ?? false,
            licenseNumber: cleanNullableString(license.licenseNumber),
            issuedAt: parseDateInput(license.issuedAt, "Emitido colegiado"),
            expiresAt: parseDateInput(license.expiresAt, "Vence colegiado"),
            issuingEntity: cleanNullableString(license.issuingEntity),
            fileUrl: cleanNullableString(license.fileUrl),
            reminderDays: license.reminderDays || null,
            notes: cleanNullableString(license.notes)
          },
          create: {
            employeeId: employee.id,
            applies: license.applies ?? false,
            licenseNumber: cleanNullableString(license.licenseNumber),
            issuedAt: parseDateInput(license.issuedAt, "Emitido colegiado"),
            expiresAt: parseDateInput(license.expiresAt, "Vence colegiado"),
            issuingEntity: cleanNullableString(license.issuingEntity),
            fileUrl: cleanNullableString(license.fileUrl),
            reminderDays: license.reminderDays || null,
            notes: cleanNullableString(license.notes)
          }
        });
      }

      if (userId) {
        const role = await tx.role.findFirst({ where: { name: roleName } });
        if (role) {
          await tx.userRole.upsert({
            where: { userId_roleId: { userId, roleId: role.id } },
            update: {},
            create: { userId, roleId: role.id }
          });
        } else {
          throw new Error("Rol no encontrado");
        }
      }

      const engagements = await tx.employeeEngagement.findMany({ where: { employeeId: employee.id } });
      const compensations = await tx.employeeCompensation.findMany({ where: { engagementId: { in: engagements.map((e) => e.id) }, isActive: true } });
      const readiness = canActivateOnboarding({ engagements, compensations });
      if (!readiness.ok) {
        throw new Error("Onboarding incompleto: falta compensación o relación laboral");
      }

      const saved = await tx.hrEmployee.update({
        where: { id: employee.id },
        data: {
          onboardingStatus: "ACTIVE",
          onboardingStep: 3,
          completedAt: new Date(),
          userId: userId ?? null,
          isActive: true
        }
      });

      return saved;
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        onboardingStatus: updated.onboardingStatus,
        onboardingStep: updated.onboardingStep
      }
    });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({ error: "Error al guardar documentos/licencia" }, { status: 400 });
    }
    return NextResponse.json({ error: err?.message || "Error al guardar" }, { status: 400 });
  }
}
