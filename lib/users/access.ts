import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { requireAuth, type SessionUser } from "@/lib/auth";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
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

function decodeSessionToken(token?: string | null): SessionUser | null {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.AUTH_SECRET || "dev-star-secret") as Partial<SessionUser>;
    if (!decoded?.id || !decoded?.email) return null;
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name || null,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
      branchId: decoded.branchId || null
    };
  } catch {
    return null;
  }
}

export async function requireUsersAdminPageAccess() {
  const cookieStore = await cookies();
  const user = decodeSessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
  if (!user) redirect("/login");
  if (!canManageUsers(user)) forbidden();
  return user;
}
