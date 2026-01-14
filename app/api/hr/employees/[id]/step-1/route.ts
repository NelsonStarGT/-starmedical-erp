import { NextRequest, NextResponse } from "next/server";
import { HrEmployeeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { onboardingStep1Schema } from "@/lib/hr/schemas";
import { assertDpiUnique, upsertEmployeeDocument } from "@/lib/hr/onboarding";
import { cleanNullableString, parseDateInput } from "@/lib/hr/utils";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  const resolvedParams = "then" in params ? await params : params;
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER", "STAFF"], "HR:EMPLOYEES:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => ({}));
  const parsed = onboardingStep1Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const employee = await prisma.hrEmployee.findUnique({ where: { id: resolvedParams.id } });
  if (!employee) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

  try {
    await assertDpiUnique(prisma, parsed.data.dpi, employee.id);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "DPI duplicado" }, { status: 409 });
  }

  const birthDate = parseDateInput(parsed.data.birthDate, "Fecha de nacimiento");

  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.hrEmployee.update({
      where: { id: employee.id },
      data: {
        firstName: parsed.data.firstName.trim(),
        lastName: parsed.data.lastName.trim(),
        dpi: parsed.data.dpi.trim(),
        nit: cleanNullableString(parsed.data.nit),
        email: cleanNullableString(parsed.data.email),
        personalEmail: cleanNullableString(parsed.data.personalEmail),
        phoneMobile: cleanNullableString(parsed.data.phoneMobile),
        phoneHome: parsed.data.phoneHome.trim(),
        birthDate,
        addressHome: parsed.data.addressHome.trim(),
        notes: cleanNullableString(parsed.data.notes),
        isExternal: parsed.data.isExternal ?? false,
        emergencyContactName: parsed.data.emergencyContactName.trim(),
        emergencyContactPhone: parsed.data.emergencyContactPhone.trim(),
        residenceProofUrl: parsed.data.residenceProofUrl.trim(),
        dpiPhotoUrl: parsed.data.dpiPhotoUrl.trim(),
        rtuFileUrl: parsed.data.rtuFileUrl.trim(),
        photoUrl: cleanNullableString(parsed.data.photoUrl),
        status: HrEmployeeStatus.ACTIVE,
        onboardingStatus: "DRAFT",
        onboardingStep: 2,
        isActive: false
      }
    });

    await upsertEmployeeDocument(
      tx,
      saved.id,
      {
        type: "DPI",
        title: "Documento DPI",
        visibility: "PERSONAL",
        version: { fileUrl: parsed.data.dpiPhotoUrl, issuedAt: null }
      },
      auth.user?.id
    );

    await upsertEmployeeDocument(
      tx,
      saved.id,
      {
        type: "RTU",
        title: "RTU",
        visibility: "PERSONAL",
        version: { fileUrl: parsed.data.rtuFileUrl, issuedAt: null }
      },
      auth.user?.id
    );

    await upsertEmployeeDocument(
      tx,
      saved.id,
      {
        type: "RECIBO_SERVICIO",
        title: "Comprobante de vivienda",
        visibility: "PERSONAL",
        version: { fileUrl: parsed.data.residenceProofUrl, issuedAt: null }
      },
      auth.user?.id
    );

    return saved;
  });

  return NextResponse.json({
    data: {
      id: updated.id,
      onboardingStatus: updated.onboardingStatus,
      onboardingStep: updated.onboardingStep
    }
  });
}
