import { NextRequest, NextResponse } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { createBenefitCatalogSchema, listBenefitsQuerySchema } from "@/lib/memberships/schemas";
import { createBenefitCatalog, listBenefitCatalog } from "@/lib/memberships/service";
import { PERMISSIONS } from "@/lib/rbac";
import { handleMembershipApiError, parseBooleanQueryParam } from "@/app/api/memberships/_utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_READ);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const parsed = listBenefitsQuerySchema.safeParse({
      includeInactive: parseBooleanQueryParam(req.nextUrl.searchParams.get("includeInactive")),
      serviceType: req.nextUrl.searchParams.get("serviceType") || undefined
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = await listBenefitCatalog(parsed.data, auth.user);
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
    const payload = createBenefitCatalogSchema.parse(json);
    const data = await createBenefitCatalog(payload, auth.user);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}
