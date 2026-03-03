import { NextRequest, NextResponse } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { createContractSchema, listContractsQuerySchema } from "@/lib/memberships/schemas";
import { createContract, listContracts } from "@/lib/memberships/service";
import { PERMISSIONS } from "@/lib/rbac";
import { handleMembershipApiError } from "@/app/api/memberships/_utils";

export const dynamic = "force-dynamic";

export function parseContractsListQuery(req: NextRequest) {
  const searchAlias = req.nextUrl.searchParams.get("search") || undefined;
  return listContractsQuerySchema.safeParse({
    ownerType: req.nextUrl.searchParams.get("ownerType") || undefined,
    status: req.nextUrl.searchParams.get("status") || undefined,
    ownerId: req.nextUrl.searchParams.get("ownerId") || undefined,
    planId: req.nextUrl.searchParams.get("planId") || undefined,
    branchId: req.nextUrl.searchParams.get("branchId") || undefined,
    paymentMethod: req.nextUrl.searchParams.get("paymentMethod") || undefined,
    segment: req.nextUrl.searchParams.get("segment") || undefined,
    q: req.nextUrl.searchParams.get("q") || searchAlias,
    search: searchAlias,
    renewWindowDays: req.nextUrl.searchParams.get("renewWindowDays") || undefined,
    renewFrom: req.nextUrl.searchParams.get("renewFrom") || undefined,
    renewTo: req.nextUrl.searchParams.get("renewTo") || undefined,
    page: req.nextUrl.searchParams.get("page") || undefined,
    take: req.nextUrl.searchParams.get("take") || undefined
  });
}

export async function GET(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_READ);
  if (auth.errorResponse) return auth.errorResponse;

  const parsed = parseContractsListQuery(req);

  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const data = await listContracts(parsed.data, auth.user);
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
    const payload = createContractSchema.parse(json);
    const data = await createContract(payload, auth.user);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}
