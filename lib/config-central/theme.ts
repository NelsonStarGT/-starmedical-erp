import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, logPrismaSchemaIssue } from "@/lib/prisma/errors.server";
import {
  HEX_COLOR_REGEX,
  tenantThemePatchSchema,
  type TenantThemePatch
} from "@/lib/config-central/schemas";
import { isPrismaSchemaMismatchError } from "@/lib/config-central/errors";
import { normalizeTenantId } from "@/lib/tenant";

export type TenantThemePalette = {
  primary: string;
  accent: string;
  structure: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  ring: string;
};

export type TenantThemeSnapshot = {
  tenantId: string;
  version: number;
  theme: TenantThemePalette;
  fontHeadingKey: "montserrat" | "poppins";
  fontBodyKey: "nunito" | "inter";
  densityDefault: "compact" | "normal";
  logoUrl: string | null;
  logoAssetId: string | null;
  updatedByUserId: string | null;
  updatedAt: string | null;
  source: "db" | "defaults";
};

type TenantThemePreferenceRow = {
  tenantId: string;
  version: number;
  theme: Prisma.JsonValue;
  fontHeadingKey: string;
  fontBodyKey: string;
  densityDefault: string;
  logoUrl: string | null;
  logoAssetId: string | null;
  updatedByUserId: string | null;
  updatedAt: Date;
};

type LegacyThemeRow = {
  version: number;
  theme: Prisma.JsonValue;
  fontKey: string;
  logoUrl: string | null;
  logoAssetId: string | null;
  updatedByUserId: string | null;
  updatedAt: Date;
};

const SELECT_THEME_ROW = {
  tenantId: true,
  version: true,
  theme: true,
  fontHeadingKey: true,
  fontBodyKey: true,
  densityDefault: true,
  logoUrl: true,
  logoAssetId: true,
  updatedByUserId: true,
  updatedAt: true
} as const;

const SELECT_LEGACY_THEME_ROW = {
  version: true,
  theme: true,
  fontKey: true,
  logoUrl: true,
  logoAssetId: true,
  updatedByUserId: true,
  updatedAt: true
} as const;

const themePatchLenientSchema = z
  .object({
    theme: z
      .object({
        primary: z.string().trim().min(1).optional(),
        accent: z.string().trim().min(1).optional(),
        secondary: z.string().trim().min(1).optional(),
        structure: z.string().trim().min(1).optional(),
        bg: z.string().trim().min(1).optional(),
        surface: z.string().trim().min(1).optional(),
        text: z.string().trim().min(1).optional(),
        muted: z.string().trim().min(1).optional(),
        border: z.string().trim().min(1).optional(),
        ring: z.string().trim().min(1).optional()
      })
      .optional(),
    fontHeadingKey: z.enum(["montserrat", "poppins"]).optional(),
    fontBodyKey: z.enum(["nunito", "inter"]).optional(),
    densityDefault: z.enum(["compact", "normal"]).optional(),
    logoUrl: z.string().trim().url().nullable().optional(),
    logoAssetId: z.string().trim().min(1).nullable().optional(),
    fontKey: z.enum(["inter", "poppins", "montserrat", "nunito", "roboto"]).optional()
  })
  .strict();

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_REGEX.test(value.trim());
}

