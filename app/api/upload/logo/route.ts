import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const permission = requirePermission(auth.user, "FILES:UPLOAD");
  if (permission.errorResponse) return permission.errorResponse;
  return NextResponse.json({ ok: true, message: "Logo upload listo" });
}

export { POST } from "../image/route";
