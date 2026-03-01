import { NextRequest, NextResponse } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { PERMISSIONS } from "@/lib/rbac";
import { createDiscountPlan, listDiscountPlans } from "@/lib/subscriptions/pharmacy/service";
import { createDiscountPlanSchema, listDiscountPlansQuerySchema } from "@/lib/subscriptions/pharmacy/schemas";
import { handlePharmacyApiError, parseBooleanQueryParam } from "@/app/api/subscriptions/pharmacy/_utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_READ);
  if (auth.errorResponse) return auth.errorResponse;

  const parsed = listDiscountPlansQuerySchema.safeParse({
    includeInactive: parseBooleanQueryParam(req.nextUrl.searchParams.get("includeInactive")),
    take: req.nextUrl.searchParams.get("take") || undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const data = await listDiscountPlans(parsed.data);
    return NextResponse.json({ data });
  } catch (error) {
    return handlePharmacyApiError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_ADMIN);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await req.json();
    const payload = createDiscountPlanSchema.parse(json);
    const data = await createDiscountPlan(payload);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handlePharmacyApiError(error);
  }
}
