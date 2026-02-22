import type { SessionUser } from "@/lib/auth";
import { hasPermission, normalizeRoleName } from "@/lib/rbac";

export type WorklistModality = "LAB" | "RX" | "USG";
export type WorklistAccessLevel = "read" | "write";

type AccessRule = {
  readRoles: string[];
  writeRoles: string[];
  readPermissions: string[];
  writePermissions: string[];
};

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);

const ACCESS_RULES: Record<WorklistModality, AccessRule> = {
  LAB: {
    readRoles: ["LAB_TECH", "LAB_SUPERVISOR", "LAB_ADMIN"],
    writeRoles: ["LAB_TECH", "LAB_SUPERVISOR", "LAB_ADMIN"],
    readPermissions: ["LABTEST:READ", "LABTEST:WRITE", "LABTEST:VALIDATE", "LABTEST:RELEASE", "LABTEST:ADMIN"],
    writePermissions: ["LABTEST:WRITE", "LABTEST:VALIDATE", "LABTEST:RELEASE", "LABTEST:ADMIN"]
  },
  RX: {
    readRoles: ["RX_TECH", "RX_SUPERVISOR", "RX_ADMIN", "RADIOLOGY_TECH", "RADIOLOGY_SUPERVISOR", "RADIOLOGY_ADMIN"],
    writeRoles: ["RX_TECH", "RX_SUPERVISOR", "RX_ADMIN", "RADIOLOGY_TECH", "RADIOLOGY_SUPERVISOR", "RADIOLOGY_ADMIN"],
    readPermissions: ["DIAG:RADIOLOGY", "DIAG:READ", "DIAG:WRITE"],
    writePermissions: ["DIAG:RADIOLOGY", "DIAG:WRITE"]
  },
  USG: {
    readRoles: ["USG_TECH", "USG_SUPERVISOR", "USG_ADMIN", "RADIOLOGY_TECH", "RADIOLOGY_SUPERVISOR", "RADIOLOGY_ADMIN"],
    writeRoles: ["USG_TECH", "USG_SUPERVISOR", "USG_ADMIN", "RADIOLOGY_TECH", "RADIOLOGY_SUPERVISOR", "RADIOLOGY_ADMIN"],
    readPermissions: ["DIAG:RADIOLOGY", "DIAG:READ", "DIAG:WRITE"],
    writePermissions: ["DIAG:RADIOLOGY", "DIAG:WRITE"]
  }
};

function userHasRole(user: SessionUser, allowedRoles: string[]) {
  const allowed = new Set(allowedRoles.map((item) => normalizeRoleName(item)));
  return (user.roles || []).some((role) => allowed.has(normalizeRoleName(role)));
}

export function canAccessWorklistByModality(
  user: SessionUser | null | undefined,
  modality: WorklistModality,
  level: WorklistAccessLevel = "read"
) {
  if (!user) return false;
  const normalizedRoles = (user.roles || []).map((item) => normalizeRoleName(item));
  if (normalizedRoles.some((role) => ADMIN_ROLES.has(role))) return true;

  const rule = ACCESS_RULES[modality];
  const roleAllowed = level === "write" ? userHasRole(user, rule.writeRoles) : userHasRole(user, rule.readRoles);
  if (roleAllowed) return true;

  const perms = level === "write" ? rule.writePermissions : rule.readPermissions;
  return perms.some((perm) => hasPermission(user, perm));
}

export function allowedRolesForWorklist(modality: WorklistModality, level: WorklistAccessLevel = "read") {
  const rule = ACCESS_RULES[modality];
  const base = level === "write" ? rule.writeRoles : rule.readRoles;
  return ["SUPER_ADMIN", "ADMIN", ...base];
}
