import { NotificationSeverity, NotificationType, Prisma } from "@prisma/client";
import type { HrAlert } from "@/types/hr";
import type { SessionUser } from "@/lib/auth";
import { canViewEmployeeAccessDetails, filterDocumentsForActor, getHrAccessLevel, allowedDocumentVisibilities } from "@/lib/hr/access";

const baseEmployeeInclude = {
  primaryLegalEntity: true,
  engagements: { include: { legalEntity: true }, orderBy: { startDate: "desc" } },
  branchAssignments: { include: { branch: true } },
  positionAssignments: { include: { position: true, department: true } },
  documents: {
    where: { isArchived: false },
    include: { versions: { orderBy: { versionNumber: "desc" } }, currentVersion: true },
    orderBy: { createdAt: "desc" }
  },
  professionalLicense: true,
  notifications: {
    where: { type: { in: [NotificationType.DOCUMENT_EXPIRY, NotificationType.LICENSE_EXPIRY] } },
    orderBy: { dueAt: "asc" }
  },
  user: {
    include: {
      roles: { include: { role: true } },
      userPermissions: { include: { permission: true } }
    }
  }
} satisfies Prisma.HrEmployeeInclude;

export function employeeIncludeFor(user: SessionUser | null) {
  const level = getHrAccessLevel(user);
  const visibility = allowedDocumentVisibilities(level, user);
  const documents =
    visibility === null
      ? baseEmployeeInclude.documents
      : {
          ...baseEmployeeInclude.documents,
          where: { isArchived: false, visibility: { in: visibility } }
        };
  return { ...baseEmployeeInclude, documents } satisfies Prisma.HrEmployeeInclude;
}

export type EmployeeWithRelations = Prisma.HrEmployeeGetPayload<{ include: typeof baseEmployeeInclude }>;

function expirySeverity(date: Date) {
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return { severity: NotificationSeverity.CRITICAL, withinWindow: true };
  if (diffDays <= 15) return { severity: NotificationSeverity.WARNING, withinWindow: true };
  if (diffDays <= 30) return { severity: NotificationSeverity.INFO, withinWindow: true };
  return { severity: NotificationSeverity.INFO, withinWindow: false };
}

function pickPrimary<T extends { isPrimary?: boolean }>(items: T[]): T | null {
  if (!items || items.length === 0) return null;
  return items.find((i) => i.isPrimary) || items[0];
}

