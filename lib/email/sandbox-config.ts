import { Prisma } from "@prisma/client";
import { isCentralConfigCompatError } from "@/lib/config-central/errors";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError } from "@/lib/prisma/errors";

export type TenantMailMode = "inherit" | "override";

export type EmailSandboxSettingsSnapshot = {
  id: "global";
  enabled: boolean;
  modeDefault: TenantMailMode;
  tenantModes: Record<string, TenantMailMode>;
  mailpitHost: string;
  mailpitSmtpPort: number;
  mailpitApiPort: number;
  aliasDomain: string;
  retentionDays: number;
  blockPhi: boolean;
  updatedByUserId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  source: "db" | "defaults";
};

type EmailSandboxConfigRecord = {
  id: string;
  enabled: boolean;
  modeDefault: string;
  tenantModes: Prisma.JsonValue | null;
  mailpitHost: string;
  mailpitSmtpPort: number;
  mailpitApiPort: number;
  aliasDomain: string;
  retentionDays: number;
  blockPhi: boolean;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type EmailSandboxConfigDelegate = {
  findUnique: (args: { where: { id: string } }) => Promise<EmailSandboxConfigRecord | null>;
  upsert: (args: {
    where: { id: string };
    update: {
      enabled: boolean;
      modeDefault: string;
      tenantModes: Prisma.InputJsonValue;
      mailpitHost: string;
      mailpitSmtpPort: number;
      mailpitApiPort: number;
      aliasDomain: string;
      retentionDays: number;
      blockPhi: boolean;
      updatedByUserId: string | null;
    };
    create: {
      id: string;
      enabled: boolean;
      modeDefault: string;
      tenantModes: Prisma.InputJsonValue;
      mailpitHost: string;
      mailpitSmtpPort: number;
      mailpitApiPort: number;
      aliasDomain: string;
      retentionDays: number;
      blockPhi: boolean;
      updatedByUserId: string | null;
    };
  }) => Promise<EmailSandboxConfigRecord>;
};

const CACHE_TTL_MS = 60_000;
let cachedSettings: { data: EmailSandboxSettingsSnapshot; cachedAt: number } | null = null;

const DEFAULTS: EmailSandboxSettingsSnapshot = {
  id: "global",
  enabled: false,
  modeDefault: "inherit",
  tenantModes: {},
  mailpitHost: "127.0.0.1",
  mailpitSmtpPort: 1025,
  mailpitApiPort: 8025,
  aliasDomain: "sandbox.starmedical.test",
  retentionDays: 3,
  blockPhi: true,
  updatedByUserId: null,
  createdAt: null,
  updatedAt: null,
  source: "defaults"
};

export class EmailSandboxConfigUnavailableError extends Error {
  constructor(message = "EmailSandboxConfig no disponible. Ejecuta migraciones y prisma generate.") {
    super(message);
    this.name = "EmailSandboxConfigUnavailableError";
  }
}

function getEmailSandboxConfigDelegate(): EmailSandboxConfigDelegate | null {
  const prismaClient = prisma as unknown as {
    emailSandboxConfig?: EmailSandboxConfigDelegate;
  };
  return prismaClient.emailSandboxConfig ?? null;
}

function toMode(value: unknown): TenantMailMode {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "override" ? "override" : "inherit";
}

function toDbMode(value: TenantMailMode): string {
  return value === "override" ? "OVERRIDE" : "INHERIT";
}

function sanitizePort(value: unknown, fallback: number) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(num) || num <= 0 || num > 65535) return fallback;
  return num;
}

function sanitizeRetentionDays(value: unknown, fallback: number) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(num) || num < 0 || num > 365) return fallback;
  return num;
}

function sanitizeAliasDomain(value: unknown): string {
  const domain = String(value || "")
    .trim()
    .toLowerCase();
  if (!domain) return DEFAULTS.aliasDomain;
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return domain;
  return DEFAULTS.aliasDomain;
}

function normalizeTenantModes(value: unknown): Record<string, TenantMailMode> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>);
  const normalized = entries
    .map(([tenantId, mode]) => {
      const rawTenantId = String(tenantId || "").trim();
      if (!rawTenantId) return null;
      return [normalizeTenantId(rawTenantId), toMode(mode)] as const;
    })
    .filter((entry): entry is readonly [string, TenantMailMode] => Boolean(entry));
  return Object.fromEntries(normalized);
}

