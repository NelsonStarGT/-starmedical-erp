import { NextRequest, NextResponse } from "next/server";
import { MailModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureAdmin } from "@/lib/api/admin";
import { encryptSecret } from "@/lib/security/crypto";

export const dynamic = "force-dynamic";

const MODULE_KEYS = Object.values(MailModuleKey);

function normalizeModuleKey(raw: any): MailModuleKey {
  const key = String(raw || "").toUpperCase();
  if (MODULE_KEYS.includes(key as MailModuleKey)) return key as MailModuleKey;
  throw new Error("moduleKey inválido");
}

function serializeAccount(account: any) {
  return {
    id: account.id,
    moduleKey: account.moduleKey,
    email: account.email,
    username: account.username,
    fromName: account.fromName,
    fromEmail: account.fromEmail,
    isEnabled: account.isEnabled,
    lastTestAt: account.lastTestAt,
    lastTestError: account.lastTestError,
    passwordSet: Boolean(account.passwordEnc)
  };
}

export async function PATCH(req: NextRequest, { params }: { params: { moduleKey: string } }) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const moduleKey = normalizeModuleKey(params.moduleKey);
    const account = await prisma.mailModuleAccount.findUnique({ where: { moduleKey } });
    if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    const email = body.email ? String(body.email).trim() : account.email;
    const username = body.username ? String(body.username).trim() : account.username;
    if (!email) return NextResponse.json({ error: "email requerido" }, { status: 400 });
    if (!username) return NextResponse.json({ error: "username requerido" }, { status: 400 });

    const data: any = {
      email,
      username,
      fromName: body.fromName ?? account.fromName,
      fromEmail: body.fromEmail ?? account.fromEmail,
      isEnabled: body.isEnabled ?? account.isEnabled
    };

    if (body.password) {
      data.passwordEnc = encryptSecret(String(body.password));
    }

    const saved = await prisma.mailModuleAccount.update({ where: { moduleKey }, data });
    return NextResponse.json({ data: serializeAccount(saved) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo actualizar la cuenta" }, { status: 400 });
  }
}
