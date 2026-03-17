import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/rbac";

function requiredFinancePermission(method: string) {
  return method === "GET" || method === "HEAD" ? "FINANCE:READ" : "FINANCE:WRITE";
}

function forbiddenResponse() {
  return NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 });
}

export function ensureFinanceAccess(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return { user: null, errorResponse: auth.errorResponse };

  const user = auth.user;
  if (isAdmin(user) || hasPermission(user, requiredFinancePermission(req.method))) {
    return { user, errorResponse: null };
  }

  return { user, errorResponse: forbiddenResponse() };
}

export function ensureFinancePoster(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return { user: null, errorResponse: auth.errorResponse };

  const user = auth.user;
  if (isAdmin(user) || hasPermission(user, "FINANCE:POST")) {
    return { user, errorResponse: null };
  }

  return { user, errorResponse: forbiddenResponse() };
}
