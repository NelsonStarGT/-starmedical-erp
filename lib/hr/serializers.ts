import { NotificationSeverity, NotificationType, Prisma } from "@prisma/client";
import { isExpiringSoon } from "@/lib/hr/utils";
import type { HrAlert } from "@/types/hr";

export const employeeInclude = {
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
  }
} satisfies Prisma.HrEmployeeInclude;

export type EmployeeWithRelations = Prisma.HrEmployeeGetPayload<{ include: typeof employeeInclude }>;

function pickPrimary<T extends { isPrimary?: boolean }>(items: T[]): T | null {
  if (!items || items.length === 0) return null;
  return items.find((i) => i.isPrimary) || items[0];
}

function serializeAlerts(employee: EmployeeWithRelations, documents: any[]) {
  const alerts: HrAlert[] = [];

  for (const doc of documents) {
    const expiresAt = doc.currentVersion?.expiresAt as Date | null;
    if (expiresAt && isExpiringSoon(expiresAt, 60)) {
      alerts.push({
        type: "DOCUMENT_EXPIRY",
        title: doc.title,
        entityId: doc.id,
        dueAt: expiresAt.toISOString(),
        severity: "WARNING"
      });
    }
  }

  const license = employee.professionalLicense;
  if (license?.applies && license.expiresAt && isExpiringSoon(license.expiresAt, 60)) {
    alerts.push({
      type: "LICENSE_EXPIRY",
      title: "Colegiado por vencer",
      entityId: license.id,
      dueAt: license.expiresAt.toISOString(),
      severity: "CRITICAL"
    });
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

export function serializeEmployee(employee: EmployeeWithRelations) {
  const primaryEngagement = pickPrimary(employee.engagements || []);
  const primaryBranch = pickPrimary(employee.branchAssignments || []);
  const primaryPosition = pickPrimary(employee.positionAssignments || []);

  const documents = (employee.documents || []).map((doc) => {
    const currentVersion = doc.currentVersion || doc.versions[0] || null;
    return {
      id: doc.id,
      type: doc.type,
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
        notes: ver.notes,
        createdAt: ver.createdAt
      }))
    };
  });

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
    phone: employee.phone,
    homePhone: employee.homePhone,
    birthDate: employee.birthDate,
    address: employee.address,
    emergencyContactName: employee.emergencyContactName,
    emergencyContactPhone: employee.emergencyContactPhone,
    residenceProofUrl: employee.residenceProofUrl,
    dpiPhotoUrl: employee.dpiPhotoUrl,
    rtuFileUrl: employee.rtuFileUrl,
    photoUrl: employee.photoUrl,
    status: employee.status,
    isActive: employee.isActive,
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
    primaryBranch: primaryBranch?.branch ? { id: primaryBranch.branch.id, name: primaryBranch.branch.name } : null,
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
      compensationAmount: eng.compensationAmount ? eng.compensationAmount.toString() : null,
      compensationCurrency: eng.compensationCurrency,
      compensationFrequency: eng.compensationFrequency,
      compensationNotes: eng.compensationNotes
    })),
    branchAssignments: (employee.branchAssignments || []).map((assign) => ({
      id: assign.id,
      branchId: assign.branchId,
      isPrimary: assign.isPrimary,
      startDate: assign.startDate,
      endDate: assign.endDate,
      branch: assign.branch ? { id: assign.branch.id, name: assign.branch.name, isActive: assign.branch.isActive } : null
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
          number: employee.professionalLicense.number,
          issuedAt: employee.professionalLicense.issuedAt,
          expiresAt: employee.professionalLicense.expiresAt,
          issuingEntity: employee.professionalLicense.issuingEntity,
          fileUrl: employee.professionalLicense.fileUrl,
          reminderDays: employee.professionalLicense.reminderDays,
          notes: employee.professionalLicense.notes
        }
      : null,
    alerts
  };
}
