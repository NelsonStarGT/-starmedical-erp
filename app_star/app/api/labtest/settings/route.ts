import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLabTestPermission, jsonError, jsonOk } from "@/lib/api/labtest";
import { settingsSchema } from "@/lib/labtest/schemas";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";
import { labNotReadyResponse } from "@/lib/labtest/apiGuard";

export async function GET(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:READ");
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const settings = await prisma.labTestSetting.findUnique({ where: { id: "labtest-default" } });
    return jsonOk(settings);
  } catch (err) {
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireLabTestPermission(req, "LABTEST:ADMIN");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return jsonError("Payload inválido", 400, "INVALID_BODY");
  const input = parsed.data;

  try {
    const saved = await prisma.labTestSetting.upsert({
      where: { id: "labtest-default" },
      update: {
        defaultMessage: input.defaultMessage ?? undefined,
        slaRoutineMin: input.slaRoutineMin ?? undefined,
        slaUrgentMin: input.slaUrgentMin ?? undefined,
        slaStatMin: input.slaStatMin ?? undefined,
        defaultChannel: input.defaultChannel ?? undefined,
        logsResetDaily: input.logsResetDaily ?? undefined,
        logsPrefixSpecimen: input.logsPrefixSpecimen ?? undefined,
        logsPrefixReport: input.logsPrefixReport ?? undefined,
        workbenchAutoInProcess: input.workbenchAutoInProcess ?? undefined,
        templatesPreviewMode: input.templatesPreviewMode ?? undefined,
        reportsDefaultRangeDays: input.reportsDefaultRangeDays ?? undefined,
        requireOtpForLabTest: input.requireOtpForLabTest ?? undefined,
        otpTtlMinutes: input.otpTtlMinutes ?? undefined,
        idleTimeoutMinutes: input.idleTimeoutMinutes ?? undefined
      },
      create: {
        id: "labtest-default",
        defaultMessage: input.defaultMessage || null,
        slaRoutineMin: input.slaRoutineMin ?? 720,
        slaUrgentMin: input.slaUrgentMin ?? 180,
        slaStatMin: input.slaStatMin ?? 60,
        defaultChannel: input.defaultChannel || "EMAIL",
        logsResetDaily: input.logsResetDaily ?? true,
        logsPrefixSpecimen: input.logsPrefixSpecimen ?? "LAB",
        logsPrefixReport: input.logsPrefixReport ?? "RPT",
        workbenchAutoInProcess: input.workbenchAutoInProcess ?? false,
        templatesPreviewMode: input.templatesPreviewMode ?? "HTML",
        reportsDefaultRangeDays: input.reportsDefaultRangeDays ?? 7,
        requireOtpForLabTest: input.requireOtpForLabTest ?? true,
        otpTtlMinutes: input.otpTtlMinutes ?? 10,
        idleTimeoutMinutes: input.idleTimeoutMinutes ?? 120
      }
    });
    const res = jsonOk(saved);
    if (res instanceof NextResponse) {
      const payload = JSON.stringify({
        requireOtpForLabTest: saved.requireOtpForLabTest,
        otpTtlMinutes: saved.otpTtlMinutes,
        idleTimeoutMinutes: saved.idleTimeoutMinutes
      });
      res.cookies.set({
        name: "lab-sec",
        value: payload,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24
      });
      return res;
    }
    return res;
  } catch (err) {
    if (isMissingLabTableError(err)) return labNotReadyResponse();
    throw err;
  }
}
