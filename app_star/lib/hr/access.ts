import type { HrDocumentVisibility } from "@prisma/client";
import type { SessionUser } from "../auth";
import { hasPermission, normalizeRoleName } from "../rbac";
import { ONBOARDING_ASSIGNABLE_ROLES, ROLE_CATALOG } from "../security/permissionCatalog";

export type HrAccessLevel = "ADMIN" | "HR_ADMIN" | "HR_USER" | "STAFF" | "VIEWER" | "NONE";

function roleList(user: SessionUser | null): HrAccessLevel[] {
  return (user?.roles || [])
    .map((role) => normalizeRoleName(role))
    .map((r) => (["ADMIN", "HR_ADMIN", "HR_USER", "STAFF", "VIEWER"].includes(r) ? (r as HrAccessLevel) : null))
    .filter((r): r is HrAccessLevel => Boolean(r));
}

export function getHrAccessLevel(user: SessionUser | null): HrAccessLevel {
  const roles = roleList(user);
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("HR_ADMIN")) return "HR_ADMIN";
  if (roles.includes("HR_USER")) return "HR_USER";
  if (roles.includes("STAFF")) return "STAFF";
  if (roles.includes("VIEWER")) return "VIEWER";
  return "NONE";
}

export function canAssignOnboardingRole(user: SessionUser | null) {
  const level = getHrAccessLevel(user);
  if (level === "ADMIN" || level === "HR_ADMIN") return true;
  return hasPermission(user, "USERS:ADMIN");
}

export function resolveOnboardingRoleName(params: { actor: SessionUser | null; requestedRoleName?: string | null }) {
  const normalizedRequested = normalizeRoleName(params.requestedRoleName || "");
  const assignable = new Set<string>(ONBOARDING_ASSIGNABLE_ROLES);
  const catalog = new Set<string>(ROLE_CATALOG);

  if (!canAssignOnboardingRole(params.actor)) {
    return { roleName: "STAFF", reason: "non_privileged" };
  }

  if (!normalizedRequested) {
    return { roleName: "STAFF", reason: "default" };
  }

  if (!catalog.has(normalizedRequested)) {
    return { error: "Rol inválido", status: 400 };
  }

  if (!assignable.has(normalizedRequested)) {
    return { error: "Rol no permitido para onboarding", status: 403 };
  }

  return { roleName: normalizedRequested, reason: "requested" };
}

export function allowedDocumentVisibilities(level: HrAccessLevel, user: SessionUser | null): HrDocumentVisibility[] | null {
  if (hasPermission(user, "HR:DOCS:RESTRICTED")) return null;
  if (hasPermission(user, "HR:DOCS:READ") && level === "HR_USER") return ["PERSONAL", "EMPRESA"];
  if (level === "ADMIN" || level === "HR_ADMIN") return null;
  if (level === "STAFF" || level === "VIEWER") return ["PERSONAL"];
  if (hasPermission(user, "HR:DOCS:READ")) return ["PERSONAL"];
  return [];
}

export function filterDocumentsForActor<T extends { visibility: HrDocumentVisibility }>(params: {
  documents: T[];
  level: HrAccessLevel;
  isSelf: boolean;
  user?: SessionUser | null;
}) {
  const allowed = allowedDocumentVisibilities(params.level, params.user ?? null);
  if (params.level === "STAFF" || params.level === "VIEWER") {
    if (!params.isSelf) return [];
  }
  if (allowed === null) return params.documents;
  if (allowed.length === 0) return [];
  return params.documents.filter((doc) => allowed.includes(doc.visibility));
}

export function documentOwnershipStatus(doc: { employeeId: string } | null, employeeId: string) {
  if (!doc) return { ok: false, status: 404, error: "Documento no encontrado" };
  if (doc.employeeId !== employeeId) return { ok: false, status: 403, error: "Documento no pertenece al empleado" };
  return { ok: true as const };
}

export function canViewEmployeeAccessDetails(level: HrAccessLevel) {
  return !(level === "STAFF" || level === "VIEWER");
}
