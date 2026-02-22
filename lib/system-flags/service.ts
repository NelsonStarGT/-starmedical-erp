import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { isPrismaSchemaMismatchError } from "@/lib/config-central/errors";

const systemFeatureFlagsSchema = z
  .object({
    portal: z
      .object({
        enabled: z.boolean().default(true),
        strictAvailability: z.boolean().default(true)
      })
      .strict(),
    sat: z
      .object({
        requireActiveSeries: z.boolean().default(true)
      })
      .strict(),
    branches: z
      .object({
        preventDeactivateWithFutureAppointments: z.boolean().default(true)
      })
      .strict(),
    theme: z
      .object({
        requireValidHex: z.boolean().default(true)
      })
      .strict(),
    reception: z
      .object({
        forceBranchSelection: z.boolean().default(true)
      })
      .strict()
  })
  .strict();

const systemFeatureFlagsPatchSchema = z
  .object({
    portal: z
      .object({
        enabled: z.boolean().optional(),
        strictAvailability: z.boolean().optional()
      })
      .strict()
      .optional(),
    sat: z
      .object({
        requireActiveSeries: z.boolean().optional()
      })
      .strict()
      .optional(),
    branches: z
      .object({
        preventDeactivateWithFutureAppointments: z.boolean().optional()
      })
      .strict()
      .optional(),
    theme: z
      .object({
        requireValidHex: z.boolean().optional()
      })
      .strict()
      .optional(),
    reception: z
      .object({
        forceBranchSelection: z.boolean().optional()
      })
      .strict()
      .optional()
  })
  .strict();

const systemFeaturePatchSchema = z
  .object({
    strictMode: z.boolean().optional(),
    flags: systemFeatureFlagsPatchSchema.optional()
  })
  .strict();

const SYSTEM_FEATURE_ROW_SELECT = {
  id: true,
  version: true,
  flags: true,
  strictMode: true,
  updatedByUserId: true,
  updatedAt: true
} as const;

type SystemFeatureRow = {
  id: string;
  version: number;
  flags: Prisma.JsonValue;
  strictMode: boolean;
  updatedByUserId: string | null;
  updatedAt: Date;
};

type SystemFeatureCreateData = {
  id: string;
  version: number;
  flags: Prisma.InputJsonValue;
  strictMode: boolean;
  updatedByUserId: string | null;
};

