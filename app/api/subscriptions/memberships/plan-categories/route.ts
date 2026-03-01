import { NextRequest, NextResponse } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { createPlanCategorySchema, listPlanCategoriesQuerySchema } from "@/lib/memberships/schemas";
import { createPlanCategory, listPlanCategories } from "@/lib/memberships/service";
import { PERMISSIONS } from "@/lib/rbac";
import { handleMembershipApiError, parseBooleanQueryParam } from "@/app/api/memberships/_utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_READ);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const parsed = listPlanCategoriesQuerySchema.safeParse({
      segment: req.nextUrl.searchParams.get("segment") || undefined,
      includeInactive: parseBooleanQueryParam(req.nextUrl.searchParams.get("includeInactive"))
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = await listPlanCategories(parsed.data);
    return NextResponse.json({ data });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_ADMIN);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await req.json();
    const payload = createPlanCategorySchema.parse(json);
    const data = await createPlanCategory(payload);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}
