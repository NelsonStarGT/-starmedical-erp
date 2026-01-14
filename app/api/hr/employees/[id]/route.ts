import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { HrEmployeeStatus, NotificationSeverity, NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { updateEmployeeSchema } from "@/lib/hr/schemas";
import { employeeInclude, serializeEmployee } from "@/lib/hr/serializers";
import { cleanNullableString, ensurePrimary, parseDateInput } from "@/lib/hr/utils";

export const dynamic = "force-dynamic";

async function findEmployee(id: string) {
  return prisma.hrEmployee.findUnique({ where: { id }, include: employeeInclude });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER", "STAFF", "VIEWER"]);
  if (auth.errorResponse) return auth.errorResponse;

  const employee = await findEmployee(resolvedParams.id);
  if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  return NextResponse.json({ data: serializeEmployee(employee) });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const parsed = updateEmployeeSchema.parse(body);
    const employee = await prisma.hrEmployee.findUnique({ where: { id: resolvedParams.id } });
    if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

    const updateData: Prisma.HrEmployeeUpdateInput = {};
    if (parsed.employeeCode !== undefined) updateData.employeeCode = parsed.employeeCode.trim();
    if (parsed.firstName !== undefined) updateData.firstName = parsed.firstName.trim();
    if (parsed.lastName !== undefined) updateData.lastName = parsed.lastName.trim();
    if (parsed.dpi !== undefined) updateData.dpi = parsed.dpi.trim();
    if (parsed.nit !== undefined) updateData.nit = cleanNullableString(parsed.nit);
    if (parsed.email !== undefined) updateData.email = cleanNullableString(parsed.email);
    if (parsed.personalEmail !== undefined) updateData.personalEmail = cleanNullableString(parsed.personalEmail);
    if (parsed.phoneMobile !== undefined) updateData.phoneMobile = cleanNullableString(parsed.phoneMobile);
    if (parsed.phoneHome !== undefined) updateData.phoneHome = parsed.phoneHome ? parsed.phoneHome.trim() : null;
    if (parsed.birthDate !== undefined) updateData.birthDate = parseDateInput(parsed.birthDate, "Fecha de nacimiento");
    if (parsed.addressHome !== undefined) updateData.addressHome = parsed.addressHome ? parsed.addressHome.trim() : null;
    if (parsed.notes !== undefined) updateData.notes = cleanNullableString(parsed.notes);
    if (parsed.isExternal !== undefined) updateData.isExternal = parsed.isExternal;
    if (parsed.emergencyContactName !== undefined) updateData.emergencyContactName = cleanNullableString(parsed.emergencyContactName);
    if (parsed.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = cleanNullableString(parsed.emergencyContactPhone);
    if (parsed.residenceProofUrl !== undefined) updateData.residenceProofUrl = cleanNullableString(parsed.residenceProofUrl);
    if (parsed.dpiPhotoUrl !== undefined) updateData.dpiPhotoUrl = cleanNullableString(parsed.dpiPhotoUrl);
    if (parsed.rtuFileUrl !== undefined) updateData.rtuFileUrl = cleanNullableString(parsed.rtuFileUrl);
    if (parsed.photoUrl !== undefined) updateData.photoUrl = cleanNullableString(parsed.photoUrl);
    if (parsed.primaryLegalEntityId !== undefined) {
      const primaryLegalEntityId = cleanNullableString(parsed.primaryLegalEntityId);
      updateData.primaryLegalEntity = primaryLegalEntityId ? { connect: { id: primaryLegalEntityId } } : { disconnect: true };
    }
    if (parsed.status !== undefined) {
      updateData.status = parsed.status;
      updateData.isActive = parsed.status !== HrEmployeeStatus.TERMINATED;
    }
    if (parsed.onboardingStatus !== undefined) updateData.onboardingStatus = parsed.onboardingStatus;
    if (parsed.onboardingStep !== undefined) updateData.onboardingStep = parsed.onboardingStep;
    if (parsed.completedAt !== undefined) updateData.completedAt = parseDateInput(parsed.completedAt, "Fecha de finalización");

    const engagements = parsed.engagements
      ? ensurePrimary(parsed.engagements || []).map((eng) => ({
          ...eng,
          startDate: parseDateInput(eng.startDate, "Fecha de inicio", { required: true })!,
          endDate: parseDateInput(eng.endDate, "Fecha fin")
        }))
      : null;

    const branchAssignments = parsed.branchAssignments
      ? ensurePrimary(parsed.branchAssignments || []).map((assign) => ({
          ...assign,
          startDate: parseDateInput(assign.startDate, "Fecha de inicio"),
          endDate: parseDateInput(assign.endDate, "Fecha fin")
        }))
      : null;

    const positionAssignments = parsed.positionAssignments
      ? ensurePrimary(parsed.positionAssignments || []).map((assign) => ({
          ...assign,
          startDate: parseDateInput(assign.startDate, "Fecha de inicio"),
          endDate: parseDateInput(assign.endDate, "Fecha fin")
        }))
      : null;

    if (engagements) {
      const legalEntityIds = Array.from(new Set(engagements.map((e) => e.legalEntityId.trim())));
      const entities = await prisma.legalEntity.findMany({ where: { id: { in: legalEntityIds } } });
      if (entities.length !== legalEntityIds.length) return NextResponse.json({ error: "Razón social inválida" }, { status: 400 });
    }
    if (branchAssignments) {
      const branchIds = Array.from(new Set(branchAssignments.map((b) => b.branchId.trim())));
      const branches = await prisma.branch.findMany({ where: { id: { in: branchIds } } });
      if (branches.length !== branchIds.length) return NextResponse.json({ error: "Sucursal inválida" }, { status: 400 });
    }
    if (positionAssignments) {
      const positionIds = Array.from(new Set(positionAssignments.map((p) => p.positionId.trim())));
      const positions = await prisma.hrPosition.findMany({ where: { id: { in: positionIds } } });
      if (positions.length !== positionIds.length) return NextResponse.json({ error: "Puesto inválido" }, { status: 400 });
    }

    const saved = await prisma.$transaction(async (tx) => {
      if (engagements) {
        await tx.employeeEngagement.deleteMany({ where: { employeeId: resolvedParams.id } });
        for (const eng of engagements) {
          const engId = eng.id || randomUUID();
          await tx.employeeEngagement.create({
            data: {
              id: engId,
              employeeId: resolvedParams.id,
              legalEntityId: eng.legalEntityId,
              employmentType: eng.employmentType,
              status: eng.status,
              startDate: eng.startDate,
              endDate: eng.endDate,
              isPrimary: Boolean(eng.isPrimary),
              isPayrollEligible: eng.isPayrollEligible ?? true,
              paymentScheme: eng.paymentScheme || "MONTHLY",
              baseSalary: eng.baseSalary ?? eng.compensationAmount ?? null,
              compensationAmount: eng.compensationAmount || null,
              compensationCurrency: eng.compensationCurrency || "GTQ",
              compensationFrequency: eng.compensationFrequency || "MONTHLY",
              compensationNotes: cleanNullableString(eng.compensationNotes),
              createdById: auth.user?.id || null
            }
          });
          await tx.employeeCompensation.create({
            data: {
              engagementId: engId,
              effectiveFrom: eng.startDate,
              baseSalary: eng.baseSalary ?? eng.compensationAmount ?? null,
              currency: eng.compensationCurrency || "GTQ",
              payFrequency: eng.compensationFrequency || "MONTHLY",
              paymentScheme: eng.paymentScheme || "MONTHLY",
              allowances: {},
              deductions: {},
              isActive: true,
              createdById: auth.user?.id || null
            }
          });
        }
        const primaryEng = engagements.find((e) => e.isPrimary) || engagements[0];
        updateData.primaryLegalEntity = primaryEng?.legalEntityId
          ? { connect: { id: primaryEng.legalEntityId } }
          : { disconnect: true };
      }

      if (branchAssignments) {
        await tx.employeeBranchAssignment.deleteMany({ where: { employeeId: resolvedParams.id } });
        if (branchAssignments.length) {
          await tx.employeeBranchAssignment.createMany({
            data: branchAssignments.map((assign) => ({
              employeeId: resolvedParams.id,
              branchId: assign.branchId,
              code: cleanNullableString(assign.code),
              isPrimary: Boolean(assign.isPrimary),
              startDate: assign.startDate,
              endDate: assign.endDate,
              createdById: auth.user?.id || null
            }))
          });
        }
      }

      if (positionAssignments) {
        await tx.employeePositionAssignment.deleteMany({ where: { employeeId: resolvedParams.id } });
        if (positionAssignments.length) {
          await tx.employeePositionAssignment.createMany({
            data: positionAssignments.map((assign) => ({
              employeeId: resolvedParams.id,
              positionId: assign.positionId,
              departmentId: cleanNullableString(assign.departmentId),
              isPrimary: Boolean(assign.isPrimary),
              startDate: assign.startDate,
              endDate: assign.endDate,
              notes: cleanNullableString(assign.notes),
              createdById: auth.user?.id || null
            }))
          });
        }
      }

      if (parsed.professionalLicense) {
        const expiresAt = parseDateInput(parsed.professionalLicense.expiresAt, "Vence colegiado");
        await tx.professionalLicense.upsert({
          where: { employeeId: resolvedParams.id },
          update: {
            applies: parsed.professionalLicense.applies ?? false,
            licenseNumber: cleanNullableString(parsed.professionalLicense.licenseNumber),
            issuedAt: parseDateInput(parsed.professionalLicense.issuedAt, "Emitido colegiado"),
            expiresAt,
            issuingEntity: cleanNullableString(parsed.professionalLicense.issuingEntity),
            fileUrl: cleanNullableString(parsed.professionalLicense.fileUrl),
            reminderDays: parsed.professionalLicense.reminderDays || null,
            notes: cleanNullableString(parsed.professionalLicense.notes)
          },
          create: {
            employeeId: resolvedParams.id,
            applies: parsed.professionalLicense.applies ?? false,
            licenseNumber: cleanNullableString(parsed.professionalLicense.licenseNumber),
            issuedAt: parseDateInput(parsed.professionalLicense.issuedAt, "Emitido colegiado"),
            expiresAt,
            issuingEntity: cleanNullableString(parsed.professionalLicense.issuingEntity),
            fileUrl: cleanNullableString(parsed.professionalLicense.fileUrl),
            reminderDays: parsed.professionalLicense.reminderDays || null,
            notes: cleanNullableString(parsed.professionalLicense.notes)
          }
        });
        await tx.notification.deleteMany({ where: { employeeId: resolvedParams.id, type: NotificationType.LICENSE_EXPIRY } });
        if (expiresAt) {
          const now = new Date();
          const diffDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          await tx.notification.create({
            data: {
              employeeId: resolvedParams.id,
              type: NotificationType.LICENSE_EXPIRY,
              title: "Colegiado por vencer",
              entityId: resolvedParams.id,
              severity: diffDays <= 7 ? NotificationSeverity.CRITICAL : NotificationSeverity.WARNING,
              dueAt: expiresAt
            }
          });
        }
      }

      await tx.hrEmployee.update({
        where: { id: resolvedParams.id },
        data: updateData
      });

      return tx.hrEmployee.findUnique({ where: { id: resolvedParams.id }, include: employeeInclude });
    });

    return NextResponse.json({ data: serializeEmployee(saved!) });
  } catch (err: any) {
    console.error("update employee error", err);
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: err.flatten().fieldErrors }, { status: 400 });
    }
    if (err.code === "P2002") {
      const target = (err.meta?.target || []) as string[];
      if (target.includes("employeeCode")) return NextResponse.json({ error: "El código ya existe" }, { status: 400 });
      if (target.includes("dpi")) return NextResponse.json({ error: "El DPI ya existe" }, { status: 400 });
    }
    return NextResponse.json({ error: err?.message || "No se pudo actualizar el empleado" }, { status: 400 });
  }
}