function serializeAlerts(employee: EmployeeWithRelations, documents: any[]) {
  const alerts: HrAlert[] = [];

  for (const doc of documents) {
    const expiresAt = doc.currentVersion?.expiresAt as Date | null;
    if (expiresAt) {
      const { severity, withinWindow } = expirySeverity(expiresAt);
      if (!withinWindow) continue;
      alerts.push({
        type: "DOCUMENT_EXPIRY",
        title: doc.title,
        entityId: doc.id,
        dueAt: expiresAt.toISOString(),
        severity
      });
    }
  }

  const license = employee.professionalLicense;
  if (license?.applies && license.expiresAt) {
    const { severity, withinWindow } = expirySeverity(license.expiresAt);
    if (withinWindow) {
      alerts.push({
        type: "LICENSE_EXPIRY",
        title: "Colegiado por vencer",
        entityId: license.id,
        dueAt: license.expiresAt.toISOString(),
        severity: severity === NotificationSeverity.INFO ? NotificationSeverity.WARNING : severity
      });
    }
  }

  for (const notif of employee.notifications || []) {
    alerts.push({
      type: notif.type,
      title: notif.title,
      entityId: notif.entityId || notif.id,
      dueAt: notif.dueAt ? notif.dueAt.toISOString() : null,
      severity: notif.severity || NotificationSeverity.INFO
    });
  }

  const seen = new Set<string>();
  const deduped = alerts.filter((item) => {
    const key = `${item.type}-${item.entityId}-${item.dueAt || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    documentsExpiring: deduped.filter((a) => a.type === "DOCUMENT_EXPIRY").length,
    licenseExpiring: deduped.some((a) => a.type === "LICENSE_EXPIRY"),
    items: deduped.sort((a, b) => (a.dueAt || "").localeCompare(b.dueAt || ""))
  };
}

export function serializeEmployee(employee: EmployeeWithRelations, actor: SessionUser | null) {
  const level = getHrAccessLevel(actor);
  const canViewAccess = canViewEmployeeAccessDetails(level);
  const isSelf = Boolean(actor && employee.userId && actor.id === employee.userId);
  const primaryEngagement = pickPrimary(employee.engagements || []);
  const primaryBranch = pickPrimary(employee.branchAssignments || []);
  const primaryPosition = pickPrimary(employee.positionAssignments || []);

  const rawDocuments = (employee.documents || []).map((doc) => {
    const currentVersion = doc.currentVersion || doc.versions[0] || null;
    return {
      id: doc.id,
      type: doc.type,
      visibility: doc.visibility,
      title: doc.title,
      notes: doc.notes,
      retentionUntil: doc.retentionUntil,
      isArchived: doc.isArchived,
      currentVersion: currentVersion
        ? {
            id: currentVersion.id,
            versionNumber: currentVersion.versionNumber,
            fileUrl: currentVersion.fileUrl,
            issuedAt: currentVersion.issuedAt,
            deliveredAt: currentVersion.deliveredAt,
            expiresAt: currentVersion.expiresAt,
            canEmployeeView: currentVersion.canEmployeeView,
            viewGrantedUntil: currentVersion.viewGrantedUntil,
            notes: currentVersion.notes,
            createdAt: currentVersion.createdAt
          }
        : null,
      versions: (doc.versions || []).map((ver) => ({
        id: ver.id,
        versionNumber: ver.versionNumber,
        fileUrl: ver.fileUrl,
        issuedAt: ver.issuedAt,
        deliveredAt: ver.deliveredAt,
        expiresAt: ver.expiresAt,
        canEmployeeView: ver.canEmployeeView,
        viewGrantedUntil: ver.viewGrantedUntil,
        notes: ver.notes,
        createdAt: ver.createdAt
      }))
    };
  });

  const documents = filterDocumentsForActor({ documents: rawDocuments, level, isSelf, user: actor });
  const alerts = serializeAlerts(employee, documents);

  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    fullName: `${employee.firstName} ${employee.lastName}`.trim(),
    dpi: employee.dpi,
    nit: employee.nit,
    email: employee.email,
    personalEmail: employee.personalEmail,
    phoneMobile: employee.phoneMobile,
    phoneHome: employee.phoneHome,
    birthDate: employee.birthDate,
    addressHome: employee.addressHome,
    biometricId: employee.biometricId,
    workLocation: primaryBranch?.branch?.address || null,
    notes: employee.notes,
    isExternal: employee.isExternal,
    emergencyContactName: employee.emergencyContactName,
    emergencyContactPhone: employee.emergencyContactPhone,
    residenceProofUrl: employee.residenceProofUrl,
    dpiPhotoUrl: employee.dpiPhotoUrl,
    rtuFileUrl: employee.rtuFileUrl,
    photoUrl: employee.photoUrl,
    status: employee.status,
    isActive: employee.isActive,
    onboardingStatus: employee.onboardingStatus,
    onboardingStep: employee.onboardingStep,
    archivedAt: employee.archivedAt,
    terminatedAt: employee.terminatedAt,
    completedAt: employee.completedAt,
    primaryLegalEntity: primaryEngagement
      ? {
          id: primaryEngagement.legalEntity.id,
          name: primaryEngagement.legalEntity.name,
          comercialName: primaryEngagement.legalEntity.comercialName,
          nit: primaryEngagement.legalEntity.nit
        }
      : employee.primaryLegalEntity
        ? {
            id: employee.primaryLegalEntity.id,
            name: employee.primaryLegalEntity.name,
            comercialName: employee.primaryLegalEntity.comercialName,
          nit: employee.primaryLegalEntity.nit
        }
      : null,
    primaryBranch: primaryBranch?.branch
      ? {
          id: primaryBranch.branch.id,
          name: primaryBranch.branch.name,
          code: primaryBranch.branch.code,
          address: primaryBranch.branch.address,
          isActive: primaryBranch.branch.isActive
        }
      : null,
    primaryPosition: primaryPosition?.position ? { id: primaryPosition.position.id, name: primaryPosition.position.name } : null,
    primaryDepartment: primaryPosition?.department
      ? { id: primaryPosition.department.id, name: primaryPosition.department.name, description: primaryPosition.department.description }
      : null,
    primaryEngagement: primaryEngagement
      ? {
          id: primaryEngagement.id,
          legalEntity: {
            id: primaryEngagement.legalEntity.id,
            name: primaryEngagement.legalEntity.name,
            comercialName: primaryEngagement.legalEntity.comercialName,
            nit: primaryEngagement.legalEntity.nit
          },
          employmentType: primaryEngagement.employmentType,
          status: primaryEngagement.status,
          startDate: primaryEngagement.startDate,
          endDate: primaryEngagement.endDate,
          isPrimary: primaryEngagement.isPrimary,
          isPayrollEligible: primaryEngagement.isPayrollEligible,
          paymentScheme: primaryEngagement.paymentScheme,
          baseSalary: primaryEngagement.baseSalary ? primaryEngagement.baseSalary.toString() : null,
          baseAllowance: primaryEngagement.baseAllowance ? primaryEngagement.baseAllowance.toString() : null,
          compensationAmount: primaryEngagement.compensationAmount ? primaryEngagement.compensationAmount.toString() : null,
          compensationCurrency: primaryEngagement.compensationCurrency,
          compensationFrequency: primaryEngagement.compensationFrequency,
          compensationNotes: primaryEngagement.compensationNotes
        }
      : null,
    engagements: (employee.engagements || []).map((eng) => ({
      id: eng.id,
      legalEntity: {
        id: eng.legalEntity.id,
        name: eng.legalEntity.name,
        comercialName: eng.legalEntity.comercialName,
        nit: eng.legalEntity.nit
      },
      employmentType: eng.employmentType,
      status: eng.status,
      startDate: eng.startDate,
      endDate: eng.endDate,
      isPrimary: eng.isPrimary,
      isPayrollEligible: eng.isPayrollEligible,
      paymentScheme: eng.paymentScheme,
      baseSalary: eng.baseSalary ? eng.baseSalary.toString() : null,
      baseAllowance: eng.baseAllowance ? eng.baseAllowance.toString() : null,
      compensationAmount: eng.compensationAmount ? eng.compensationAmount.toString() : null,
      compensationCurrency: eng.compensationCurrency,
      compensationFrequency: eng.compensationFrequency,
      compensationNotes: eng.compensationNotes
    })),
    branchAssignments: (employee.branchAssignments || []).map((assign) => ({
      id: assign.id,
      branchId: assign.branchId,
      code: assign.code,
      isPrimary: assign.isPrimary,
      startDate: assign.startDate,
      endDate: assign.endDate,
      branch: assign.branch
        ? {
            id: assign.branch.id,
            name: assign.branch.name,
            code: assign.branch.code,
            address: assign.branch.address,
            isActive: assign.branch.isActive
          }
        : null
    })),
    positionAssignments: (employee.positionAssignments || []).map((assign) => ({
      id: assign.id,
      positionId: assign.positionId,
      departmentId: assign.departmentId,
      isPrimary: assign.isPrimary,
      startDate: assign.startDate,
      endDate: assign.endDate,
      notes: assign.notes,
      position: assign.position ? { id: assign.position.id, name: assign.position.name, description: assign.position.description, isActive: assign.position.isActive } : null,
      department: assign.department
        ? { id: assign.department.id, name: assign.department.name, description: assign.department.description, isActive: assign.department.isActive }
        : null
    })),
    documents,
    professionalLicense: employee.professionalLicense
      ? {
          applies: employee.professionalLicense.applies,
          licenseNumber: employee.professionalLicense.licenseNumber,
          issuedAt: employee.professionalLicense.issuedAt,
          expiresAt: employee.professionalLicense.expiresAt,
          issuingEntity: employee.professionalLicense.issuingEntity,
          fileUrl: employee.professionalLicense.fileUrl,
          reminderDays: employee.professionalLicense.reminderDays,
          notes: employee.professionalLicense.notes
        }
      : null,
    access: employee.user
      ? {
          userId: employee.user.id,
          email: employee.user.email,
          name: employee.user.name,
          ...(canViewAccess
            ? {
                roles: employee.user.roles?.map((r) => ({ id: r.role.id, name: r.role.name })) || [],
                permissions: employee.user.userPermissions?.map((p) => ({
                  id: p.permission.id,
                  key: p.permission.key,
                  description: p.permission.description
                }))
              }
            : {})
        }
      : null,
    alerts
  };
}
