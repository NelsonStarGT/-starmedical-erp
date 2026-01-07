import { NextRequest, NextResponse } from "next/server";
import { MailModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureAdmin } from "@/lib/api/admin";
import { sendMail } from "@/lib/email/mailer";

export const dynamic = "force-dynamic";

const MODULE_KEYS = Object.values(MailModuleKey);

function normalizeModuleKey(raw: any): MailModuleKey {
  const key = String(raw || "").toUpperCase();
  if (MODULE_KEYS.includes(key as MailModuleKey)) return key as MailModuleKey;
  throw new Error("moduleKey inválido");
}

export async function POST(req: NextRequest, { params }: { params: { moduleKey: string } }) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  const moduleKey = normalizeModuleKey(params.moduleKey);
  try {
    const account = await prisma.mailModuleAccount.findUnique({ where: { moduleKey } });
    if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    const body = await req.json();
    const toEmail = String(body.to || body.toEmail || "").trim();
    if (!toEmail || !toEmail.includes("@")) {
      return NextResponse.json({ error: "to requerido" }, { status: 400 });
    }

    await sendMail({
      moduleKey,
      to: toEmail,
      subject: `Prueba correo módulo ${moduleKey}`,
      text: "Correo de prueba desde configuración central"
    });

    await prisma.mailModuleAccount.update({
      where: { moduleKey },
      data: { lastTestAt: new Date(), lastTestError: null }
    });

    return NextResponse.json({ sent: true });
  } catch (err: any) {
    const message = err?.message || "No se pudo enviar la prueba";
    await prisma.mailModuleAccount.update({
      where: { moduleKey },
      data: { lastTestAt: new Date(), lastTestError: message }
    }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