const warnedFallbackContexts = new Set<string>();

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function warnDevSystemFeatureFallback(context: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (warnedFallbackContexts.has(context)) return;
  warnedFallbackContexts.add(context);
  console.warn(
    `[DEV][system-flags] ${context}: fallback por esquema legacy. ` +
      `Ejecuta migraciones + prisma generate. Details: ${toErrorMessage(error)}`
  );
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function getSystemFeatureConfigDelegate() {
  return (prisma as unknown as {
    systemFeatureConfig?: {
      findUnique?: (args: {
        where: { id: string };
        select: typeof SYSTEM_FEATURE_ROW_SELECT;
      }) => Promise<SystemFeatureRow | null>;
      upsert?: (args: {
        where: { id: string };
        update: Record<string, never>;
        create: SystemFeatureCreateData;
        select: typeof SYSTEM_FEATURE_ROW_SELECT;
      }) => Promise<SystemFeatureRow>;
      update?: (args: {
        where: { id: string };
        data: {
          version: { increment: number };
          flags: Prisma.InputJsonValue;
          strictMode: boolean;
          updatedByUserId: string | null;
          updatedAt: Date;
        };
        select: typeof SYSTEM_FEATURE_ROW_SELECT;
      }) => Promise<SystemFeatureRow>;
    };
  }).systemFeatureConfig;
}

export type SystemFeatureFlags = z.infer<typeof systemFeatureFlagsSchema>;
export type SystemFeatureFlagsPatch = z.infer<typeof systemFeatureFlagsPatchSchema>;
export type SystemFeatureConfigPatch = z.infer<typeof systemFeaturePatchSchema>;

export type SystemFeatureConfigSnapshot = {
  id: "global";
  version: number;
  flags: SystemFeatureFlags;
  strictMode: boolean;
  updatedByUserId: string | null;
  updatedAt: string | null;
  source: "db" | "defaults";
};

export const SYSTEM_FEATURE_DEFAULT_FLAGS: SystemFeatureFlags = {
  portal: {
    enabled: true,
    strictAvailability: true
  },
  sat: {
    requireActiveSeries: true
  },
  branches: {
    preventDeactivateWithFutureAppointments: true
  },
  theme: {
    requireValidHex: true
  },
  reception: {
    forceBranchSelection: true
  }
};

export function buildSystemFeatureConfigDefaults(): SystemFeatureConfigSnapshot {
  return {
    id: "global",
    version: 1,
    flags: {
      portal: { ...SYSTEM_FEATURE_DEFAULT_FLAGS.portal },
      sat: { ...SYSTEM_FEATURE_DEFAULT_FLAGS.sat },
      branches: { ...SYSTEM_FEATURE_DEFAULT_FLAGS.branches },
      theme: { ...SYSTEM_FEATURE_DEFAULT_FLAGS.theme },
      reception: { ...SYSTEM_FEATURE_DEFAULT_FLAGS.reception }
    },
    strictMode: false,
    updatedByUserId: null,
    updatedAt: null,
    source: "defaults"
  };
}

function rowToSnapshot(row: SystemFeatureRow): SystemFeatureConfigSnapshot {
  const defaults = buildSystemFeatureConfigDefaults();
  const parsedFlags = systemFeatureFlagsSchema.safeParse(row.flags);
  return {
    id: "global",
    version: row.version,
    flags: parsedFlags.success ? parsedFlags.data : defaults.flags,
    strictMode: row.strictMode,
    updatedByUserId: row.updatedByUserId || null,
    updatedAt: row.updatedAt?.toISOString?.() ?? null,
    source: "db"
  };
}

function snapshotToCreateInput(snapshot: SystemFeatureConfigSnapshot): SystemFeatureCreateData {
  return {
    id: "global",
    version: snapshot.version,
    flags: asJson(snapshot.flags),
    strictMode: snapshot.strictMode,
    updatedByUserId: snapshot.updatedByUserId
  };
}

function mergeSystemFeatureFlags(base: SystemFeatureFlags, patch?: SystemFeatureFlagsPatch): SystemFeatureFlags {
  if (!patch) return base;
  return {
    portal: {
      ...base.portal,
      ...(patch.portal || {})
    },
    sat: {
      ...base.sat,
      ...(patch.sat || {})
    },
    branches: {
      ...base.branches,
      ...(patch.branches || {})
    },
    theme: {
      ...base.theme,
      ...(patch.theme || {})
    },
    reception: {
      ...base.reception,
      ...(patch.reception || {})
    }
  };
}

function readFlagByPath(flags: SystemFeatureFlags, path: string): unknown {
  const chunks = path
    .split(".")
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  if (!chunks.length) return undefined;

  let cursor: unknown = flags;
  for (const chunk of chunks) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[chunk];
  }
  return cursor;
}

export class SystemFeatureConfigConflictError extends Error {
  readonly currentVersion: number;

  constructor(currentVersion: number) {
    super("System feature config version conflict");
    this.name = "SystemFeatureConfigConflictError";
    this.currentVersion = currentVersion;
  }
}

export class SystemFeatureConfigUnavailableError extends Error {
  constructor(message = "SystemFeatureConfig no está disponible. Ejecuta migraciones y prisma generate.") {
    super(message);
    this.name = "SystemFeatureConfigUnavailableError";
  }
}

export function parseSystemFeatureConfigPatch(input: unknown): SystemFeatureConfigPatch {
  return systemFeaturePatchSchema.parse(input);
}

