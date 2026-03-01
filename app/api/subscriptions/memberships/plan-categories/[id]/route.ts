import { NextRequest, NextResponse } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { updatePlanCategorySchema } from "@/lib/memberships/schemas";
import { updatePlanCategory } from "@/lib/memberships/service";
import { PERMISSIONS } from "@/lib/rbac";
import { handleMembershipApiError } from "@/app/api/memberships/_utils";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_ADMIN);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await context.params;
    const json = await req.json();
    const payload = updatePlanCategorySchema.parse(json);
    const data = await updatePlanCategory(id, payload);
    return NextResponse.json({ data });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}
