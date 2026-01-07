import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin } from "@/lib/api/admin";
import { normalizeKey, serializeConfig } from "../../utils";

export const dynamic = "force-dynamic";

async function fetchWithTimeout(url: string, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} al consultar ${url}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function testBaseUrl(baseUrl: string) {
  const attempts = [new URL("/health", baseUrl).toString(), baseUrl];
  let lastError: any = null;
  for (const url of attempts) {
    try {
      await fetchWithTimeout(url);
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("No se pudo contactar el endpoint");
}

export async function POST(req: NextRequest, { params }: { params: { key: string } }) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const key = normalizeKey(params.key);
    const record = await prisma.apiIntegrationConfig.findUnique({ where: { key } });
    if (!record) return NextResponse.json({ error: "Integración no encontrada" }, { status: 404 });

    let lastTestError: string | null = null;

    if (record.baseUrl) {
      try {
        await testBaseUrl(record.baseUrl);
      } catch (err: any) {
        lastTestError = err?.message || "Fallo de conexión";
      }
    } else {
      const hasCreds = Boolean(record.apiKeyEnc || record.apiSecretEnc || record.tokenEnc);
      if (!hasCreds) {
        lastTestError = "Configura baseUrl o credenciales para probar";
      }
    }

    const updated = await prisma.apiIntegrationConfig.update({
      where: { key },
      data: { lastTestAt: new Date(), lastTestError }
    });

    return NextResponse.json({ ok: !lastTestError, data: serializeConfig(updated) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo probar integración" }, { status: 400 });
  }
}