function rowToSnapshot(row: EmailSandboxConfigRecord): EmailSandboxSettingsSnapshot {
  return {
    id: "global",
    enabled: Boolean(row.enabled),
    modeDefault: toMode(row.modeDefault),
    tenantModes: normalizeTenantModes(row.tenantModes),
    mailpitHost: String(row.mailpitHost || DEFAULTS.mailpitHost).trim() || DEFAULTS.mailpitHost,
    mailpitSmtpPort: sanitizePort(row.mailpitSmtpPort, DEFAULTS.mailpitSmtpPort),
    mailpitApiPort: sanitizePort(row.mailpitApiPort, DEFAULTS.mailpitApiPort),
    aliasDomain: sanitizeAliasDomain(row.aliasDomain),
    retentionDays: sanitizeRetentionDays(row.retentionDays, DEFAULTS.retentionDays),
    blockPhi: row.blockPhi !== false,
    updatedByUserId: row.updatedByUserId || null,
    createdAt: row.createdAt?.toISOString?.() ?? null,
    updatedAt: row.updatedAt?.toISOString?.() ?? null,
    source: "db"
  };
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function buildUpsertData(input: {
  enabled: boolean;
  modeDefault: TenantMailMode;
  tenantModes: Record<string, TenantMailMode>;
  mailpitHost: string;
  mailpitSmtpPort: number;
  mailpitApiPort: number;
  aliasDomain: string;
  retentionDays: number;
  blockPhi: boolean;
  updatedByUserId: string | null;
}) {
  return {
    enabled: input.enabled,
    modeDefault: toDbMode(input.modeDefault),
    tenantModes: asJson(input.tenantModes),
    mailpitHost: input.mailpitHost,
    mailpitSmtpPort: input.mailpitSmtpPort,
    mailpitApiPort: input.mailpitApiPort,
    aliasDomain: input.aliasDomain,
    retentionDays: input.retentionDays,
    blockPhi: input.blockPhi,
    updatedByUserId: input.updatedByUserId
  };
}

function isUnavailableError(error: unknown) {
  return isPrismaMissingTableError(error) || isCentralConfigCompatError(error);
}

export function buildEmailSandboxDefaults(): EmailSandboxSettingsSnapshot {
  return {
    ...DEFAULTS,
    tenantModes: { ...DEFAULTS.tenantModes },
    source: "defaults"
  };
}

export function invalidateEmailSandboxSettingsCache() {
  cachedSettings = null;
}

export async function getEmailSandboxSettings(options?: {
  refresh?: boolean;
  createIfMissing?: boolean;
}): Promise<EmailSandboxSettingsSnapshot> {
  const now = Date.now();
  if (!options?.refresh && cachedSettings && now - cachedSettings.cachedAt < CACHE_TTL_MS) {
    return cachedSettings.data;
  }

  const delegate = getEmailSandboxConfigDelegate();
  if (!delegate?.findUnique || !delegate?.upsert) {
    throw new EmailSandboxConfigUnavailableError();
  }

  try {
    let row = await delegate.findUnique({ where: { id: "global" } });
    if (!row && options?.createIfMissing !== false) {
      row = await delegate.upsert({
        where: { id: "global" },
        update: buildUpsertData({
          enabled: DEFAULTS.enabled,
          modeDefault: DEFAULTS.modeDefault,
          tenantModes: DEFAULTS.tenantModes,
          mailpitHost: DEFAULTS.mailpitHost,
          mailpitSmtpPort: DEFAULTS.mailpitSmtpPort,
          mailpitApiPort: DEFAULTS.mailpitApiPort,
          aliasDomain: DEFAULTS.aliasDomain,
          retentionDays: DEFAULTS.retentionDays,
          blockPhi: DEFAULTS.blockPhi,
          updatedByUserId: null
        }),
        create: {
          id: "global",
          ...buildUpsertData({
            enabled: DEFAULTS.enabled,
            modeDefault: DEFAULTS.modeDefault,
            tenantModes: DEFAULTS.tenantModes,
            mailpitHost: DEFAULTS.mailpitHost,
            mailpitSmtpPort: DEFAULTS.mailpitSmtpPort,
            mailpitApiPort: DEFAULTS.mailpitApiPort,
            aliasDomain: DEFAULTS.aliasDomain,
            retentionDays: DEFAULTS.retentionDays,
            blockPhi: DEFAULTS.blockPhi,
            updatedByUserId: null
          })
        }
      });
    }

    const snapshot = row ? rowToSnapshot(row) : buildEmailSandboxDefaults();
    cachedSettings = { data: snapshot, cachedAt: now };
    return snapshot;
  } catch (error) {
    if (isUnavailableError(error)) {
      throw new EmailSandboxConfigUnavailableError();
    }
    throw error;
  }
}

export async function getEmailSandboxSettingsSafe() {
  try {
    return await getEmailSandboxSettings();
  } catch {
    return buildEmailSandboxDefaults();
  }
}

export async function updateEmailSandboxSettings(input: {
  enabled: boolean;
  modeDefault: TenantMailMode;
  tenantModes: Record<string, TenantMailMode>;
  mailpitHost: string;
  mailpitSmtpPort: number;
  mailpitApiPort: number;
  aliasDomain: string;
  retentionDays: number;
  blockPhi: boolean;
  updatedByUserId?: string | null;
}) {
  const delegate = getEmailSandboxConfigDelegate();
  if (!delegate?.upsert) {
    throw new EmailSandboxConfigUnavailableError();
  }

  try {
    const row = await delegate.upsert({
      where: { id: "global" },
      update: buildUpsertData({
        enabled: input.enabled,
        modeDefault: input.modeDefault,
        tenantModes: input.tenantModes,
        mailpitHost: input.mailpitHost,
        mailpitSmtpPort: input.mailpitSmtpPort,
        mailpitApiPort: input.mailpitApiPort,
        aliasDomain: input.aliasDomain,
        retentionDays: input.retentionDays,
        blockPhi: input.blockPhi,
        updatedByUserId: input.updatedByUserId ?? null
      }),
      create: {
        id: "global",
        ...buildUpsertData({
          enabled: input.enabled,
          modeDefault: input.modeDefault,
          tenantModes: input.tenantModes,
          mailpitHost: input.mailpitHost,
          mailpitSmtpPort: input.mailpitSmtpPort,
          mailpitApiPort: input.mailpitApiPort,
          aliasDomain: input.aliasDomain,
          retentionDays: input.retentionDays,
          blockPhi: input.blockPhi,
          updatedByUserId: input.updatedByUserId ?? null
        })
      }
    });
    const snapshot = rowToSnapshot(row);
    cachedSettings = { data: snapshot, cachedAt: Date.now() };
    return snapshot;
  } catch (error) {
    if (isUnavailableError(error)) {
      throw new EmailSandboxConfigUnavailableError();
    }
    throw error;
  }
}

export function normalizeTenantId(value: unknown) {
  const tenantId = String(value || "").trim();
  return tenantId || "global";
}

export function tenantSlugFromId(value: unknown) {
  const tenantId = normalizeTenantId(value).toLowerCase();
  const slug = tenantId
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "global";
}

export function normalizeSandboxEmailType(value: unknown) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return raw || "general";
}

