import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/inventory/auth";
import { inventoryCreateData, inventoryWhere, resolveInventoryScope } from "@/lib/inventory/scope";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  try {
    const policy = await prisma.inventoryMarginPolicy.findFirst({
      where: inventoryWhere(scope, {}),
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ data: policy });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo obtener política" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireRoles(req, ["Administrador"]);
  if (auth.errorResponse) return auth.errorResponse;
  const { scope, errorResponse } = resolveInventoryScope(req);
  if (errorResponse || !scope) return errorResponse;
  try {
    const body = await req.json();
    const data = {
      marginProductsPct: body.marginProductsPct ?? null,
      marginServicesPct: body.marginServicesPct ?? null,
      roundingMode: body.roundingMode || "NONE",
      autoApplyOnCreate: Boolean(body.autoApplyOnCreate)
    };
    const existing = await prisma.inventoryMarginPolicy.findFirst({ where: inventoryWhere(scope, {}) });
    const saved = existing
      ? await prisma.inventoryMarginPolicy.update({ where: { id: existing.id }, data })
      : await prisma.inventoryMarginPolicy.create({ data: inventoryCreateData(scope, data) });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo guardar política" }, { status: 400 });
  }
}
