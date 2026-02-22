import { LabMessageChannel, LabTestSetting } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";

const defaultSettings: LabTestSetting = {
  id: "labtest-default",
  defaultMessage: "Resultados listos. Gracias por confiar en StarMedical.",
  slaRoutineMin: 720,
  slaUrgentMin: 180,
  slaStatMin: 60,
  defaultChannel: LabMessageChannel.EMAIL,
  logsResetDaily: true,
  logsPrefixSpecimen: "LAB",
  logsPrefixReport: "RPT",
  workbenchAutoInProcess: false,
  templatesPreviewMode: "HTML",
  reportsDefaultRangeDays: 7,
  requireOtpForLabTest: true,
  otpTtlMinutes: 10,
  idleTimeoutMinutes: 120,
  createdAt: new Date(),
  updatedAt: new Date()
};

export async function getLabTestSettings(): Promise<LabTestSetting> {
  try {
    const found = await prisma.labTestSetting.findUnique({ where: { id: "labtest-default" } });
    return { ...defaultSettings, ...(found || {}) };
  } catch (err) {
    if (isMissingLabTableError(err)) return defaultSettings;
    throw err;
  }
}

export function labDateKey(settings?: Pick<LabTestSetting, "logsResetDaily">, now = new Date()) {
  if (settings?.logsResetDaily === false) return "GLOBAL";
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(now);
}
