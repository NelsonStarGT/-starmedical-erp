import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { requireAuth, getSessionUserFromCookies, type SessionUser } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/rbac";

export function canManageUsers(user: SessionUser | null) {
  if (!user) return false;
  return isAdmin(user) || hasPermission(user, "USERS:ADMIN") || hasPermission(user, "SYSTEM:ADMIN");
}

export function requireUsersAdminApi(req: Parameters<typeof requireAuth>[0]) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return { user: null, errorResponse: auth.errorResponse };
  if (!canManageUsers(auth.user)) {
    return {
      user: auth.user,
      errorResponse: NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 })
    };
  }
  return { user: auth.user, errorResponse: null };
}

export async function requireUsersAdminPageAccess() {
  const user = await getSessionUserFromCookies(cookies());
  if (!user) redirect("/login");
  if (!canManageUsers(user)) forbidden();
  return user;
}
