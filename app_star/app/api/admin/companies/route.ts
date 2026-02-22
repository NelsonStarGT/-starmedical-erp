import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { companyListQuerySchema } from "@/lib/companies/schema/company.zod";
import { listCompanies } from "@/lib/companies/services/company.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!auth.user || !isAdmin(auth.user)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const parsed = companyListQuerySchema.safeParse({
    tenantId: req.nextUrl.searchParams.get("tenantId") ?? undefined,
    q: req.nextUrl.searchParams.get("q") ?? undefined,
    kind: req.nextUrl.searchParams.get("kind") ?? undefined,
    status: req.nextUrl.searchParams.get("status") ?? undefined,
    contractStatus: req.nextUrl.searchParams.get("contractStatus") ?? undefined,
    includeArchived: req.nextUrl.searchParams.get("includeArchived") ?? undefined,
    page: req.nextUrl.searchParams.get("page") ?? undefined,
    pageSize: req.nextUrl.searchParams.get("pageSize") ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Parámetros inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const result = await listCompanies(parsed.data);
  return NextResponse.json({ ok: true, ...result });
}
