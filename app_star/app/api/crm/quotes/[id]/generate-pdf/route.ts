import { NextRequest, NextResponse } from "next/server";
import path from "path";
import crypto from "crypto";
import { promises as fs } from "fs";
import { QuoteType } from "@prisma/client";
import { ensureCrmAccess } from "@/lib/api/crm";
import { generateB2CSimplePdf } from "@/lib/quotes/pdf/b2cSimple";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = ensureCrmAccess(req, PERMISSIONS.QUOTE_READ);
  if (auth.errorResponse) return auth.errorResponse;
  const id = params.id;
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  try {
    const quote = await prisma.quote.findUnique({ where: { id }, select: { type: true } });
    if (!quote) return NextResponse.json({ error: "Cotizacion no encontrada" }, { status: 404 });
    if (quote.type === QuoteType.B2B) {
      return NextResponse.json({ error: "PDF B2B aún no disponible" }, { status: 400 });
    }
    const pdfBuffer = await generateB2CSimplePdf(id);
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "quotes");
    await fs.mkdir(uploadsDir, { recursive: true });
    const filename = `quote-${crypto.randomUUID()}.pdf`;
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
    return NextResponse.json({ error: err?.message || "No se pudo generar el PDF" }, { status: 400 });
  }
}
