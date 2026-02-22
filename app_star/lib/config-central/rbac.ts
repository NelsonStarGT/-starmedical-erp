import { NextRequest, NextResponse } from "next/server";
import { requireAuth, type SessionUser } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/rbac";
import { forbidden403 } from "@/lib/config-central/http";

export const CONFIG_CENTRAL_CAPABILITIES = [
  "CONFIG_BRANCH_READ",
  "CONFIG_BRANCH_WRITE",
  "CONFIG_THEME_READ",
  "CONFIG_THEME_WRITE",
  "CONFIG_SAT_READ",
  "CONFIG_SAT_WRITE",
  "CONFIG_EMAIL_READ",
  "CONFIG_EMAIL_WRITE",
  "CONFIG_EMAIL_SANDBOX_READ",
  "CONFIG_API_READ",
  "CONFIG_API_WRITE",
  "CONFIG_BACKUP_READ",
  "CONFIG_BACKUP_WRITE"
] as const;

export type ConfigCentralCapability = (typeof CONFIG_CENTRAL_CAPABILITIES)[number];

export function hasConfigCentralCapability(
  user: SessionUser | null,
  capability: ConfigCentralCapability
): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return hasPermission(user, capability);
}

export function requireConfigCentralCapability(
  req: NextRequest,
  capability: ConfigCentralCapability
): {
  user: SessionUser | null;
  response: NextResponse | null;
} {
  const auth = requireAuth(req);
  if (auth.errorResponse) {
    return { user: null, response: auth.errorResponse };
  }

  if (!hasConfigCentralCapability(auth.user, capability)) {
    return {
      user: auth.user,
      response: forbidden403()
    };
  }

  return { user: auth.user, response: null };
}
