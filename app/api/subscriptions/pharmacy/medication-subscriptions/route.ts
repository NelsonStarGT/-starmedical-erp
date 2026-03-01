import { NextRequest, NextResponse } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { PERMISSIONS } from "@/lib/rbac";
import {
  createMedicationSubscription,
  listMedicationSubscriptions
} from "@/lib/subscriptions/pharmacy/service";
import {
  createMedicationSubscriptionSchema,
  listMedicationSubscriptionsQuerySchema
} from "@/lib/subscriptions/pharmacy/schemas";
import { handlePharmacyApiError } from "@/app/api/subscriptions/pharmacy/_utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_READ);
  if (auth.errorResponse) return auth.errorResponse;

  const parsed = listMedicationSubscriptionsQuerySchema.safeParse({
    status: req.nextUrl.searchParams.get("status") || undefined,
    patientId: req.nextUrl.searchParams.get("patientId") || undefined,
    branchId: req.nextUrl.searchParams.get("branchId") || undefined,
    dueInDays: req.nextUrl.searchParams.get("dueInDays") || undefined,
    take: req.nextUrl.searchParams.get("take") || undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const data = await listMedicationSubscriptions(parsed.data, auth.user);
    return NextResponse.json({ data });
  } catch (error) {
    return handlePharmacyApiError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_WRITE);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await req.json();
    const payload = createMedicationSubscriptionSchema.parse(json);
    const data = await createMedicationSubscription(payload, auth.user);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handlePharmacyApiError(error);
  }
}
