import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin } from "@/lib/api/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = ensureAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const config = await prisma.labIntegrationConfig.findFirst();
    if (!config) return NextResponse.json({ error: "Integración no configurada" }, { status: 400 });
    if (!config.apiKeyEnc) return NextResponse.json({ error: "API key no configurada" }, { status: 400 });
    await prisma.labIntegrationConfig.update({
      where: { id: config.id },
      data: { lastTestAt: new Date(), lastTestError: null }
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    const config = await prisma.labIntegrationConfig.findFirst();
    if (config) {
      await prisma.labIntegrationConfig
        .update({
          where: { id: config.id },
          data: { lastTestAt: new Date(), lastTestError: err?.message || "Fallo prueba" }
        })
        .catch(() => {});
    }
    return NextResponse.json({ error: err?.message || "No se pudo probar integración" }, { status: 400 });
  }
}
