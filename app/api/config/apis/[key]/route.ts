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
} from "../utils";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { key: string } }) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const key = normalizeKey(params.key);
    const body = await req.json();

    const data: any = {};
    const name = normalizeName(body.name);
    const baseUrl = normalizeBaseUrl(body.baseUrl);
    const extraJson = normalizeExtraJson(body.extraJson);

    if (name !== undefined) data.name = name;
    if (baseUrl !== undefined) data.baseUrl = baseUrl;
    if (extraJson !== undefined) data.extraJson = extraJson;
    if (body.isEnabled !== undefined) data.isEnabled = Boolean(body.isEnabled);

    const secretData: any = {};
    if (shouldPersistSecret(body.apiKey)) secretData.apiKeyEnc = encryptSecret(String(body.apiKey));
    if (shouldPersistSecret(body.apiSecret)) secretData.apiSecretEnc = encryptSecret(String(body.apiSecret));
    if (shouldPersistSecret(body.token)) secretData.tokenEnc = encryptSecret(String(body.token));

    if (!Object.keys(data).length && !Object.keys(secretData).length) {
      return NextResponse.json({ error: "No hay cambios para aplicar" }, { status: 400 });
    }

    const saved = await prisma.apiIntegrationConfig.update({
      where: { key },
      data: { ...data, ...secretData }
    });

    return NextResponse.json({ data: serializeConfig(saved) });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Integración no encontrada" }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo actualizar la integración" }, { status: 400 });
  }
}
