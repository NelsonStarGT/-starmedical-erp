import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { tenantThemePatchSchema, type TenantThemePatch } from "@/lib/config-central/schemas";

export type TenantThemePalette = {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  surface: string;
  text: string;
};

export type TenantThemeSnapshot = {
  id: "global";
  version: number;
  theme: TenantThemePalette;
  fontKey: "inter" | "poppins" | "montserrat" | "nunito" | "roboto";
  logoUrl: string | null;
  logoAssetId: string | null;
  updatedByUserId: string | null;
  updatedAt: string | null;
  source: "db" | "defaults";
};

type TenantThemeRow = {
  id: string;
  version: number;
  theme: Prisma.JsonValue;
  fontKey: string;
  logoUrl: string | null;
  logoAssetId: string | null;
  updatedByUserId: string | null;
  updatedAt: Date;
};

const SELECT_THEME_ROW = {
  id: true,
  version: true,
  theme: true,
  fontKey: true,
  logoUrl: true,
  logoAssetId: true,
  updatedByUserId: true,
  updatedAt: true
} as const;

const warnedContexts = new Set<string>();

const tenantThemePatchLenientSchema = z
  .object({
    theme: z
      .object({
        primary: z.string().trim().min(1),
        secondary: z.string().trim().min(1),
        accent: z.string().trim().min(1),
        bg: z.string().trim().min(1),
        surface: z.string().trim().min(1),
        text: z.string().trim().min(1)
      })
      .optional(),
    fontKey: z.enum(["inter", "poppins", "montserrat", "nunito", "roboto"]).optional(),
    logoUrl: z.string().trim().url().nullable().optional(),
    logoAssetId: z.string().trim().min(1).nullable().optional()
  })
  .strict();

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isPrismaSchemaMismatchError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (code === "P2022") return true;
  }

  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes("unknown field") ||
    message.includes("unknown argument") ||
    message.includes("unknown arg") ||
    (message.includes("column") && message.includes("does not exist"))
  );
}

function warnDevThemeFallback(context: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (warnedContexts.has(context)) return;
  warnedContexts.add(context);
  console.warn(
    `[DEV][config.theme] ${context}: fallback por esquema legacy. ` +
      `Ejecuta migraciones + prisma generate. Details: ${toErrorMessage(error)}`
  );
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function getTenantThemeDelegate() {
  return (prisma as unknown as {
    tenantThemeConfig?: {
      findUnique?: (args: {
        where: { id: string };
        select: typeof SELECT_THEME_ROW;
      }) => Promise<TenantThemeRow | null>;
      upsert?: (args: {
        where: { id: string };
        update: Record<string, never>;
        create: {
          id: string;
          version: number;
          theme: Prisma.InputJsonValue;
          fontKey: string;
          logoUrl: string | null;
          logoAssetId: string | null;
          updatedByUserId: string | null;
        };
        select: typeof SELECT_THEME_ROW;
      }) => Promise<TenantThemeRow>;
      update?: (args: {
        where: { id: string };
        data: {
          version: { increment: number };
          theme: Prisma.InputJsonValue;
          fontKey: string;
          logoUrl: string | null;
          logoAssetId: string | null;
          updatedByUserId: string | null;
          updatedAt: Date;
        };
        select: typeof SELECT_THEME_ROW;
      }) => Promise<TenantThemeRow>;
    };
  }).tenantThemeConfig;
}

export function buildTenantThemeDefaults(): TenantThemeSnapshot {
  return {
    id: "global",
    version: 1,
    theme: {
      primary: "#2e75ba",
      secondary: "#4aadf5",
      accent: "#4aa59c",
      bg: "#f8fafc",
      surface: "#ffffff",
      text: "#0f172a"
    },
    fontKey: "inter",
    logoUrl: null,
    logoAssetId: null,
    updatedByUserId: null,
    updatedAt: null,
    source: "defaults"
  };
}

function rowToSnapshot(row: TenantThemeRow): TenantThemeSnapshot {
  const defaults = buildTenantThemeDefaults();

  const parsedTheme = (() => {
    if (!row.theme || typeof row.theme !== "object") return defaults.theme;
    const maybe = row.theme as Partial<TenantThemePalette>;
    if (!maybe.primary || !maybe.secondary || !maybe.accent || !maybe.bg || !maybe.surface || !maybe.text) {
      return defaults.theme;
    }
    return {
      primary: String(maybe.primary),
      secondary: String(maybe.secondary),
      accent: String(maybe.accent),
      bg: String(maybe.bg),
      surface: String(maybe.surface),
      text: String(maybe.text)
    };
  })();

  const fontKey = ["inter", "poppins", "montserrat", "nunito", "roboto"].includes(row.fontKey)
    ? (row.fontKey as TenantThemeSnapshot["fontKey"])
    : defaults.fontKey;

  return {
    id: "global",
    version: row.version,
    theme: parsedTheme,
    fontKey,
    logoUrl: row.logoUrl || null,
    logoAssetId: row.logoAssetId || null,
    updatedByUserId: row.updatedByUserId || null,
    updatedAt: row.updatedAt?.toISOString?.() ?? null,
    source: "db"
  };
}

export class ThemeConfigConflictError extends Error {
  readonly currentVersion: number;

  constructor(currentVersion: number) {
    super("Theme config version conflict");
    this.name = "ThemeConfigConflictError";
    this.currentVersion = currentVersion;
  }
}

export class ThemeConfigUnavailableError extends Error {
  constructor(message = "Theme config no disponible. Ejecuta migraciones y prisma generate.") {
    super(message);
    this.name = "ThemeConfigUnavailableError";
  }
}

export function parseTenantThemePatch(
  input: unknown,
  options?: {
    allowInvalidHex?: boolean;
  }
): TenantThemePatch {
  if (options?.allowInvalidHex) {
    return tenantThemePatchLenientSchema.parse(input);
  }
  return tenantThemePatchSchema.parse(input);
}

export async function getTenantThemeConfig(): Promise<TenantThemeSnapshot> {
  const delegate = getTenantThemeDelegate();
  if (!delegate?.findUnique || !delegate?.upsert) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[DEV][config.theme] prisma.tenantThemeConfig delegate no disponible. Usando defaults.");
    }
    return buildTenantThemeDefaults();
  }

  try {
    const row = await delegate.findUnique({
      where: { id: "global" },
      select: SELECT_THEME_ROW
    });

    if (!row) {
      const defaults = buildTenantThemeDefaults();
      const created = await delegate.upsert({
        where: { id: "global" },
        update: {},
        create: {
          id: "global",
          version: defaults.version,
          theme: asJson(defaults.theme),
          fontKey: defaults.fontKey,
          logoUrl: defaults.logoUrl,
          logoAssetId: defaults.logoAssetId,
          updatedByUserId: null
        },
        select: SELECT_THEME_ROW
      });
      return rowToSnapshot(created);
    }
    return rowToSnapshot(row);
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("config.theme.get", error);
      return buildTenantThemeDefaults();
    }
    if (isPrismaSchemaMismatchError(error)) {
      warnDevThemeFallback("config.theme.get", error);
      return buildTenantThemeDefaults();
    }
    throw error;
  }
}

