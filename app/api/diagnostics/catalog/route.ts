import { NextRequest, NextResponse } from "next/server";
import { DiagnosticItemKind, ImagingModality, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticsPermission } from "@/lib/api/diagnostics";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = requireDiagnosticsPermission(req, "DIAG:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");

  const where: any = { isActive: true };
  if (kind) {
    const normalized = kind.toUpperCase();
    if (!Object.values(DiagnosticItemKind).includes(normalized as DiagnosticItemKind)) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }
    where.kind = normalized;
  }

  const items = await prisma.diagnosticCatalogItem.findMany({ where, orderBy: { name: "asc" } });
  return NextResponse.json({
    data: items.map((item) => ({
      ...item,
      price: item.price ? Number(item.price) : null,
      refLow: item.refLow ? Number(item.refLow) : null,
      refHigh: item.refHigh ? Number(item.refHigh) : null
    }))
  });
}

function normalizeCatalog(body: any) {
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const kind = typeof body.kind === "string" ? body.kind.toUpperCase() : "";
  const modality = typeof body.modality === "string" ? body.modality.toUpperCase() : null;
  const unit = typeof body.unit === "string" ? body.unit.trim() : null;
  const price = body.price !== undefined && body.price !== null ? Number(body.price) : null;
  const isActive = body.isActive === undefined ? true : Boolean(body.isActive);
  if (!code || !name) throw new Error("code y name requeridos");
  if (!Object.values(DiagnosticItemKind).includes(kind as DiagnosticItemKind)) throw new Error("kind inválido");
  if (kind === DiagnosticItemKind.IMAGING && modality && !Object.values(ImagingModality).includes(modality as ImagingModality)) {
    throw new Error("modality inválida");
  }
  return { code, name, kind: kind as DiagnosticItemKind, modality, unit, price, isActive };
}

export async function POST(req: NextRequest) {
  const auth = requireDiagnosticsPermission(req, "DIAG:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { code, name, kind, modality, unit, price, isActive } = normalizeCatalog(body);
    const refLow = body.refLow !== undefined && body.refLow !== null ? Number(body.refLow) : null;
    const refHigh = body.refHigh !== undefined && body.refHigh !== null ? Number(body.refHigh) : null;
    const saved = await prisma.diagnosticCatalogItem.upsert({
      where: { code },
      update: {
        name,
        kind,
        modality: modality as ImagingModality | null,
        unit,
        price: price !== null ? new Prisma.Decimal(price) : new Prisma.Decimal(0),
        refLow: refLow !== null ? new Prisma.Decimal(refLow) : null,
        refHigh: refHigh !== null ? new Prisma.Decimal(refHigh) : null,
        isActive
      },
      create: {
        code,
        name,
        kind,
        modality: modality as ImagingModality | null,
        unit,
        price: price !== null ? new Prisma.Decimal(price) : new Prisma.Decimal(0),
        refLow: refLow !== null ? new Prisma.Decimal(refLow) : null,
        refHigh: refHigh !== null ? new Prisma.Decimal(refHigh) : null,
        isActive
      }
    });
    return NextResponse.json({ data: saved }, { status: 201 });
  } catch (err: any) {
    const message = err?.message || "No se pudo guardar el catálogo";
    const status = err?.code === "P2002" ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireDiagnosticsPermission(req, "DIAG:WRITE");
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const updates: any = {};
    if (body.name !== undefined) updates.name = String(body.name);
    if (body.code !== undefined) updates.code = String(body.code);
    if (body.unit !== undefined) updates.unit = body.unit ? String(body.unit) : null;
    if (body.kind) {
      const kind = String(body.kind).toUpperCase();
      if (!Object.values(DiagnosticItemKind).includes(kind as DiagnosticItemKind)) throw new Error("kind inválido");
      updates.kind = kind;
    }
    if (body.modality !== undefined) {
      updates.modality = body.modality ? (String(body.modality).toUpperCase() as ImagingModality) : null;
    }
    if (body.price !== undefined) updates.price = new Prisma.Decimal(Number(body.price || 0));
    if (body.refLow !== undefined) updates.refLow = body.refLow !== null ? new Prisma.Decimal(Number(body.refLow)) : null;
    if (body.refHigh !== undefined) updates.refHigh = body.refHigh !== null ? new Prisma.Decimal(Number(body.refHigh)) : null;
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

    const saved = await prisma.diagnosticCatalogItem.update({ where: { id }, data: updates });
    return NextResponse.json({ data: saved }, { status: 200 });
  } catch (err: any) {
    const message = err?.message || "No se pudo actualizar el catálogo";
    const status = err?.code === "P2025" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
