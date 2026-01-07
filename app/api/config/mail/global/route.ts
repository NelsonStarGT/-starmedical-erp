import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin } from "@/lib/api/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const data = await prisma.mailGlobalConfig.findFirst({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo obtener configuración de correo" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const smtpHost = String(body.smtpHost || "").trim();
    const imapHost = String(body.imapHost || "").trim();
    const smtpPort = Number(body.smtpPort);
    const imapPort = Number(body.imapPort);
    if (!smtpHost || Number.isNaN(smtpPort)) {
      return NextResponse.json({ error: "smtpHost y smtpPort son requeridos" }, { status: 400 });
    }
    if (!imapHost || Number.isNaN(imapPort)) {
      return NextResponse.json({ error: "imapHost y imapPort son requeridos" }, { status: 400 });
    }

    const data = {
      provider: body.provider || null,
      smtpHost,
      smtpPort,
      smtpSecure: body.smtpSecure !== false,
      imapHost,
      imapPort,
      imapSecure: body.imapSecure !== false
    };

    const existing = await prisma.mailGlobalConfig.findFirst();
    const saved = existing
      ? await prisma.mailGlobalConfig.update({ where: { id: existing.id }, data })
      : await prisma.mailGlobalConfig.create({ data });

    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo guardar configuración de correo" }, { status: 500 });
  }
}
