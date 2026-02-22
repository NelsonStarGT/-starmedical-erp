import type { SessionUser } from "@/lib/auth";

const DOCS_EDIT_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "RECORDS"]);
const DOCS_APPROVE_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "RECORDS", "MEDICAL_RECORDS"]);
const DOCS_VIEW_ROLES = new Set([
  ...DOCS_EDIT_ROLES,
  ...DOCS_APPROVE_ROLES,
  "RECEPTION",
  "RECEPTION_ADMIN",
  "STAFF",
  "SUPERVISOR",
  "MEDICAL_RECORDS"
]);
const PROFILE_EDIT_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);

export function normalizeClientRole(role?: string | null) {
  if (!role) return "";
  return role.trim().toUpperCase().replace(/\s+/g, "_");
}

export function normalizeClientRoleList(roles?: Array<string | null | undefined>) {
  if (!roles?.length) return [];
  return Array.from(new Set(roles.map((role) => normalizeClientRole(role)).filter(Boolean)));
}

function hasAnyRole(roles: string[], allowed: Set<string>) {
  return roles.some((role) => allowed.has(role));
}

export function canEditDocsFromRoles(roles?: Array<string | null | undefined>) {
  const normalized = normalizeClientRoleList(roles);
  return hasAnyRole(normalized, DOCS_EDIT_ROLES);
}

export function canViewDocsFromRoles(roles?: Array<string | null | undefined>) {
  const normalized = normalizeClientRoleList(roles);
  return hasAnyRole(normalized, DOCS_VIEW_ROLES);
}

export function canApproveDocsFromRoles(roles?: Array<string | null | undefined>) {
  const normalized = normalizeClientRoleList(roles);
  return hasAnyRole(normalized, DOCS_APPROVE_ROLES);
}

export function canEditClientProfileFromRoles(roles?: Array<string | null | undefined>) {
  const normalized = normalizeClientRoleList(roles);
  return hasAnyRole(normalized, PROFILE_EDIT_ROLES);
}

export function getClientDocumentPermissions(user: Pick<SessionUser, "roles"> | null | undefined) {
  const roles = user?.roles ?? [];
  return {
    canViewDocs: canViewDocsFromRoles(roles),
    canEditDocs: canEditDocsFromRoles(roles),
    canApproveDocs: canApproveDocsFromRoles(roles),
    canEditProfile: canEditClientProfileFromRoles(roles)
  };
}
