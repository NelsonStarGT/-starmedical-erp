import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin } from "@/lib/api/admin";

export const dynamic = "force-dynamic";

function sanitizeSeries(raw: any[]) {
  return (Array.isArray(raw) ? raw : [])
    .map((s) => {
      const code = String(s.code || "").trim();
      if (!code) return null;
      const initialNumber = Number.isFinite(Number(s.initialNumber)) ? Number(s.initialNumber) : 1;
      const currentNumber = Number.isFinite(Number(s.currentNumber)) ? Number(s.currentNumber) : initialNumber;
      return {
        code,
        initialNumber,
        currentNumber,
        branchId: s.branchId || null,
        isActive: s.isActive !== false
      };
    })
    .filter(Boolean) as Array<{
    code: string;
    initialNumber: number;
    currentNumber: number;
    branchId: string | null;
    isActive: boolean;
  }>;
}

export async function GET(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const data = await prisma.invoiceConfig.findFirst({
      include: { series: { orderBy: { createdAt: "asc" } } }
    });
    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo obtener configuración de factura" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const legalName = String(body.legalName || "").trim();
    const nit = String(body.nit || "").trim();
    if (!legalName) return NextResponse.json({ error: "legalName requerido" }, { status: 400 });
    if (!nit) return NextResponse.json({ error: "nit requerido" }, { status: 400 });

    const payload = {
      legalName,
      nit,
      fiscalAddress: body.fiscalAddress || null,
      defaultTaxRate: Number.isFinite(Number(body.defaultTaxRate)) ? Number(body.defaultTaxRate) : 12,
      invoiceFooterText: body.invoiceFooterText || null,
      pdfTemplateConfig: body.pdfTemplateConfig || null
    };

    const series = sanitizeSeries(body.series || []);

    const saved = await prisma.$transaction(async (tx) => {
      const existing = await tx.invoiceConfig.findFirst();
      const config = existing
        ? await tx.invoiceConfig.update({ where: { id: existing.id }, data: payload })
        : await tx.invoiceConfig.create({ data: payload });

      await tx.invoiceSeries.deleteMany({ where: { invoiceConfigId: config.id } });
      if (series.length) {
        await tx.invoiceSeries.createMany({
          data: series.map((s) => ({
            ...s,
            invoiceConfigId: config.id
          }))
        });
      }
      return config;
    });

    const withSeries = await prisma.invoiceConfig.findUnique({
      where: { id: saved.id },
      include: { series: { orderBy: { createdAt: "asc" } } }
    });

    return NextResponse.json({ data: withSeries });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo guardar facturación" }, { status: 500 });
  }
}
