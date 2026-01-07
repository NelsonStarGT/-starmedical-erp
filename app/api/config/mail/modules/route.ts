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

export async function GET(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const data = await prisma.mailModuleAccount.findMany({ orderBy: { moduleKey: "asc" } });
    return NextResponse.json({ data: data.map(serializeAccount) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener las cuentas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const moduleKey = normalizeModuleKey(body.moduleKey);
    const email = String(body.email || "").trim();
    const username = String(body.username || "").trim() || email;
    const password = body.password ? String(body.password) : "";
    if (!email) return NextResponse.json({ error: "email requerido" }, { status: 400 });
    if (!username) return NextResponse.json({ error: "username requerido" }, { status: 400 });

    const baseData = {
      moduleKey,
      email,
      username,
      fromName: body.fromName || null,
      fromEmail: body.fromEmail || null,
      isEnabled: body.isEnabled !== false
    };

    const existing = await prisma.mailModuleAccount.findUnique({ where: { moduleKey } });
    if (existing) {
      const updateData: any = { ...baseData };
      if (password) {
        updateData.passwordEnc = encryptSecret(password);
      }
      const saved = await prisma.mailModuleAccount.update({
        where: { moduleKey },
        data: updateData
      });
      return NextResponse.json({ data: serializeAccount(saved) });
    }

    if (!password) return NextResponse.json({ error: "password requerido para nueva cuenta" }, { status: 400 });

    const saved = await prisma.mailModuleAccount.create({
      data: { ...baseData, passwordEnc: encryptSecret(password) }
    });
    return NextResponse.json({ data: serializeAccount(saved) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo guardar la cuenta" }, { status: 400 });
  }
}
