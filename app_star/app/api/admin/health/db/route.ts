import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { getDbHealthSnapshot } from "@/lib/server/dbHealth.service";

export async function GET(req: NextRequest) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const snapshot = await getDbHealthSnapshot();
  return NextResponse.json(snapshot);
}

