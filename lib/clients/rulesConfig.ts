import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";

export type ClientRulesConfigSnapshot = {
  alertDays30: number;
  alertDays15: number;
  alertDays7: number;
  healthProfileWeight: number;
  healthDocsWeight: number;
};

const DEFAULT_RULES_CONFIG: ClientRulesConfigSnapshot = {
  alertDays30: 30,
  alertDays15: 15,
  alertDays7: 7,
  healthProfileWeight: 70,
  healthDocsWeight: 30
};

const warnedLegacyContexts = new Set<string>();

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function readInt(record: Record<string, unknown> | null, key: string, fallback: number) {
  if (!record) return fallback;
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.floor(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isPrismaUnknownFieldError(error: unknown, fieldName?: string) {
  const message = toErrorMessage(error).toLowerCase();
  if (!message.includes("unknown field")) return false;
  if (!fieldName) return true;
  return message.includes(fieldName.toLowerCase());
}

function isPrismaMissingColumnError(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (code === "P2022") return true;
  }

  const message = toErrorMessage(error).toLowerCase();
  return message.includes("column") && message.includes("does not exist");
}

export function isRulesConfigWeightsUnavailableError(error: unknown) {
  return (
    isPrismaUnknownFieldError(error, "healthProfileWeight") ||
    isPrismaUnknownFieldError(error, "healthDocsWeight") ||
    isPrismaMissingColumnError(error)
  );
}

export function warnDevRulesConfigWeightsUnavailable(context: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  const dedupeKey = `${context}:weights-unavailable`;
  if (warnedLegacyContexts.has(dedupeKey)) return;
  warnedLegacyContexts.add(dedupeKey);

  console.warn(
    `[DEV][db] ${context}: ClientRulesConfig legacy mode (health weights unavailable). ` +
      "Apply migration and regenerate Prisma client. " +
      `Details: ${toErrorMessage(error)}`
  );
}

function normalizeRulesConfig(record: Record<string, unknown> | null): ClientRulesConfigSnapshot {
  return {
    alertDays30: clamp(readInt(record, "alertDays30", DEFAULT_RULES_CONFIG.alertDays30), 1, 365),
    alertDays15: clamp(readInt(record, "alertDays15", DEFAULT_RULES_CONFIG.alertDays15), 1, 365),
    alertDays7: clamp(readInt(record, "alertDays7", DEFAULT_RULES_CONFIG.alertDays7), 1, 365),
    healthProfileWeight: clamp(readInt(record, "healthProfileWeight", DEFAULT_RULES_CONFIG.healthProfileWeight), 5, 95),
    healthDocsWeight: clamp(readInt(record, "healthDocsWeight", DEFAULT_RULES_CONFIG.healthDocsWeight), 5, 95)
  };
}

async function findUniqueExtended() {
  const delegate = (prisma as unknown as {
    clientRulesConfig?: { findUnique?: (args: Prisma.ClientRulesConfigFindUniqueArgs) => Promise<unknown> };
  }).clientRulesConfig;

  if (!delegate?.findUnique) return null;

  return delegate.findUnique({
    where: { id: "global" },
    select: {
      alertDays30: true,
      alertDays15: true,
      alertDays7: true,
      healthProfileWeight: true,
      healthDocsWeight: true
    }
  } as Prisma.ClientRulesConfigFindUniqueArgs);
}

async function findUniqueLegacy() {
  const delegate = (prisma as unknown as {
    clientRulesConfig?: { findUnique?: (args: Prisma.ClientRulesConfigFindUniqueArgs) => Promise<unknown> };
  }).clientRulesConfig;

  if (!delegate?.findUnique) return null;

  return delegate.findUnique({
    where: { id: "global" },
    select: {
      alertDays30: true,
      alertDays15: true,
      alertDays7: true
    }
  } as Prisma.ClientRulesConfigFindUniqueArgs);
}

export async function safeGetClientRulesConfig(context: string): Promise<ClientRulesConfigSnapshot> {
  try {
    const raw = await findUniqueExtended();
    if (!raw || typeof raw !== "object") return { ...DEFAULT_RULES_CONFIG };
    return normalizeRulesConfig(raw as Record<string, unknown>);
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable(`${context}.clientRulesConfig.findUnique`, error);
      return { ...DEFAULT_RULES_CONFIG };
    }

    if (!isRulesConfigWeightsUnavailableError(error)) {
      throw error;
    }

    warnDevRulesConfigWeightsUnavailable(`${context}.clientRulesConfig.findUnique`, error);

    try {
      const legacyRaw = await findUniqueLegacy();
      if (!legacyRaw || typeof legacyRaw !== "object") return { ...DEFAULT_RULES_CONFIG };
      return normalizeRulesConfig(legacyRaw as Record<string, unknown>);
    } catch (legacyError) {
      if (isPrismaMissingTableError(legacyError)) {
        warnDevMissingTable(`${context}.clientRulesConfig.findUnique.legacy`, legacyError);
        return { ...DEFAULT_RULES_CONFIG };
      }
      throw legacyError;
    }
  }
}
