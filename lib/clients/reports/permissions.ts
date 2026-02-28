import type { SessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export const CLIENTS_REPORTS_PERMISSIONS = {
  VIEW: "CLIENTS_REPORTS_VIEW",
  EXPORT: "CLIENTS_REPORTS_EXPORT",
  EXPORT_FULL: "CLIENTS_REPORTS_EXPORT_FULL",
  EXPORT_MASKED: "CLIENTS_REPORTS_EXPORT_MASKED"
} as const;

export function canViewClientsReports(user: SessionUser | null) {
  return hasPermission(user, CLIENTS_REPORTS_PERMISSIONS.VIEW);
}

export function canExportClientsReports(user: SessionUser | null) {
  return hasPermission(user, CLIENTS_REPORTS_PERMISSIONS.EXPORT);
}

export function canExportClientsReportsFull(user: SessionUser | null) {
  return canExportClientsReports(user) && hasPermission(user, CLIENTS_REPORTS_PERMISSIONS.EXPORT_FULL);
}

export function canExportClientsReportsMasked(user: SessionUser | null) {
  return canExportClientsReportsFull(user) || (canExportClientsReports(user) && hasPermission(user, CLIENTS_REPORTS_PERMISSIONS.EXPORT_MASKED));
}

export function resolveClientsReportsExportScope(user: SessionUser | null): "none" | "masked" | "full" {
  if (canExportClientsReportsFull(user)) return "full";
  if (canExportClientsReportsMasked(user)) return "masked";
  return "none";
}
