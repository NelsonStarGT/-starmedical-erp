import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { isPrismaSchemaMismatchError } from "@/lib/config-central/errors";
import { normalizeTenantId } from "@/lib/tenant";
import {
  buildOperatingCountryDefaults,
  normalizeOperatingCountryScopes,
  type OperatingCountryDefaultsSnapshot
} from "@/lib/clients/operatingCountryDefaults";

type OperatingCountryRow = {
  tenantId: string;
  isOperatingCountryPinned: boolean;
  operatingCountryId: string | null;
  operatingCountryDefaultsScopes: Prisma.JsonValue | null;
  updatedByUserId: string | null;
  updatedAt: Date;
  operatingCountry: {
    id: string;
    iso2: string;
    name: string;
    callingCode: string | null;
    admin1Label: string | null;
    admin2Label: string | null;
    admin3Label: string | null;
  } | null;
};

const operatingCountryConfigCache = new Map<string, OperatingCountryDefaultsSnapshot>();

function toSnapshot(
  row: OperatingCountryRow,
  source: "db" | "defaults" = "db"
): OperatingCountryDefaultsSnapshot {
  return {
    tenantId: normalizeTenantId(row.tenantId),
    isOperatingCountryPinned: Boolean(row.isOperatingCountryPinned),
    operatingCountryId: row.operatingCountry?.id ?? row.operatingCountryId ?? null,
    operatingCountryCode: row.operatingCountry?.iso2 ?? null,
    operatingCountryName: row.operatingCountry?.name ?? null,
    operatingCountryCallingCode: row.operatingCountry?.callingCode ?? null,
    admin1Label: row.operatingCountry?.admin1Label ?? null,
    admin2Label: row.operatingCountry?.admin2Label ?? null,
    admin3Label: row.operatingCountry?.admin3Label ?? null,
    scopes: normalizeOperatingCountryScopes(row.operatingCountryDefaultsScopes),
    updatedByUserId: row.updatedByUserId,
    updatedAt: row.updatedAt?.toISOString?.() ?? null,
    source
  };
}

function cacheSnapshot(snapshot: OperatingCountryDefaultsSnapshot) {
  operatingCountryConfigCache.set(snapshot.tenantId, snapshot);
  return snapshot;
}

export function clearOperatingCountryDefaultsCache(tenantIdInput?: unknown) {
  if (typeof tenantIdInput === "undefined") {
    operatingCountryConfigCache.clear();
    return;
  }
  operatingCountryConfigCache.delete(normalizeTenantId(tenantIdInput));
}

export async function getOperatingCountryDefaults(
  tenantIdInput: unknown
): Promise<OperatingCountryDefaultsSnapshot> {
  const tenantId = normalizeTenantId(tenantIdInput);
  const cached = operatingCountryConfigCache.get(tenantId);
  if (cached) return cached;

  const delegate = (prisma as unknown as {
    tenantClientsConfig?: {
      findUnique?: (args: unknown) => Promise<OperatingCountryRow | null>;
    };
  }).tenantClientsConfig;

  if (!delegate?.findUnique) {
    return cacheSnapshot(buildOperatingCountryDefaults(tenantId));
  }

  try {
    const row = await delegate.findUnique({
      where: { tenantId },
      select: {
        tenantId: true,
        isOperatingCountryPinned: true,
        operatingCountryId: true,
        operatingCountryDefaultsScopes: true,
        updatedByUserId: true,
        updatedAt: true,
        operatingCountry: {
          select: {
            id: true,
            iso2: true,
            name: true,
            callingCode: true,
            admin1Label: true,
            admin2Label: true,
            admin3Label: true
          }
        }
      }
    });

    if (!row) return cacheSnapshot(buildOperatingCountryDefaults(tenantId));
    return cacheSnapshot(toSnapshot(row));
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("clients.operatingCountryDefaults.get", error);
      return cacheSnapshot(buildOperatingCountryDefaults(tenantId));
    }
    if (isPrismaSchemaMismatchError(error)) {
      return cacheSnapshot(buildOperatingCountryDefaults(tenantId));
    }
    throw error;
  }
}

export async function updateOperatingCountryDefaults(input: {
  tenantId: unknown;
  isOperatingCountryPinned: boolean;
  operatingCountryId?: string | null;
  scopes?: unknown;
  updatedByUserId?: string | null;
}): Promise<OperatingCountryDefaultsSnapshot> {
  const tenantId = normalizeTenantId(input.tenantId);

  const delegate = (prisma as unknown as {
    tenantClientsConfig?: {
      upsert?: (args: unknown) => Promise<OperatingCountryRow>;
    };
  }).tenantClientsConfig;

  if (!delegate?.upsert) {
    return buildOperatingCountryDefaults(tenantId);
  }

  const trimmedCountryId = String(input.operatingCountryId ?? "").trim();
  const operatingCountryId = trimmedCountryId || null;
  const scopes = normalizeOperatingCountryScopes(input.scopes);

  if (operatingCountryId) {
    const country = await prisma.geoCountry.findFirst({
      where: { id: operatingCountryId, isActive: true },
      select: { id: true }
    });
    if (!country) throw new Error("País operativo inválido o inactivo.");
  }

  const row = await delegate.upsert({
    where: { tenantId },
    update: {
      isOperatingCountryPinned: Boolean(input.isOperatingCountryPinned),
      operatingCountryId,
      operatingCountryDefaultsScopes: scopes as Prisma.InputJsonValue,
      updatedByUserId: input.updatedByUserId ?? null,
      updatedAt: new Date()
    },
    create: {
      tenantId,
      isOperatingCountryPinned: Boolean(input.isOperatingCountryPinned),
      operatingCountryId,
      operatingCountryDefaultsScopes: scopes as Prisma.InputJsonValue,
      updatedByUserId: input.updatedByUserId ?? null
    },
    select: {
      tenantId: true,
      isOperatingCountryPinned: true,
      operatingCountryId: true,
      operatingCountryDefaultsScopes: true,
      updatedByUserId: true,
      updatedAt: true,
      operatingCountry: {
        select: {
          id: true,
          iso2: true,
          name: true,
          callingCode: true,
          admin1Label: true,
          admin2Label: true,
          admin3Label: true
        }
      }
    }
  });

  return cacheSnapshot(toSnapshot(row));
}

