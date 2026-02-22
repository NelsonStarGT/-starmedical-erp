import { NextResponse, type NextRequest } from "next/server";
import { requireAuth, type SessionUser } from "@/lib/auth";

export const PORTAL_CAPABILITIES = [
  "PORTAL_CONFIG_READ",
  "PORTAL_CONFIG_WRITE",
  "PORTAL_AUDIT_READ",
  "PORTAL_SESSION_READ",
  "PORTAL_SESSION_REVOKE",
  "PORTAL_REQUESTS_READ"
] as const;

export type PortalCapability = (typeof PORTAL_CAPABILITIES)[number];

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);
const READ_CAPABILITIES: PortalCapability[] = [
  "PORTAL_CONFIG_READ",
  "PORTAL_AUDIT_READ",
  "PORTAL_SESSION_READ",
  "PORTAL_REQUESTS_READ"
];

function normalizeRole(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

function isAdminUser(user: SessionUser | null) {
  if (!user) return false;
  return (user.roles || []).map(normalizeRole).some((role) => ADMIN_ROLES.has(role));
}

export function buildPortalCapabilities(user: SessionUser | null): PortalCapability[] {
  if (!user) return [];
  if (isAdminUser(user)) return [...PORTAL_CAPABILITIES];

  const userPermissions = new Set((user.permissions || []).map((perm) => perm.toUpperCase()));
  const allowed = new Set<PortalCapability>();

  for (const capability of PORTAL_CAPABILITIES) {
    if (userPermissions.has(capability)) {
      allowed.add(capability);
    }
  }

  if (userPermissions.has("USERS:ADMIN")) {
    for (const capability of READ_CAPABILITIES) {
      allowed.add(capability);
    }
  }

  return [...allowed];
}

export function hasPortalCapability(user: SessionUser | null, capability: PortalCapability) {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  const capabilities = buildPortalCapabilities(user);
  return capabilities.includes(capability);
}

export function requirePortalApiCapability(req: NextRequest, capability: PortalCapability) {
  const auth = requireAuth(req);
  if (auth.errorResponse) {
    return {
      user: null,
      response: auth.errorResponse
    } as const;
  }

  if (!hasPortalCapability(auth.user, capability)) {
    return {
      user: auth.user,
      response: NextResponse.json({ error: "No autorizado" }, { status: 403 })
    } as const;
  }

  return {
    user: auth.user,
    response: null
  } as const;
}
