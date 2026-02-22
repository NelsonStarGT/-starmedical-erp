import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { QuoteDeliveryChannel, QuoteDeliveryStatus, QuoteStatus, QuoteType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";
import { PERMISSIONS, enforceDealOwnership, isAdmin as isAdminRole } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import { generateB2CSimplePdf } from "@/lib/quotes/pdf/b2cSimple";
import { persistQuotePdf, readExistingPdf } from "@/lib/quotes/storage";
import { sendMail } from "@/lib/email/mailer";
import { mapQuoteResponse } from "../../utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SendBody = {
  channel?: "EMAIL" | "WHATSAPP";
  to?: string[];
  cc?: string[];
  bcc?: string[];
  message?: { subject?: string; bodyText?: string; bodyHtml?: string };
  regeneratePdf?: boolean;
};

function normalizeEmails(input?: string[] | string | null) {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : [input];
  const regex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  return arr
    .map((e) => String(e || "").trim())
    .filter(Boolean)
    .filter((e) => regex.test(e));
}

async function ensureRateLimit(quoteId: string, channel: QuoteDeliveryChannel) {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const count = await prisma.quoteDelivery.count({
    where: { quoteId, channel, createdAt: { gte: cutoff } }
  });
  if (count >= 3) throw new Error("Rate limit: máximo 3 envíos en 30 minutos");
}

