import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin } from "@/lib/api/admin";
import { encryptSecret } from "@/lib/security/crypto";
import {
  normalizeBaseUrl,
  normalizeExtraJson,
  normalizeKey,
  normalizeName,
  serializeConfig,
  shouldPersistSecret
} from "./utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const data = await prisma.apiIntegrationConfig.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json({ data: data.map(serializeConfig) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener las integraciones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const key = normalizeKey(body.key);
    const name = normalizeName(body.name, true)!;
    const baseUrl = normalizeBaseUrl(body.baseUrl);
    const extraJson = normalizeExtraJson(body.extraJson);
    const isEnabled = body.isEnabled === true;

    const data: any = { key, name };
    if (baseUrl !== undefined) data.baseUrl = baseUrl;
    if (extraJson !== undefined) data.extraJson = extraJson;
    if (body.isEnabled !== undefined) data.isEnabled = isEnabled;

    const secretData: any = {};
    if (shouldPersistSecret(body.apiKey)) secretData.apiKeyEnc = encryptSecret(String(body.apiKey));
    if (shouldPersistSecret(body.apiSecret)) secretData.apiSecretEnc = encryptSecret(String(body.apiSecret));
    if (shouldPersistSecret(body.token)) secretData.tokenEnc = encryptSecret(String(body.token));

    const saved = await prisma.apiIntegrationConfig.upsert({
      where: { key },
      update: { ...data, ...secretData },
      create: { ...data, ...secretData }
    });

    return NextResponse.json({ data: serializeConfig(saved) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo guardar la integración" }, { status: 400 });
  }
}
