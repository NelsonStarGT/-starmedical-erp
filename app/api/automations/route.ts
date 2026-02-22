import { NextRequest, NextResponse } from "next/server";
import { automationCreateSchema } from "@/lib/automations/schemas";
import { mapPrismaError, safeJson } from "@/lib/api/http";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function handleError(err: any) {
  if (err?.status && err?.body) {
    return NextResponse.json({ ok: false, error: { code: err.body.code || "ERROR", message: err.body.error } }, { status: err.status });
  }
  const mapped = mapPrismaError(err);
  return NextResponse.json({ ok: false, error: { code: mapped.body.code || "ERROR", message: mapped.body.error } }, { status: mapped.status });
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const automations = await prisma.automation.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ ok: true, data: automations });
  } catch (err: any) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await safeJson(req);
  const parsed = automationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_DATA", message: "Datos inválidos", details: parsed.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  try {
    const saved = await prisma.automation.create({
      data: {
        name: parsed.data.name,
        moduleKey: parsed.data.moduleKey,
        triggerType: parsed.data.triggerType,
        configJson: parsed.data.configJson || {},
        isEnabled: parsed.data.isEnabled ?? false
      }
    });
    return NextResponse.json({ ok: true, data: saved }, { status: 201 });
  } catch (err: any) {
    return handleError(err);
  }
}
