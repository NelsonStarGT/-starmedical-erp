import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processRecurrenteWebhook, verifyRecurrenteWebhookTokenOrHmac } from "@/lib/memberships/service";
import { recurrenteWebhookSchema } from "@/lib/memberships/schemas";
import { handleMembershipApiError } from "@/app/api/memberships/_utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let raw = "";
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const gateway = await prisma.membershipGatewayConfig.findUnique({ where: { id: 1 } }).catch(() => null);
  const authorized = verifyRecurrenteWebhookTokenOrHmac(req, raw, gateway?.webhookSecret ?? null);
  if (!authorized) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const json = raw ? JSON.parse(raw) : {};
    const payload = recurrenteWebhookSchema.parse(json);
    const data = await processRecurrenteWebhook(payload, req.headers.get("x-recurrente-signature"));
    return NextResponse.json({ data });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}
