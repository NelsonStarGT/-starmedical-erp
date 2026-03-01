import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { initContractRecurrentCheckout } from "@/lib/memberships/service";
import { PERMISSIONS } from "@/lib/rbac";
import { handleMembershipApiError } from "@/app/api/subscriptions/memberships/_utils";

const recurrenteCheckoutSchema = z.object({
  contractId: z.string().trim().min(1),
  returnUrl: z.string().trim().url().optional().nullable(),
  cancelUrl: z.string().trim().url().optional().nullable()
});

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_PAYMENTS_ADMIN);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const payload = recurrenteCheckoutSchema.parse(await req.json());
    const data = await initContractRecurrentCheckout(
      payload.contractId,
      { returnUrl: payload.returnUrl ?? null, cancelUrl: payload.cancelUrl ?? null },
      auth.user
    );
    return NextResponse.json({ data });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}
