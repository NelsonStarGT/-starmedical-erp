import { NextRequest, NextResponse } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { createPlanSchema, listPlansQuerySchema } from "@/lib/memberships/schemas";
import { createPlan, listPlans } from "@/lib/memberships/service";
import { PERMISSIONS } from "@/lib/rbac";
import { handleMembershipApiError, parseBooleanQueryParam } from "@/app/api/memberships/_utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_READ);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const parsed = listPlansQuerySchema.safeParse({
      active: parseBooleanQueryParam(req.nextUrl.searchParams.get("active")),
      segment: req.nextUrl.searchParams.get("segment") || undefined,
      type: req.nextUrl.searchParams.get("type") || undefined
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = await listPlans(parsed.data);
    return NextResponse.json({ data });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_WRITE);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await req.json();
    const payload = createPlanSchema.parse(json);
    const data = await createPlan(payload);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}
