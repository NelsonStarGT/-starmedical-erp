import { ClientProfileType, Prisma } from "@prisma/client";
import { normalizeTenantId } from "@/lib/tenant";

export const CLIENT_CODE_PADDING = 3;

export const CLIENT_CODE_PREFIX_BY_TYPE: Readonly<Record<ClientProfileType, "C" | "E" | "I" | "A">> = {
  [ClientProfileType.PERSON]: "C",
  [ClientProfileType.COMPANY]: "E",
  [ClientProfileType.INSTITUTION]: "I",
  [ClientProfileType.INSURER]: "A"
};

function toInt(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.floor(parsed);
  }
  return null;
}

export function resolveClientCodePrefix(clientType: ClientProfileType) {
  return CLIENT_CODE_PREFIX_BY_TYPE[clientType] ?? "C";
}

export function normalizeClientCode(value?: string | null) {
  const normalized = (value ?? "").trim().toUpperCase();
  return normalized || null;
}

export function formatClientCode(prefix: string, sequence: number, minDigits = CLIENT_CODE_PADDING) {
  const safePrefix = (prefix || "C").trim().toUpperCase().slice(0, 4) || "C";
  const safeDigits = Number.isFinite(minDigits) ? Math.max(3, Math.floor(minDigits)) : CLIENT_CODE_PADDING;
  const safeSequence = Number.isFinite(sequence) ? Math.max(1, Math.floor(sequence)) : 1;
  return `${safePrefix}${String(safeSequence).padStart(safeDigits, "0")}`;
}

export function extractClientCodeSequenceNumber(code: string, prefix: string) {
  const normalizedCode = normalizeClientCode(code);
  const normalizedPrefix = (prefix || "").trim().toUpperCase();
  if (!normalizedCode || !normalizedPrefix || !normalizedCode.startsWith(normalizedPrefix)) return null;

  const suffix = normalizedCode.slice(normalizedPrefix.length);
  if (!/^\d+$/.test(suffix)) return null;

  const parsed = Number(suffix);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function assignSequentialClientCodes(input: {
  prefix: string;
  existingCodes: ReadonlyArray<string | null | undefined>;
  count: number;
  minDigits?: number;
}) {
  const prefix = (input.prefix || "C").trim().toUpperCase() || "C";
  const minDigits = Number.isFinite(input.minDigits) ? Math.max(3, Math.floor(input.minDigits!)) : CLIENT_CODE_PADDING;
  const count = Number.isFinite(input.count) ? Math.max(0, Math.floor(input.count)) : 0;
  const usedCodes = new Set<string>();
  let maxSequence = 0;

  for (const existingCodeRaw of input.existingCodes) {
    const existingCode = normalizeClientCode(existingCodeRaw);
    if (!existingCode) continue;
    usedCodes.add(existingCode);
    const sequence = extractClientCodeSequenceNumber(existingCode, prefix);
    if (sequence && sequence > maxSequence) {
      maxSequence = sequence;
    }
  }

  const codes: string[] = [];
  let nextSequence = Math.max(1, maxSequence + 1);

  while (codes.length < count) {
    const candidate = formatClientCode(prefix, nextSequence, minDigits);
    if (!usedCodes.has(candidate)) {
      usedCodes.add(candidate);
      codes.push(candidate);
    }
    nextSequence += 1;
  }

  return {
    codes,
    nextNumber: nextSequence
  };
}

export async function reserveNextClientCodeTx(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: unknown;
    clientType: ClientProfileType;
    minDigits?: number;
  }
) {
  const tenantId = normalizeTenantId(input.tenantId);
  const prefix = resolveClientCodePrefix(input.clientType);

  const rows = await tx.$queryRaw<Array<{ prefix: string; nextNumber: number | bigint | string }>>(Prisma.sql`
    INSERT INTO "ClientSequenceCounter"
      ("id", "tenantId", "clientType", "prefix", "nextNumber", "createdAt", "updatedAt")
    VALUES
      (gen_random_uuid()::text, ${tenantId}, CAST(${input.clientType} AS "ClientProfileType"), ${prefix}, 2, NOW(), NOW())
    ON CONFLICT ("tenantId", "clientType")
    DO UPDATE SET
      "nextNumber" = "ClientSequenceCounter"."nextNumber" + 1,
      "prefix" = EXCLUDED."prefix",
      "updatedAt" = NOW()
    RETURNING "prefix", "nextNumber";
  `);

  const row = rows[0];
  if (!row) {
    throw new Error("No se pudo reservar correlativo de cliente.");
  }

  const returnedPrefix = (row.prefix || prefix).trim().toUpperCase() || prefix;
  const nextNumber = toInt(row.nextNumber) ?? 2;
  const serial = Math.max(1, nextNumber - 1);

  return {
    tenantId,
    clientType: input.clientType,
    prefix: returnedPrefix,
    serial,
    nextNumber,
    code: formatClientCode(returnedPrefix, serial, input.minDigits)
  };
}
