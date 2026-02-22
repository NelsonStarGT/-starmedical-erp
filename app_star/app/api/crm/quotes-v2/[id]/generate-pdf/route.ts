import { NextRequest, NextResponse } from "next/server";
import path from "path";
import crypto from "crypto";
import { promises as fs } from "fs";
import { QuoteType } from "@prisma/client";
import { ensureCrmAccess } from "@/lib/api/crm";
import { generateB2BPropuestaPdf } from "@/lib/pdf/b2bPropuesta";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = ensureCrmAccess(req, PERMISSIONS.QUOTE_READ);
  if (auth.errorResponse) return auth.errorResponse;
  const id = params?.id || req.nextUrl.pathname.split("/quotes-v2/")[1]?.split("/")[0] || req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  try {
    const quote = await prisma.quote.findUnique({ where: { id }, include: { items: true } });
    if (!quote) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
    if (quote.type !== QuoteType.B2B) return NextResponse.json({ error: "PDF B2B solo aplica a cotizaciones B2B" }, { status: 400 });
    if (!quote.items?.length) return NextResponse.json({ error: "Agrega items antes de generar PDF" }, { status: 400 });

    const pdfBuffer = await generateB2BPropuestaPdf(id);
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "quotes");
    await fs.mkdir(uploadsDir, { recursive: true });
    const filename = `quote-b2b-${crypto.randomUUID()}.pdf`;
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, pdfBuffer);
    const pdfUrl = `/uploads/quotes/${filename}`;

    await prisma.quote.update({
      where: { id },
      data: { pdfUrl, pdfGeneratedAt: new Date() }
    });

    await auditLog({
      action: "QUOTE_PDF_GENERATED",
      entityType: "QUOTE",
      entityId: id,
      after: { pdfUrl },
      user: auth.user,
      req
    });

    return NextResponse.json({ data: { pdfUrl } });
  } catch (err: any) {
    console.error(err);
    const message = err?.message ? String(err.message).split("\n")[0] : "No se pudo generar el PDF";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
