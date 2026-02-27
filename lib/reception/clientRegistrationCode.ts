import { ClientProfileType, Prisma } from "@prisma/client";
import { formatClientCode, resolveClientCodePrefix } from "@/lib/clients/clientCode";
import { normalizeTenantId } from "@/lib/tenant";

function toInt(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.floor(parsed);
  }
  return null;
}

export async function reserveNextClientRegistrationCodeTx(
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
    INSERT INTO "ClientRegistrationSequenceCounter"
      ("tenantId", "clientType", "prefix", "nextNumber", "createdAt", "updatedAt")
    VALUES
      (${tenantId}, ${input.clientType}, ${prefix}, 2, NOW(), NOW())
    ON CONFLICT ("tenantId", "clientType")
    DO UPDATE SET
      "nextNumber" = "ClientRegistrationSequenceCounter"."nextNumber" + 1,
      "prefix" = EXCLUDED."prefix",
      "updatedAt" = NOW()
    RETURNING "prefix", "nextNumber";
  `);

  const row = rows[0];
  if (!row) {
    throw new Error("No se pudo reservar correlativo provisional.");
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