export async function getSystemFeatureConfig(): Promise<SystemFeatureConfigSnapshot> {
  const delegate = getSystemFeatureConfigDelegate();
  if (!delegate?.findUnique || !delegate?.upsert) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[DEV][system-flags] prisma.systemFeatureConfig delegate no disponible. Usando defaults.");
    }
    return buildSystemFeatureConfigDefaults();
  }

  try {
    const row = await delegate.findUnique({
      where: { id: "global" },
      select: SYSTEM_FEATURE_ROW_SELECT
    });

    if (!row) {
      const defaults = buildSystemFeatureConfigDefaults();
      const created = await delegate.upsert({
        where: { id: "global" },
        update: {},
        create: snapshotToCreateInput(defaults),
        select: SYSTEM_FEATURE_ROW_SELECT
      });
      return rowToSnapshot(created);
    }

    return rowToSnapshot(row);
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("config.systemFlags.get", error);
      return buildSystemFeatureConfigDefaults();
    }
    if (isPrismaSchemaMismatchError(error)) {
      warnDevSystemFeatureFallback("config.systemFlags.get", error);
      return buildSystemFeatureConfigDefaults();
    }
    throw error;
  }
}

export async function updateSystemFeatureConfig(input: {
  expectedVersion: number;
  patch: SystemFeatureConfigPatch;
  updatedByUserId?: string | null;
}) {
  const delegate = getSystemFeatureConfigDelegate();
  if (!delegate?.upsert || !delegate?.update) {
    throw new SystemFeatureConfigUnavailableError();
  }

  return prisma.$transaction(async (tx) => {
    const txClient = tx as unknown as {
      systemFeatureConfig?: {
        upsert?: (args: {
          where: { id: string };
          update: Record<string, never>;
          create: SystemFeatureCreateData;
          select: typeof SYSTEM_FEATURE_ROW_SELECT;
        }) => Promise<SystemFeatureRow>;
        update?: (args: {
          where: { id: string };
          data: {
            version: { increment: number };
            flags: Prisma.InputJsonValue;
            strictMode: boolean;
            updatedByUserId: string | null;
            updatedAt: Date;
          };
          select: typeof SYSTEM_FEATURE_ROW_SELECT;
        }) => Promise<SystemFeatureRow>;
      };
    };

    const txDelegate = txClient.systemFeatureConfig;
    if (!txDelegate?.upsert || !txDelegate?.update) {
      throw new SystemFeatureConfigUnavailableError();
    }

    const defaults = buildSystemFeatureConfigDefaults();
    const ensured = await txDelegate.upsert({
      where: { id: "global" },
      update: {},
      create: snapshotToCreateInput(defaults),
      select: SYSTEM_FEATURE_ROW_SELECT
    });

    if (ensured.version !== input.expectedVersion) {
      throw new SystemFeatureConfigConflictError(ensured.version);
    }

    const current = rowToSnapshot(ensured);
    const mergedFlags = mergeSystemFeatureFlags(current.flags, input.patch.flags);
    const strictMode = typeof input.patch.strictMode === "boolean" ? input.patch.strictMode : current.strictMode;

    const updated = await txDelegate.update({
      where: { id: "global" },
      data: {
        version: { increment: 1 },
        flags: asJson(mergedFlags),
        strictMode,
        updatedByUserId: input.updatedByUserId ?? null,
        updatedAt: new Date()
      },
      select: SYSTEM_FEATURE_ROW_SELECT
    });

    return rowToSnapshot(updated);
  });
}

export function isFlagEnabledFromSnapshot(snapshot: SystemFeatureConfigSnapshot, path: string): boolean {
  const currentValue = readFlagByPath(snapshot.flags, path);
  if (typeof currentValue === "boolean") return currentValue;
  const fallbackValue = readFlagByPath(SYSTEM_FEATURE_DEFAULT_FLAGS, path);
  return typeof fallbackValue === "boolean" ? fallbackValue : false;
}

export async function isFlagEnabled(path: string, snapshot?: SystemFeatureConfigSnapshot): Promise<boolean> {
  const config = snapshot ?? (await getSystemFeatureConfig());
  return isFlagEnabledFromSnapshot(config, path);
}

export async function isStrictMode(snapshot?: SystemFeatureConfigSnapshot): Promise<boolean> {
  if (snapshot) return snapshot.strictMode;
  const config = await getSystemFeatureConfig();
  return config.strictMode;
}
