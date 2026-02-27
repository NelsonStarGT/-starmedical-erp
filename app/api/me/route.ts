import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedUser(req);
  if (auth.errorResponse) return auth.errorResponse;
  const user = auth.user!;
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles || [],
    permissions: user.permissions || [],
    deniedPermissions: user.deniedPermissions || []
  });
}
