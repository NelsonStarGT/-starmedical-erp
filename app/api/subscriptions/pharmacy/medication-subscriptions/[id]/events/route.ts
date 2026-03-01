import { NextRequest, NextResponse } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { PERMISSIONS } from "@/lib/rbac";
import { createMedicationSubscriptionEvent } from "@/lib/subscriptions/pharmacy/service";
import { createMedicationEventSchema } from "@/lib/subscriptions/pharmacy/schemas";
import { handlePharmacyApiError } from "@/app/api/subscriptions/pharmacy/_utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_WRITE);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  try {
    const json = await req.json();
    const payload = createMedicationEventSchema.parse(json);
    const data = await createMedicationSubscriptionEvent(id, payload, auth.user);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handlePharmacyApiError(error);
  }
}
