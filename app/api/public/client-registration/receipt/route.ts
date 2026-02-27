import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { consumePortalRateLimit } from "@/lib/portal/rateLimitStore";
import { readPortalRequestMeta } from "@/lib/portal/requestMeta";
import { resolveClientSelfRegistrationByReceiptToken } from "@/lib/reception/clientSelfRegistration.server";

export const runtime = "nodejs";

function responseRateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { ok: false, error: "Demasiadas solicitudes de comprobante. Intenta nuevamente." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

function clientTypeLabel(value: string) {
  if (value === "PERSON") return "Persona";
  if (value === "COMPANY") return "Empresa";
  if (value === "INSTITUTION") return "Institución";
  if (value === "INSURER") return "Aseguradora";
  return value;
}

async function buildReceiptPdf(input: {
  registrationCode: string;
  clientType: string;
  status: string;
  displayName: string | null;
  createdAt: Date;
}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  const drawLine = (label: string, value: string, isTitle = false) => {
    page.drawText(label, {
      x: 48,
      y,
      size: isTitle ? 20 : 12,
      font: isTitle ? fontBold : fontBold,
      color: isTitle ? rgb(0.06, 0.16, 0.26) : rgb(0.12, 0.2, 0.3)
    });
    if (!isTitle) {
      page.drawText(value, {
        x: 200,
        y,
        size: 12,
        font,
        color: rgb(0.2, 0.24, 0.3)
      });
    }
    y -= isTitle ? 34 : 24;
  };

  drawLine("StarMedical ERP", "", true);
  drawLine("Comprobante de auto-registro", "", true);
  y -= 8;

  drawLine("Correlativo", input.registrationCode);
  drawLine("Tipo", clientTypeLabel(input.clientType));
  drawLine("Estado", input.status);
  drawLine("Nombre", input.displayName || "No indicado");
  drawLine(
    "Fecha de captura",
    input.createdAt.toLocaleString("es-GT", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })
  );

  y -= 10;
  page.drawText("Mensaje", {
    x: 48,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.12, 0.2, 0.3)
  });
  y -= 22;
  page.drawText("Tu registro ha sido capturado y está pendiente de aprobación por recepción.", {
    x: 48,
    y,
    size: 11,
    font,
    color: rgb(0.2, 0.24, 0.3)
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

export async function GET(req: NextRequest) {
  const requestMeta = readPortalRequestMeta(req.headers);
  const ipRate = await consumePortalRateLimit(`clients:self-reg:receipt:ip:${requestMeta.ipHash ?? "unknown"}`, {
    limit: 40,
    windowMs: 10 * 60_000
  });
  if (!ipRate.allowed) return responseRateLimited(ipRate.retryAfterSeconds);

  const token = String(req.nextUrl.searchParams.get("token") || "").trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "Token requerido." }, { status: 400 });
  }

  const registration = await resolveClientSelfRegistrationByReceiptToken(token);
  if (!registration) {
    return NextResponse.json({ ok: false, error: "Comprobante no disponible." }, { status: 404 });
  }

  const pdf = await buildReceiptPdf({
    registrationCode: registration.provisionalCode,
    clientType: registration.clientType,
    status: registration.status,
    displayName: registration.displayName,
    createdAt: registration.createdAt
  });

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="registro-${registration.provisionalCode}.pdf"`
    }
  });
}
