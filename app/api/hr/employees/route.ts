import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { HrEmployeeStatus, HrEmploymentType, NotificationSeverity, NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { createEmployeeSchema, employeeDraftSchema, employeeFiltersSchema } from "@/lib/hr/schemas";
import { employeeInclude, serializeEmployee } from "@/lib/hr/serializers";
import { cleanNullableString, computeRetentionUntil, ensurePrimary, parseDateInput } from "@/lib/hr/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

function parseSearchParams(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  return employeeFiltersSchema.safeParse({
    search: params.get("search") || undefined,
    status: params.get("status") || undefined,
    branchId: params.get("branchId") || undefined,
    legalEntityId: params.get("legalEntityId") || undefined,
    type: params.get("type") || undefined,
    relationship: params.get("relationship") || undefined,
    page: params.get("page") || undefined
  });
}

async function generateEmployeeCode(tx: Prisma.TransactionClient) {
  const last = await tx.hrEmployee.findFirst({ orderBy: { createdAt: "desc" }, select: { employeeCode: true } });
  let nextNumber = 1;
  if (last?.employeeCode) {
    const match = last.employeeCode.match(/(\d+)$/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  for (let i = 0; i < 10; i++) {
    const candidate = `EMP-${String(nextNumber + i).padStart(6, "0")}`;
    const exists = await tx.hrEmployee.findUnique({ where: { employeeCode: candidate } });
    if (!exists) return candidate;
  }
  return `EMP-${Date.now()}`;
}

async function createNotification(tx: Prisma.TransactionClient, employeeId: string, type: NotificationType, title: string, entityId: string, dueAt?: Date | null) {
  if (!dueAt) return;
  await tx.notification.deleteMany({ where: { employeeId, type, entityId } });
  await tx.notification.create({
    data: {
      employeeId,
      type,
      severity: (() => {
        const now = new Date();
        const diffDays = Math.ceil((dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (type === NotificationType.LICENSE_EXPIRY || diffDays <= 7) return NotificationSeverity.CRITICAL;
        if (diffDays <= 15) return NotificationSeverity.WARNING;
        return NotificationSeverity.INFO;
      })(),
      title,
      entityId,
      dueAt
    }
  });
}

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER", "STAFF", "VIEWER"]);
  if (auth.errorResponse) return auth.errorResponse;

  const parsed = parseSearchParams(req);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { search, status, branchId, legalEntityId, type, relationship, page } = parsed.data;
  const where: Prisma.HrEmployeeWhereInput = { isActive: true };
  if (status) where.status = status;
  if (search) {
    const term = search.trim();
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { employeeCode: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { dpi: { contains: term, mode: "insensitive" } },
      { nit: { contains: term, mode: "insensitive" } },
      { phoneMobile: { contains: term, mode: "insensitive" } },
      { phoneHome: { contains: term, mode: "insensitive" } }
    ];
  }
  if (branchId) {
    const andClauses = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [
      ...andClauses,
      {
        branchAssignments: { some: { branchId } }
      }
    ];
  }
  if (legalEntityId) {
    const andClauses = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [
      ...andClauses,
      {
        engagements: { some: { legalEntityId } }
      }
    ];
  }
  if (type === "INTERNAL") {
    where.isExternal = false;
  } else if (type === "EXTERNAL") {
    where.isExternal = true;
  }
  if (relationship === "DEPENDENCIA") {
    where.engagements = { some: { employmentType: HrEmploymentType.DEPENDENCIA } };
  } else if (relationship === "SIN_DEPENDENCIA") {
    where.engagements = { some: { employmentType: HrEmploymentType.HONORARIOS } };
  }

  const [total, employees] = await prisma.$transaction([
    prisma.hrEmployee.count({ where }),
    prisma.hrEmployee.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: employeeInclude,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    })
  ]);

  return NextResponse.json({
    data: employees.map(serializeEmployee),
    meta: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE))
    }
  });
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const isDraft = body?.mode === "DRAFT" || body?.onboardingStatus === "DRAFT" || body?.draft === true;
    if (isDraft) {
      const parsedDraft = employeeDraftSchema.parse(body || {});
      if (parsedDraft.dpi) {
        const existing = await prisma.hrEmployee.findFirst({ where: { dpi: parsedDraft.dpi.trim() } });
        if (existing) return NextResponse.json({ error: "DPI ya registrado" }, { status: 400 });
      }
      const employeeCode = await generateEmployeeCode(prisma);
      const draft = await prisma.hrEmployee.create({
        data: {
          employeeCode,
          firstName: parsedDraft.firstName?.trim() || null,
          lastName: parsedDraft.lastName?.trim() || null,
          dpi: parsedDraft.dpi?.trim() || null,
          status: HrEmployeeStatus.ACTIVE,
          isActive: false,
          onboardingStatus: "DRAFT",
          onboardingStep: 1,
          createdById: auth.user?.id || null
        }
      });
      return NextResponse.json({ data: { id: draft.id, employeeCode: draft.employeeCode, onboardingStep: draft.onboardingStep } }, { status: 201 });
    }

    const parsed = createEmployeeSchema.parse(body);
    const status = parsed.status || HrEmployeeStatus.ACTIVE;

    const engagements = ensurePrimary(parsed.engagements || []).map((eng) => ({
      ...eng,
      startDate: parseDateInput(eng.startDate, "Fecha de inicio", { required: true })!,
      endDate: parseDateInput(eng.endDate, "Fecha de fin")
    }));

    const branchAssignments = ensurePrimary(parsed.branchAssignments || []).map((assign) => ({
      ...assign,
      startDate: parseDateInput(assign.startDate, "Fecha de inicio"),
      endDate: parseDateInput(assign.endDate, "Fecha fin")
    }));

    const positionAssignments = ensurePrimary(parsed.positionAssignments || []).map((assign) => ({
      ...assign,
      startDate: parseDateInput(assign.startDate, "Fecha de inicio"),
      endDate: parseDateInput(assign.endDate, "Fecha fin")
    }));

    const branchIds = Array.from(new Set(branchAssignments.map((b) => b.branchId.trim())));
    const positionIds = Array.from(new Set(positionAssignments.map((p) => p.positionId.trim())));
    const legalEntityIds = Array.from(new Set(engagements.map((e) => e.legalEntityId.trim())));

    const [branches, positions, entities] = await Promise.all([
      prisma.branch.findMany({ where: { id: { in: branchIds } } }),
      prisma.hrPosition.findMany({ where: { id: { in: positionIds } } }),
      prisma.legalEntity.findMany({ where: { id: { in: legalEntityIds } } })
    ]);

    if (branches.length !== branchIds.length) {
      return NextResponse.json({ error: "Sucursal inválida" }, { status: 400 });
    }
    if (positions.length !== positionIds.length) {
      return NextResponse.json({ error: "Puesto inválido" }, { status: 400 });
    }
    if (entities.length !== legalEntityIds.length) {
      return NextResponse.json({ error: "Razón social inválida" }, { status: 400 });
    }

    const primaryEngagement = engagements.find((e) => e.isPrimary) || engagements[0];
    const employee = await prisma.$transaction(async (tx) => {
      const employeeCode = parsed.employeeCode?.trim() || (await generateEmployeeCode(tx));
      const saved = await tx.hrEmployee.create({
        data: {
          employeeCode,
          firstName: parsed.firstName.trim(),
          lastName: parsed.lastName.trim(),
          dpi: parsed.dpi.trim(),
          nit: cleanNullableString(parsed.nit),
          email: cleanNullableString(parsed.email),
          personalEmail: cleanNullableString(parsed.personalEmail),
          phoneMobile: cleanNullableString(parsed.phoneMobile),
          phoneHome: parsed.phoneHome?.trim() || null,
          birthDate: parseDateInput(parsed.birthDate, "Fecha de nacimiento"),
          addressHome: parsed.addressHome.trim(),
          notes: cleanNullableString(parsed.notes),
          isExternal: parsed.isExternal ?? false,
          emergencyContactName: parsed.emergencyContactName.trim(),
          emergencyContactPhone: parsed.emergencyContactPhone.trim(),
          residenceProofUrl: parsed.residenceProofUrl.trim(),
          dpiPhotoUrl: parsed.dpiPhotoUrl.trim(),
          rtuFileUrl: parsed.rtuFileUrl.trim(),
          photoUrl: cleanNullableString(parsed.photoUrl),
          status,
          isActive: status !== HrEmployeeStatus.TERMINATED,
          primaryLegalEntityId: primaryEngagement?.legalEntityId || parsed.primaryLegalEntityId || null,
          onboardingStatus: "ACTIVE",
          onboardingStep: 3,
          completedAt: new Date(),
          createdById: auth.user?.id || null
        }
      });

      for (const eng of engagements) {
        const engId = eng.id || randomUUID();
        const createdEng = await tx.employeeEngagement.create({
          data: {
            id: engId,
            employeeId: saved.id,
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
            engagementId: createdEng.id,
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

      if (branchAssignments.length) {
        await tx.employeeBranchAssignment.createMany({
          data: branchAssignments.map((assign) => ({
            employeeId: saved.id,
            branchId: assign.branchId,
            code: cleanNullableString(assign.code),
            isPrimary: Boolean(assign.isPrimary),
            startDate: assign.startDate,
            endDate: assign.endDate,
            createdById: auth.user?.id || null
          }))
        });
      }

      if (positionAssignments.length) {
        await tx.employeePositionAssignment.createMany({
          data: positionAssignments.map((assign) => ({
            employeeId: saved.id,
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

      for (const doc of parsed.documents || []) {
        const documentId = doc.id || randomUUID();
        const versionId = randomUUID();
        const issuedAt = parseDateInput(doc.version.issuedAt, "Fecha de emisión");
        const deliveredAt = parseDateInput(doc.version.deliveredAt, "Fecha de entrega");
        const expiresAt = parseDateInput(doc.version.expiresAt, "Fecha de vencimiento");
        const viewGrantedUntil = parseDateInput(doc.version.viewGrantedUntil, "Vigencia visibilidad");
        const retentionUntil = computeRetentionUntil(issuedAt, parseDateInput(doc.retentionUntil, "Retención"));

        await tx.employeeDocument.create({
          data: {
            id: documentId,
            employeeId: saved.id,
            type: doc.type,
            visibility: doc.visibility || "PERSONAL",
            title: doc.title.trim(),
            notes: cleanNullableString(doc.notes),
            retentionUntil,
            isArchived: false,
            currentVersionId: versionId,
            createdById: auth.user?.id || null,
            versions: {
              create: {
                id: versionId,
                versionNumber: doc.version.versionNumber || 1,
                fileUrl: doc.version.fileUrl.trim(),
                issuedAt,
                deliveredAt,
                expiresAt,
                canEmployeeView: doc.version.canEmployeeView ?? false,
                viewGrantedUntil,
                notes: cleanNullableString(doc.version.notes),
                uploadedById: auth.user?.id || null
              }
            }
          }
        });

        await createNotification(tx, saved.id, NotificationType.DOCUMENT_EXPIRY, `Documento ${doc.title} por vencer`, documentId, expiresAt);
      }

      if (parsed.professionalLicense) {
        const expiresAt = parseDateInput(parsed.professionalLicense.expiresAt, "Vence colegiado");
        await tx.professionalLicense.upsert({
          where: { employeeId: saved.id },
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
            employeeId: saved.id,
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

        await createNotification(
          tx,
          saved.id,
          NotificationType.LICENSE_EXPIRY,
          "Colegiado por vencer",
          saved.id,
          expiresAt
        );
      }

      return tx.hrEmployee.findUnique({ where: { id: saved.id }, include: employeeInclude });
    });

    return NextResponse.json({ data: serializeEmployee(employee!) }, { status: 201 });
  } catch (err: any) {
    console.error("create employee error", err);
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Datos inválidos", details: err.flatten().fieldErrors }, { status: 400 });
    }
    if (err.code === "P2002") {
      const target = (err.meta?.target || []) as string[];
      if (target.includes("employeeCode")) return NextResponse.json({ error: "El código ya existe" }, { status: 400 });
      if (target.includes("dpi")) return NextResponse.json({ error: "El DPI ya existe" }, { status: 400 });
    }
    return NextResponse.json({ error: err?.message || "No se pudo crear el empleado" }, { status: 400 });
  }
}
