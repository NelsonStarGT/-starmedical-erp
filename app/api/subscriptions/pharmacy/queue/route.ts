import { NextRequest, NextResponse } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { PERMISSIONS } from "@/lib/rbac";
import { listPharmacyQueue } from "@/lib/subscriptions/pharmacy/service";
import { listQueueQuerySchema } from "@/lib/subscriptions/pharmacy/schemas";
import { handlePharmacyApiError } from "@/app/api/subscriptions/pharmacy/_utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_READ);
  if (auth.errorResponse) return auth.errorResponse;

  const parsed = listQueueQuerySchema.safeParse({
    windowDays: req.nextUrl.searchParams.get("windowDays") || undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const data = await listPharmacyQueue(parsed.data, auth.user);
    return NextResponse.json({ data });
  } catch (error) {
    return handlePharmacyApiError(error);
  }
}