export async function updateTenantThemeConfig(input: {
  expectedVersion: number;
  patch: TenantThemePatch;
  updatedByUserId?: string | null;
}) {
  const delegate = getTenantThemeDelegate();
  if (!delegate?.upsert || !delegate?.update) {
    throw new ThemeConfigUnavailableError();
  }

  return prisma.$transaction(async (tx) => {
    const txClient = tx as unknown as {
      tenantThemeConfig?: {
        upsert?: typeof delegate.upsert;
        update?: typeof delegate.update;
      };
      auditLog?: {
        create?: (args: {
          data: {
            action: string;
            entityType: string;
            entityId: string;
            actorUserId: string | null;
            actorRole: string | null;
            metadata: Prisma.InputJsonValue;
          };
        }) => Promise<unknown>;
      };
    };

    const txTheme = txClient.tenantThemeConfig;
    if (!txTheme?.upsert || !txTheme?.update) {
      throw new ThemeConfigUnavailableError();
    }

    const defaults = buildTenantThemeDefaults();

    const ensured = await txTheme.upsert({
      where: { id: "global" },
      update: {},
      create: {
        id: "global",
        version: defaults.version,
        theme: asJson(defaults.theme),
        fontKey: defaults.fontKey,
        logoUrl: defaults.logoUrl,
        logoAssetId: defaults.logoAssetId,
        updatedByUserId: input.updatedByUserId ?? null
      },
      select: SELECT_THEME_ROW
    });

    if (ensured.version !== input.expectedVersion) {
      throw new ThemeConfigConflictError(ensured.version);
    }

    const current = rowToSnapshot(ensured);
    const changedKeys = (Object.keys(input.patch) as Array<keyof TenantThemePatch>).filter(
      (key) => typeof input.patch[key] !== "undefined"
    );

    const updated = await txTheme.update({
      where: { id: "global" },
      data: {
        version: { increment: 1 },
        theme: asJson(input.patch.theme ?? current.theme),
        fontKey: input.patch.fontKey ?? current.fontKey,
        logoUrl: typeof input.patch.logoUrl === "undefined" ? current.logoUrl : input.patch.logoUrl,
        logoAssetId: typeof input.patch.logoAssetId === "undefined" ? current.logoAssetId : input.patch.logoAssetId,
        updatedByUserId: input.updatedByUserId ?? null,
        updatedAt: new Date()
      },
      select: SELECT_THEME_ROW
    });

    try {
      await txClient.auditLog?.create?.({
        data: {
          action: "THEME_UPDATED",
          entityType: "TenantThemeConfig",
          entityId: "global",
          actorUserId: input.updatedByUserId ?? null,
          actorRole: null,
          metadata: {
            oldVersion: ensured.version,
            newVersion: updated.version,
            changedKeys
          }
        }
      });
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        warnDevMissingTable("config.theme.audit", error);
      } else if (isPrismaSchemaMismatchError(error)) {
        warnDevThemeFallback("config.theme.audit", error);
      } else {
        throw error;
      }
    }

    return rowToSnapshot(updated);
  });
}
