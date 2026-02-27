import type { SessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export const CLIENTS_BULK_PERMISSIONS = {
  EXPORT_TEMPLATE: "CLIENTS_EXPORT_TEMPLATE",
  EXPORT_DATA: "CLIENTS_EXPORT_DATA",
  IMPORT_ANALYZE: "CLIENTS_IMPORT_ANALYZE",
  IMPORT_PROCESS: "CLIENTS_IMPORT_PROCESS",
  IMPORT_PROCESS_UPDATE: "CLIENTS_IMPORT_PROCESS_UPDATE"
} as const;

export function canExportClientTemplate(user: SessionUser | null) {
  return hasPermission(user, CLIENTS_BULK_PERMISSIONS.EXPORT_TEMPLATE);
}

export function canExportClientData(user: SessionUser | null) {
  return hasPermission(user, CLIENTS_BULK_PERMISSIONS.EXPORT_DATA);
}

export function canAnalyzeClientImport(user: SessionUser | null) {
  return hasPermission(user, CLIENTS_BULK_PERMISSIONS.IMPORT_ANALYZE);
}

export function canProcessClientImport(user: SessionUser | null) {
  return hasPermission(user, CLIENTS_BULK_PERMISSIONS.IMPORT_PROCESS);
}

export function canProcessClientImportUpdate(user: SessionUser | null) {
  return hasPermission(user, CLIENTS_BULK_PERMISSIONS.IMPORT_PROCESS_UPDATE);
}
