import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { hrSettingsSchema } from "@/lib/hr/schemas";
import { requireRole } from "@/lib/api/hr";
import { mapPrismaError, safeJson } from "@/lib/api/http";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/security/crypto";
import { ensureEncryptionKey } from "@/lib/ai/config";

export const dynamic = "force-dynamic";

const selectFields = {
  id: true,
  currencyCode: true,
  warningWindowDays: true,
  warningThreshold: true,
  logoUrl: true,
  logoFileKey: true,
  attendanceEmailEnabled: true,
  attendanceAdminRecipients: true,
  photoSafetyEnabled: true,
  openaiEnabled: true,
  defaultTimezone: true,
  attendanceStartTime: true,
  attendanceLateToleranceMinutes: true,
  openaiApiKeyEnc: true
} satisfies Prisma.HrSettingsSelect;

function serialize(settings: Prisma.HrSettingsGetPayload<{ select: typeof selectFields }>) {
  const { openaiApiKeyEnc, ...rest } = settings;
  return { ...rest, openaiApiKeySet: Boolean(openaiApiKeyEnc) };
}

async function ensureSettings() {
  const existing = await prisma.hrSettings.findUnique({ where: { id: 1 }, select: selectFields });
  if (existing) return existing;
  return prisma.hrSettings.create({ data: { id: 1 }, select: selectFields });
}

function handleError(err: any) {
  if (err?.status && err?.body) {
    return NextResponse.json({ ok: false, error: { code: err.body.code || "ERROR", message: err.body.error } }, { status: err.status });
  }
  const mapped = mapPrismaError(err);
  return NextResponse.json({ ok: false, error: { code: mapped.body.code || "ERROR", message: mapped.body.error } }, { status: mapped.status });
}

export async function GET(req: NextRequest) {
  const auth = requireRole(req, [], "HR:SETTINGS:READ");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const settings = await ensureSettings();
    return NextResponse.json({ ok: true, data: serialize(settings) });
  } catch (err: any) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireRole(req, [], "HR:SETTINGS:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await safeJson(req);
  const parsed = hrSettingsSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_DATA", message: "Datos inválidos", details: parsed.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  const data: Prisma.HrSettingsUncheckedUpdateInput = {};
  const payload = parsed.data;

  if (payload.currencyCode) data.currencyCode = payload.currencyCode;
  if (payload.warningWindowDays !== undefined) data.warningWindowDays = payload.warningWindowDays;
  if (payload.warningThreshold !== undefined) data.warningThreshold = payload.warningThreshold;
  if (payload.logoUrl !== undefined) data.logoUrl = payload.logoUrl || null;
  if (payload.logoFileKey !== undefined) data.logoFileKey = payload.logoFileKey || null;
  if (payload.attendanceEmailEnabled !== undefined) data.attendanceEmailEnabled = payload.attendanceEmailEnabled;
  if (payload.attendanceAdminRecipients !== undefined) data.attendanceAdminRecipients = payload.attendanceAdminRecipients;
  if (payload.photoSafetyEnabled !== undefined) data.photoSafetyEnabled = payload.photoSafetyEnabled;
  if (payload.openaiEnabled !== undefined) data.openaiEnabled = payload.openaiEnabled;
  if (payload.defaultTimezone) data.defaultTimezone = payload.defaultTimezone;
  if (payload.attendanceStartTime) data.attendanceStartTime = payload.attendanceStartTime;
  if (payload.attendanceLateToleranceMinutes !== undefined) data.attendanceLateToleranceMinutes = payload.attendanceLateToleranceMinutes;
  if (payload.openaiApiKey) {
    try {
      ensureEncryptionKey();
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: { code: err?.body?.code || "MISSING_ENCRYPTION_KEY", message: err?.body?.error || "APP_ENCRYPTION_KEY requerida" } }, { status: err?.status || 400 });
    }
    data.openaiApiKeyEnc = encryptSecret(payload.openaiApiKey);
  }

  try {
    const updated = await prisma.hrSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...(data as any) },
      select: selectFields
    });
    return NextResponse.json({ ok: true, data: serialize(updated) });
  } catch (err: any) {
    return handleError(err);
  }
}
