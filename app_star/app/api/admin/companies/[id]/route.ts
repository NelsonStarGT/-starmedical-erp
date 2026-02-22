import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { companyDetailQuerySchema, companyIdParamSchema } from "@/lib/companies/schema/company.zod";
import { getCompanyDetail } from "@/lib/companies/services/company.service";

export const runtime = "nodejs";

type Context = { params: { id: string } } | { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Context) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!auth.user || !isAdmin(auth.user)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  const resolvedParams = "then" in context.params ? await context.params : context.params;
  const idParsed = companyIdParamSchema.safeParse({ id: resolvedParams.id });
  if (!idParsed.success) {
    return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
  }

  const queryParsed = companyDetailQuerySchema.safeParse({
    tenantId: req.nextUrl.searchParams.get("tenantId") ?? undefined,
    includeArchived: req.nextUrl.searchParams.get("includeArchived") ?? undefined
  });

  if (!queryParsed.success) {
    return NextResponse.json(
      { ok: false, error: "Parámetros inválidos", details: queryParsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const company = await getCompanyDetail({
    companyId: idParsed.data.id,
    ...queryParsed.data
  });

  if (!company) {
    return NextResponse.json({ ok: false, error: "Empresa no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, company });
}