async function generatePdf(quote: any, regenerate: boolean, actorUserId?: string | null) {
  if (quote.type === QuoteType.B2B) {
    const assetId = quote.pdfUrl?.startsWith("/api/files/") ? quote.pdfUrl.replace("/api/files/", "") : null;
    const asset = assetId ? await prisma.fileAsset.findUnique({ where: { id: assetId } }) : null;
    const storageKey = asset?.storageKey || quote.pdfUrl;
    const buffer = await readExistingPdf(storageKey);
    if (!buffer) throw new Error("No se encontró el PDF subido. Sube una nueva versión.");
    return {
      pdfUrl: quote.pdfUrl,
      pdfHash: quote.pdfHash || crypto.createHash("sha256").update(buffer).digest("hex"),
      fileAssetId: asset?.id || null,
      pdfVersion: quote.pdfVersion || Math.floor(Date.now() / 1000),
      sizeBytes: buffer.length,
      storageKey
    };
  }

  const existing = !regenerate ? await readExistingPdf(quote.pdfUrl) : null;
  let buffer = existing;
  if (!buffer) {
    buffer = await generateB2CSimplePdf(quote.id);
  }
  if (!buffer) throw new Error("No se pudo generar el PDF");
  const stored = await persistQuotePdf(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer), quote.id, actorUserId, quote.dealId);
  await prisma.quote.update({
    where: { id: quote.id },
    data: { pdfUrl: stored.pdfUrl, pdfGeneratedAt: new Date() }
  });
  return stored;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = ensureCrmAccess(req, PERMISSIONS.QUOTE_SEND);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const quoteId = params.id;
    if (!quoteId) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const body = (await req.json().catch(() => ({}))) as SendBody;
    const channelRaw = (body.channel || "EMAIL").toUpperCase();
    const channel = channelRaw === "WHATSAPP" ? QuoteDeliveryChannel.WHATSAPP : QuoteDeliveryChannel.EMAIL;

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { items: true, deal: { include: { contact: true, account: true } } }
    });
    if (!quote) return NextResponse.json({ error: "Cotizacion no encontrada" }, { status: 404 });

    if (quote.deal && !isAdminRole(auth.user) && !enforceDealOwnership(auth.user!, quote.deal as any)) {
      return NextResponse.json({ error: "No autorizado para esta cotización" }, { status: 403 });
    }
    if (quote.status === QuoteStatus.SENT) {
      return NextResponse.json({ error: "La cotización ya fue enviada" }, { status: 400 });
    }
    if (quote.status === QuoteStatus.REJECTED) {
      return NextResponse.json({ error: "No puedes enviar una cotización rechazada" }, { status: 400 });
    }

    const fallbackEmail = quote.deal?.contact?.email || (quote.deal as any)?.account?.email || "";
    const to = normalizeEmails(body.to).length ? normalizeEmails(body.to) : normalizeEmails([fallbackEmail]);
    const cc = normalizeEmails(body.cc);
    const bcc = normalizeEmails(body.bcc);
    if (!to.length) return NextResponse.json({ error: "No hay destinatarios válidos" }, { status: 400 });

    await ensureRateLimit(quoteId, channel);

    const subject = body.message?.subject || `Cotización ${quote.number || quoteId}`;
    const bodyText =
      body.message?.bodyText ||
      `Hola,\n\nAdjuntamos la cotización ${quote.number || quoteId}.\n\nGracias,\nEquipo StarMedical`;
    const bodyHtml =
      body.message?.bodyHtml ||
      `<p>Hola,</p><p>Adjuntamos la cotización <strong>${quote.number || quoteId}</strong>.</p><p>Gracias,<br/>Equipo StarMedical</p>`;

    await auditLog({
      action: "QUOTE_SEND_REQUESTED",
      entityType: "QUOTE",
      entityId: quoteId,
      user: auth.user,
      req,
      metadata: { channel, to }
    });

    const pdf = await generatePdf(quote, body.regeneratePdf || false, auth.user?.id);
    const delivery = await prisma.quoteDelivery.create({
      data: {
        quoteId,
        dealId: quote.dealId,
        channel,
        to,
        cc: cc.length ? cc : undefined,
        bcc: bcc.length ? bcc : undefined,
        subject,
        bodyText,
        bodyHtml,
        pdfUrl: pdf.pdfUrl,
        pdfHash: pdf.pdfHash,
        pdfVersion: pdf.pdfVersion,
        fileAssetId: pdf.fileAssetId || null,
        status: QuoteDeliveryStatus.SENDING,
        provider: process.env.EMAIL_PROVIDER || "SMTP",
        actorUserId: auth.user?.id || null,
        metadata: {
          requestId: req.headers.get("x-request-id") || crypto.randomUUID(),
          ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
        }
      }
    });

    try {
      if (channel === QuoteDeliveryChannel.EMAIL) {
        let pdfBuffer = await readExistingPdf(pdf.storageKey || pdf.pdfUrl);
        if (!pdfBuffer) {
          if (quote.type === QuoteType.B2B) {
            throw new Error("No se encontró el PDF subido para enviar.");
          }
          pdfBuffer = await generateB2CSimplePdf(quoteId);
        }
        const result = await sendMail({
          to,
          cc,
          bcc,
          subject,
          text: bodyText,
          html: bodyHtml,
          attachments: [{ filename: `cotizacion-${quote.number || quoteId}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
          tenantId: auth.user?.tenantId || "global",
          emailType: "crm-quote"
        });

        await prisma.$transaction([
          prisma.quoteDelivery.update({
            where: { id: delivery.id },
            data: {
              status: QuoteDeliveryStatus.SENT,
              sentAt: new Date(),
              providerMessageId: result.messageId || null
            }
          }),
          prisma.quote.update({
            where: { id: quoteId },
            data: { status: QuoteStatus.SENT, sentAt: new Date() }
          })
        ]);

        await auditLog({
          action: "QUOTE_SENT",
          entityType: "QUOTE",
          entityId: quoteId,
          user: auth.user,
          req,
          metadata: { deliveryId: delivery.id, channel, to, providerMessageId: result.messageId, pdfHash: pdf.pdfHash }
        });

        const refreshed = await prisma.quote.findUnique({ where: { id: quoteId }, include: { items: true } });
        return NextResponse.json({ data: refreshed ? mapQuoteResponse(refreshed) : null });
      }

      await prisma.quoteDelivery.update({
        where: { id: delivery.id },
        data: { status: QuoteDeliveryStatus.PENDING_PROVIDER }
      });
      return NextResponse.json({ data: mapQuoteResponse(quote) });
    } catch (sendErr: any) {
      const message = sendErr?.message || "Error enviando cotización";
      await prisma.quoteDelivery.update({
        where: { id: delivery.id },
        data: { status: QuoteDeliveryStatus.FAILED, failedAt: new Date(), errorMessage: message }
      });
      await auditLog({
        action: "QUOTE_SEND_FAILED",
        entityType: "QUOTE",
        entityId: quoteId,
        user: auth.user,
        req,
        metadata: { deliveryId: delivery.id, channel, error: message }
      });
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo enviar la cotizacion" }, { status: 400 });
  }
}