function readString(value: unknown): string | null {
  const normalized = String(value || "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeHeadingKey(value: unknown): TenantThemeSnapshot["fontHeadingKey"] {
  const normalized = readString(value)?.toLowerCase();
  return normalized === "poppins" ? "poppins" : "montserrat";
}

function normalizeBodyKey(value: unknown): TenantThemeSnapshot["fontBodyKey"] {
  const normalized = readString(value)?.toLowerCase();
  return normalized === "inter" ? "inter" : "nunito";
}

function normalizeDensity(value: unknown): TenantThemeSnapshot["densityDefault"] {
  const normalized = readString(value)?.toLowerCase();
  return normalized === "compact" ? "compact" : "normal";
}

function normalizePalette(rawTheme: unknown, defaults: TenantThemePalette): TenantThemePalette {
  if (!rawTheme || typeof rawTheme !== "object") {
    return defaults;
  }

  const raw = rawTheme as Record<string, unknown>;
  const hasNewShape =
    "structure" in raw || "muted" in raw || "border" in raw || "ring" in raw;

  if (hasNewShape) {
    return {
      primary: isHexColor(raw.primary) ? raw.primary : defaults.primary,
      accent: isHexColor(raw.accent) ? raw.accent : defaults.accent,
      structure: isHexColor(raw.structure) ? raw.structure : defaults.structure,
      bg: isHexColor(raw.bg) ? raw.bg : defaults.bg,
      surface: isHexColor(raw.surface) ? raw.surface : defaults.surface,
      text: isHexColor(raw.text) ? raw.text : defaults.text,
      muted: isHexColor(raw.muted) ? raw.muted : defaults.muted,
      border: isHexColor(raw.border) ? raw.border : defaults.border,
      ring: isHexColor(raw.ring) ? raw.ring : defaults.ring
    };
  }

  // Compatibilidad legacy: { primary, secondary, accent, bg, surface, text }
  const legacyPrimary = isHexColor(raw.primary) ? raw.primary : null;
  const legacySecondary = isHexColor(raw.secondary) ? raw.secondary : null;
  const legacyAccent = isHexColor(raw.accent) ? raw.accent : null;

  return {
    primary: legacyAccent ?? legacyPrimary ?? defaults.primary,
    accent: legacySecondary ?? legacyAccent ?? defaults.accent,
    structure: legacyPrimary ?? defaults.structure,
    bg: isHexColor(raw.bg) ? raw.bg : defaults.bg,
    surface: isHexColor(raw.surface) ? raw.surface : defaults.surface,
    text: isHexColor(raw.text) ? raw.text : defaults.text,
    muted: defaults.muted,
    border: defaults.border,
    ring: legacySecondary ?? defaults.ring
  };
}

function getPreferenceDelegate() {
  return (prisma as unknown as {
    tenantThemePreference?: {
      findUnique?: (args: {
        where: { tenantId: string };
        select: typeof SELECT_THEME_ROW;
      }) => Promise<TenantThemePreferenceRow | null>;
      upsert?: (args: {
        where: { tenantId: string };
        update: Record<string, never>;
        create: {
          tenantId: string;
          version: number;
          theme: Prisma.InputJsonValue;
          fontHeadingKey: string;
          fontBodyKey: string;
          densityDefault: string;
          logoUrl: string | null;
          logoAssetId: string | null;
          updatedByUserId: string | null;
        };
        select: typeof SELECT_THEME_ROW;
      }) => Promise<TenantThemePreferenceRow>;
      update?: (args: {
        where: { tenantId: string };
        data: {
          version: { increment: number };
          theme: Prisma.InputJsonValue;
          fontHeadingKey: string;
          fontBodyKey: string;
          densityDefault: string;
          logoUrl: string | null;
          logoAssetId: string | null;
          updatedByUserId: string | null;
          updatedAt: Date;
        };
        select: typeof SELECT_THEME_ROW;
      }) => Promise<TenantThemePreferenceRow>;
    };
  }).tenantThemePreference;
}

function getLegacyDelegate() {
  return (prisma as unknown as {
    tenantThemeConfig?: {
      findUnique?: (args: {
        where: { id: string };
        select: typeof SELECT_LEGACY_THEME_ROW;
      }) => Promise<LegacyThemeRow | null>;
    };
  }).tenantThemeConfig;
}

export function buildTenantThemeDefaults(tenantIdInput: unknown = "global"): TenantThemeSnapshot {
  const tenantId = normalizeTenantId(tenantIdInput);
  return {
    tenantId,
    version: 1,
    theme: {
      primary: "#4aa59c",
      accent: "#4aadf5",
      structure: "#2e75ba",
      bg: "#f8fafc",
      surface: "#ffffff",
      text: "#0f172a",
      muted: "#64748b",
      border: "#dbe6f0",
      ring: "#4aadf5"
    },
    fontHeadingKey: "montserrat",
    fontBodyKey: "nunito",
    densityDefault: "normal",
    logoUrl: null,
    logoAssetId: null,
    updatedByUserId: null,
    updatedAt: null,
    source: "defaults"
  };
}

function rowToSnapshot(row: TenantThemePreferenceRow): TenantThemeSnapshot {
  const defaults = buildTenantThemeDefaults(row.tenantId);
  return {
    tenantId: normalizeTenantId(row.tenantId),
    version: row.version,
    theme: normalizePalette(row.theme, defaults.theme),
    fontHeadingKey: normalizeHeadingKey(row.fontHeadingKey),
    fontBodyKey: normalizeBodyKey(row.fontBodyKey),
    densityDefault: normalizeDensity(row.densityDefault),
    logoUrl: row.logoUrl || null,
    logoAssetId: row.logoAssetId || null,
    updatedByUserId: row.updatedByUserId || null,
    updatedAt: row.updatedAt?.toISOString?.() ?? null,
    source: "db"
  };
}

function legacyRowToSnapshot(tenantId: string, row: LegacyThemeRow): TenantThemeSnapshot {
  const defaults = buildTenantThemeDefaults(tenantId);
  const palette = normalizePalette(row.theme, defaults.theme);
  const fontKey = String(row.fontKey || "").trim().toLowerCase();

  return {
    tenantId,
    version: Number.isInteger(row.version) && row.version > 0 ? row.version : defaults.version,
    theme: palette,
    fontHeadingKey: fontKey === "poppins" ? "poppins" : defaults.fontHeadingKey,
    fontBodyKey: fontKey === "inter" ? "inter" : defaults.fontBodyKey,
    densityDefault: defaults.densityDefault,
    logoUrl: row.logoUrl || null,
    logoAssetId: row.logoAssetId || null,
    updatedByUserId: row.updatedByUserId || null,
    updatedAt: row.updatedAt?.toISOString?.() ?? null,
    source: "db"
  };
}

function applyLegacyPatchCompatibility(patch: TenantThemePatch): TenantThemePatch {
  const mappedTheme = (() => {
    if (!patch.theme || typeof patch.theme !== "object") {
      return patch.theme;
    }

    const inputTheme = patch.theme as TenantThemePatch["theme"] & { secondary?: string };
    const result: Record<string, unknown> = { ...inputTheme };

    if (typeof inputTheme.secondary === "string" && typeof inputTheme.accent === "undefined") {
      result.accent = inputTheme.secondary;
    }

    delete result.secondary;
    return result as TenantThemePatch["theme"];
  })();

  let fontHeadingKey = patch.fontHeadingKey;
  let fontBodyKey = patch.fontBodyKey;

  if (patch.fontKey && !fontHeadingKey && !fontBodyKey) {
    const legacyFont = String(patch.fontKey).toLowerCase();
    if (legacyFont === "poppins" || legacyFont === "montserrat") {
      fontHeadingKey = legacyFont;
    }
    if (legacyFont === "inter" || legacyFont === "nunito") {
      fontBodyKey = legacyFont;
    }
  }

  return {
    ...patch,
    theme: mappedTheme,
    fontHeadingKey,
    fontBodyKey
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
  const parsed = options?.allowInvalidHex
    ? themePatchLenientSchema.parse(input)
    : tenantThemePatchSchema.parse(input);

  return applyLegacyPatchCompatibility(parsed);
}

export async function getTenantThemeConfig(tenantIdInput: unknown = "global"): Promise<TenantThemeSnapshot> {
  const tenantId = normalizeTenantId(tenantIdInput);
  const defaults = buildTenantThemeDefaults(tenantId);
  const delegate = getPreferenceDelegate();

  if (!delegate?.findUnique || !delegate?.upsert) {
    return defaults;
  }

  try {
    const existing = await delegate.findUnique({
      where: { tenantId },
      select: SELECT_THEME_ROW
    });

    if (existing) {
      return rowToSnapshot(existing);
    }

    const legacyRow = await getLegacyDelegate()?.findUnique?.({
      where: { id: "global" },
      select: SELECT_LEGACY_THEME_ROW
    });

    const seed = legacyRow ? legacyRowToSnapshot(tenantId, legacyRow) : defaults;

    const created = await delegate.upsert({
      where: { tenantId },
      update: {},
      create: {
        tenantId,
        version: seed.version,
        theme: asJson(seed.theme),
        fontHeadingKey: seed.fontHeadingKey,
        fontBodyKey: seed.fontBodyKey,
        densityDefault: seed.densityDefault,
        logoUrl: seed.logoUrl,
        logoAssetId: seed.logoAssetId,
        updatedByUserId: seed.updatedByUserId
      },
      select: SELECT_THEME_ROW
    });

    return rowToSnapshot(created);
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      logPrismaSchemaIssue("config.theme.get", error);
      return defaults;
    }

    if (isPrismaSchemaMismatchError(error)) {
      return defaults;
    }

    throw error;
  }
}

export async function updateTenantThemeConfig(input: {
  tenantId?: unknown;
  expectedVersion: number;
  patch: TenantThemePatch;
  updatedByUserId?: string | null;
}) {
  const tenantId = normalizeTenantId(input.tenantId);
  const delegate = getPreferenceDelegate();
  if (!delegate?.upsert || !delegate?.update) {
    throw new ThemeConfigUnavailableError();
  }

  const current = await getTenantThemeConfig(tenantId);
  if (current.version !== input.expectedVersion) {
    throw new ThemeConfigConflictError(current.version);
  }

  const normalizedPatch = applyLegacyPatchCompatibility(input.patch);
  const nextTheme = {
    ...current.theme,
    ...(normalizedPatch.theme || {})
  };

  const row = await delegate.update({
    where: { tenantId },
    data: {
      version: { increment: 1 },
      theme: asJson(nextTheme),
      fontHeadingKey: normalizedPatch.fontHeadingKey ?? current.fontHeadingKey,
      fontBodyKey: normalizedPatch.fontBodyKey ?? current.fontBodyKey,
      densityDefault: normalizedPatch.densityDefault ?? current.densityDefault,
      logoUrl:
        typeof normalizedPatch.logoUrl === "undefined" ? current.logoUrl : normalizedPatch.logoUrl,
      logoAssetId:
        typeof normalizedPatch.logoAssetId === "undefined"
          ? current.logoAssetId
          : normalizedPatch.logoAssetId,
      updatedByUserId: input.updatedByUserId ?? null,
      updatedAt: new Date()
    },
    select: SELECT_THEME_ROW
  });

  return rowToSnapshot(row);
}