export function resolveTenantSandboxMode(settings: EmailSandboxSettingsSnapshot, tenantId: unknown): TenantMailMode {
  const normalizedTenantId = normalizeTenantId(tenantId);
  const byTenant = settings.tenantModes[normalizedTenantId] || settings.tenantModes[tenantSlugFromId(normalizedTenantId)];
  return byTenant || settings.modeDefault;
}

export function shouldUseSandboxForTenant(settings: EmailSandboxSettingsSnapshot, tenantId: unknown) {
  if (!settings.enabled) return false;
  return resolveTenantSandboxMode(settings, tenantId) === "override";
}

export function buildMailpitApiBaseUrl(settings: EmailSandboxSettingsSnapshot) {
  return `http://${settings.mailpitHost}:${settings.mailpitApiPort}`;
}

export function buildTenantAliasAddress(params: {
  tenantId: unknown;
  aliasDomain: string;
  emailType?: unknown;
  index?: number;
}) {
  const tenantSlug = tenantSlugFromId(params.tenantId);
  const type = normalizeSandboxEmailType(params.emailType);
  const suffix = typeof params.index === "number" && params.index > 0 ? `-${params.index + 1}` : "";
  const aliasDomain = sanitizeAliasDomain(params.aliasDomain);
  return `${tenantSlug}+${type}${suffix}@${aliasDomain}`;
}

export function isProductionLikeEnvironment() {
  const nodeEnv = String(process.env.NODE_ENV || "").toLowerCase();
  const appEnv = String(process.env.APP_ENV || "").toLowerCase();
  return nodeEnv === "production" || appEnv === "production";
}

export function normalizeTenantModeMap(input: unknown): Record<string, TenantMailMode> {
  return normalizeTenantModes(input);
}
