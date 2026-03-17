import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/rbac";

export function ensureAdmin(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) {
    return { user: null, errorResponse: auth.errorResponse };
  }

  const user = auth.user;
  if (isAdmin(user) || hasPermission(user, "SYSTEM:ADMIN")) {
    return { user, errorResponse: null };
  }

  return {
    user,
    errorResponse: NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 })
  };
}
