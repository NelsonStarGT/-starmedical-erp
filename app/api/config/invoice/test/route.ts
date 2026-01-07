import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ensureAdmin } from "@/lib/api/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const pdfBytes = await buildDummyInvoice();
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="factura-test.pdf"'
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo generar PDF de prueba" }, { status: 500 });
  }
}

async function buildDummyInvoice() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  page.drawText("Factura de prueba - StarMedical ERP", {
    x: 40,
    y: height - 60,
    size: 16,
    font: bold,
    color: rgb(0.1, 0.1, 0.1)
  });

  page.drawText("Cliente demo", { x: 40, y: height - 90, size: 12, font });
  page.drawText("NIT: 0000000-0", { x: 40, y: height - 110, size: 12, font });
  page.drawText("Fecha: 2025-01-01", { x: 40, y: height - 130, size: 12, font });

  page.drawText("Detalle", { x: 40, y: height - 170, size: 13, font: bold });
  const headers = ["Cantidad", "Descripción", "Precio", "Total"];
  headers.forEach((h, idx) => {
    page.drawText(h, { x: 40 + idx * 120, y: height - 190, size: 11, font: bold });
  });
  page.drawText("1", { x: 40, y: height - 210, size: 11, font });
  page.drawText("Servicio demo", { x: 160, y: height - 210, size: 11, font });
  page.drawText("Q100.00", { x: 280, y: height - 210, size: 11, font });
  page.drawText("Q100.00", { x: 400, y: height - 210, size: 11, font });

  page.drawText("Subtotal: Q100.00", { x: 380, y: height - 260, size: 11, font });
  page.drawText("IVA (12%): Q12.00", { x: 380, y: height - 280, size: 11, font });
  page.drawText("Total: Q112.00", { x: 380, y: height - 300, size: 12, font: bold });

  page.drawText("Este PDF es solo una vista previa generada por el módulo de Configuración.", {
    x: 40,
    y: 60,
    size: 10,
    font,
    color: rgb(0.25, 0.25, 0.25)
  });

  return await doc.save();
}
