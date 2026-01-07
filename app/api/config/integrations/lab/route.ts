import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin } from "@/lib/api/admin";
import { encryptSecret } from "@/lib/security/crypto";

export const dynamic = "force-dynamic";

function serialize(record: any) {
  if (!record) return null;
  return {
    id: record.id,
    provider: record.provider,
    apiUrl: record.apiUrl,
    enabled: record.enabled,
    lastTestAt: record.lastTestAt,
    lastTestError: record.lastTestError,
    apiKeySet: Boolean(record.apiKeyEnc)
  };
}

export async function GET(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const data = await prisma.labIntegrationConfig.findFirst({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json({ data: serialize(data) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo obtener integración de laboratorio" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const provider = String(body.provider || "").trim();
    if (!provider) return NextResponse.json({ error: "provider requerido" }, { status: 400 });

    const data: any = {
      provider,
      apiUrl: body.apiUrl || null,
      enabled: body.enabled !== false
    };
    if (body.apiKey) {
      data.apiKeyEnc = encryptSecret(String(body.apiKey));
    }

    const existing = await prisma.labIntegrationConfig.findFirst();
    const saved = existing
      ? await prisma.labIntegrationConfig.update({ where: { id: existing.id }, data })
      : await prisma.labIntegrationConfig.create({ data });

    return NextResponse.json({ data: serialize(saved) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo guardar integración de laboratorio" }, { status: 400 });
  }
}
