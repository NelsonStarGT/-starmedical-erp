import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, logPrismaSchemaIssue } from "@/lib/prisma/errors.server";

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/;
const HOUR_MINUTE_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const portalMenuItemSchema = z.object({
  key: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(80),
  path: z.string().trim().startsWith("/").max(220),
  enabled: z.boolean().default(true),
  order: z.number().int().min(0).max(9999)
});

export const portalSupportSchema = z.object({
  phone: z.string().trim().min(1).max(40),
  whatsappUrl: z.string().trim().url().max(280),
  supportText: z.string().trim().min(1).max(500),
  hours: z.string().trim().max(120).default(""),
  showSupportCard: z.boolean().default(true)
});

export const portalAuthSchema = z.object({
  otpEnabled: z.boolean().default(true),
  magicLinkEnabled: z.boolean().default(true),
  otpLength: z.number().int().min(4).max(8).default(6),
  otpTtlMinutes: z.number().int().min(1).max(60).default(10),
  sessionAccessTtlMinutes: z.number().int().min(5).max(120).default(15),
  sessionRefreshTtlHours: z.number().int().min(1).max(24 * 14).default(24)
});

export const portalAppointmentsRulesSchema = z.object({
  startHour: z.string().trim().regex(HOUR_MINUTE_REGEX),
  endHour: z.string().trim().regex(HOUR_MINUTE_REGEX),
  slotMinutes: z.number().int().min(5).max(240).default(30),
  greenThreshold: z.number().min(0).max(1).default(0.6),
  yellowThreshold: z.number().min(0).max(1).default(0.2),
  requestLimitPerDay: z.number().int().min(1).max(200).default(10)
}).superRefine((value, ctx) => {
  const [startHour, startMinute] = value.startHour.split(":").map((chunk) => Number(chunk));
  const [endHour, endMinute] = value.endHour.split(":").map((chunk) => Number(chunk));
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;

  if (endTotal <= startTotal) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endHour"],
      message: "endHour debe ser mayor a startHour."
    });
  }

  if (value.yellowThreshold >= value.greenThreshold) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["yellowThreshold"],
      message: "yellowThreshold debe ser menor que greenThreshold."
    });
  }
});

export const portalBrandingSchema = z.object({
  logoUrl: z.string().trim().url().nullable().default(null),
  primary: z.string().trim().regex(HEX_COLOR_REGEX).default("#4aa59c"),
  secondary: z.string().trim().regex(HEX_COLOR_REGEX).default("#4aadf5"),
  corporate: z.string().trim().regex(HEX_COLOR_REGEX).default("#2e75ba")
});

const portalMenusSchema = z.array(portalMenuItemSchema).max(40).superRefine((items, ctx) => {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    const normalizedKey = item.key.trim().toLowerCase();
    if (!normalizedKey) return;
    if (seen.has(normalizedKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, "key"],
        message: "key duplicada en menús."
      });
      return;
    }
    seen.add(normalizedKey);
  });
});

export const portalConfigPatchSchema = z
  .object({
    patientPortalMenus: portalMenusSchema.optional(),
    companyPortalMenus: portalMenusSchema.optional(),
    support: portalSupportSchema.optional(),
    auth: portalAuthSchema.optional(),
    appointmentsRules: portalAppointmentsRulesSchema.optional(),
    branding: portalBrandingSchema.optional()
  })
  .strict();

export type PortalMenuItem = z.infer<typeof portalMenuItemSchema>;
export type PortalSupportConfig = z.infer<typeof portalSupportSchema>;
export type PortalAuthConfig = z.infer<typeof portalAuthSchema>;
export type PortalAppointmentsRulesConfig = z.infer<typeof portalAppointmentsRulesSchema>;
export type PortalBrandingConfig = z.infer<typeof portalBrandingSchema>;
export type PortalConfigPatch = z.infer<typeof portalConfigPatchSchema>;

export type PortalConfigSnapshot = {
  id: "global";
  version: number;
  patientPortalMenus: PortalMenuItem[];
  companyPortalMenus: PortalMenuItem[];
  support: PortalSupportConfig;
  auth: PortalAuthConfig;
  appointmentsRules: PortalAppointmentsRulesConfig;
  branding: PortalBrandingConfig;
  source: "db" | "defaults";
};

type PortalConfigRow = {
  id: string;
  version: number;
  patientPortalMenus: Prisma.JsonValue;
  companyPortalMenus: Prisma.JsonValue;
  support: Prisma.JsonValue;
  auth: Prisma.JsonValue;
  appointmentsRules: Prisma.JsonValue;
  branding: Prisma.JsonValue;
};

type PortalConfigRawQueryRow = {
  id: string;
  version: number;
  patientPortalMenus: unknown;
  companyPortalMenus: unknown;
  support: unknown;
  auth: unknown;
  appointmentsRules: unknown;
  branding: unknown;
};

const PORTAL_CONFIG_ROW_SELECT = {
  id: true,
  version: true,
  patientPortalMenus: true,
  companyPortalMenus: true,
  support: true,
  auth: true,
  appointmentsRules: true,
  branding: true
} as const;

type PortalConfigCreateData = {
  id: string;
  version: number;
  patientPortalMenus: Prisma.InputJsonValue;
  companyPortalMenus: Prisma.InputJsonValue;
  support: Prisma.InputJsonValue;
  auth: Prisma.InputJsonValue;
  appointmentsRules: Prisma.InputJsonValue;
  branding: Prisma.InputJsonValue;
  updatedByUserId: string | null;
};

const warnedPortalConfigContexts = new Set<string>();

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function coerceJsonValue(value: unknown): Prisma.JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          return JSON.parse(trimmed) as Prisma.JsonValue;
        } catch {
          return value as Prisma.JsonValue;
        }
      }
    }
    return value as Prisma.JsonValue;
  }

  if (Array.isArray(value)) return value as Prisma.JsonValue;
  if (typeof value === "object") return value as Prisma.JsonValue;
  return {} as Prisma.JsonValue;
}

function mapRawQueryRow(row: PortalConfigRawQueryRow): PortalConfigRow {
  return {
    id: row.id,
    version: row.version,
    patientPortalMenus: coerceJsonValue(row.patientPortalMenus),
    companyPortalMenus: coerceJsonValue(row.companyPortalMenus),
    support: coerceJsonValue(row.support),
    auth: coerceJsonValue(row.auth),
    appointmentsRules: coerceJsonValue(row.appointmentsRules),
    branding: coerceJsonValue(row.branding)
  };
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

function warnDevPortalConfigFallback(context: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (warnedPortalConfigContexts.has(context)) return;
  warnedPortalConfigContexts.add(context);
  console.warn(
    `[DEV][portales.config] ${context}: fallback por esquema legacy. ` +
      `Ejecuta migraciones + prisma generate. Details: ${toErrorMessage(error)}`
  );
}

function getPortalConfigDelegate() {
  return (prisma as unknown as {
    portalConfig?: {
      findUnique?: (args: {
        where: { id: string };
        select: typeof PORTAL_CONFIG_ROW_SELECT;
      }) => Promise<PortalConfigRow | null>;
      upsert?: (args: {
        where: { id: string };
        update: Record<string, never>;
        create: PortalConfigCreateData;
        select: typeof PORTAL_CONFIG_ROW_SELECT;
      }) => Promise<PortalConfigRow>;
      update?: (args: {
        where: { id: string };
        data: {
          version: { increment: number };
          patientPortalMenus: Prisma.InputJsonValue;
          companyPortalMenus: Prisma.InputJsonValue;
          support: Prisma.InputJsonValue;
          auth: Prisma.InputJsonValue;
          appointmentsRules: Prisma.InputJsonValue;
          branding: Prisma.InputJsonValue;
          updatedByUserId: string | null;
        };
        select: typeof PORTAL_CONFIG_ROW_SELECT;
      }) => Promise<PortalConfigRow>;
    };
  }).portalConfig;
}

async function readPortalConfigRowRaw(
  client: {
    $queryRaw?: <T = unknown>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
  }
): Promise<PortalConfigRow | null> {
  if (!client.$queryRaw) return null;
  const rows = await client.$queryRaw<PortalConfigRawQueryRow[]>`
    SELECT
      "id",
      "version",
      "patientPortalMenus",
      "companyPortalMenus",
      "support",
      "auth",
      "appointmentsRules",
      "branding"
    FROM "PortalConfig"
    WHERE "id" = 'global'
    LIMIT 1
  `;
  if (!rows.length) return null;
  return mapRawQueryRow(rows[0]!);
}

async function ensurePortalConfigRowRaw(
  client: {
    $executeRaw?: (query: TemplateStringsArray, ...values: unknown[]) => Promise<number>;
  },
  defaults: PortalConfigSnapshot
) {
  if (!client.$executeRaw) return;
  const patientPortalMenusJson = JSON.stringify(defaults.patientPortalMenus);
  const companyPortalMenusJson = JSON.stringify(defaults.companyPortalMenus);
  const supportJson = JSON.stringify(defaults.support);
  const authJson = JSON.stringify(defaults.auth);
  const appointmentsRulesJson = JSON.stringify(defaults.appointmentsRules);
  const brandingJson = JSON.stringify(defaults.branding);

  await client.$executeRaw`
    INSERT INTO "PortalConfig" (
      "id",
      "version",
      "patientPortalMenus",
      "companyPortalMenus",
      "support",
      "auth",
      "appointmentsRules",
      "branding",
      "updatedByUserId"
    ) VALUES (
      'global',
      ${defaults.version},
      CAST(${patientPortalMenusJson} AS jsonb),
      CAST(${companyPortalMenusJson} AS jsonb),
      CAST(${supportJson} AS jsonb),
      CAST(${authJson} AS jsonb),
      CAST(${appointmentsRulesJson} AS jsonb),
      CAST(${brandingJson} AS jsonb),
      ${null}
    )
    ON CONFLICT ("id") DO NOTHING
  `;
}

async function updatePortalConfigRowRaw(
  client: {
    $executeRaw?: (query: TemplateStringsArray, ...values: unknown[]) => Promise<number>;
  },
  input: {
    snapshot: PortalConfigSnapshot;
    nextVersion: number;
    updatedByUserId: string | null;
  }
) {
  if (!client.$executeRaw) return;
  const patientPortalMenusJson = JSON.stringify(input.snapshot.patientPortalMenus);
  const companyPortalMenusJson = JSON.stringify(input.snapshot.companyPortalMenus);
  const supportJson = JSON.stringify(input.snapshot.support);
  const authJson = JSON.stringify(input.snapshot.auth);
  const appointmentsRulesJson = JSON.stringify(input.snapshot.appointmentsRules);
  const brandingJson = JSON.stringify(input.snapshot.branding);

  await client.$executeRaw`
    UPDATE "PortalConfig"
    SET
      "version" = ${input.nextVersion},
      "patientPortalMenus" = CAST(${patientPortalMenusJson} AS jsonb),
      "companyPortalMenus" = CAST(${companyPortalMenusJson} AS jsonb),
      "support" = CAST(${supportJson} AS jsonb),
      "auth" = CAST(${authJson} AS jsonb),
      "appointmentsRules" = CAST(${appointmentsRulesJson} AS jsonb),
      "branding" = CAST(${brandingJson} AS jsonb),
      "updatedByUserId" = ${input.updatedByUserId},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = 'global'
  `;
}

function normalizeMenus(items: PortalMenuItem[]): PortalMenuItem[] {
  const dedup = new Map<string, PortalMenuItem>();
  for (const item of items) {
    const key = item.key.trim();
    if (!key) continue;
    dedup.set(key, {
      key,
      label: item.label.trim(),
      path: item.path.trim(),
      enabled: Boolean(item.enabled),
      order: Math.max(0, Math.min(9999, Math.floor(item.order)))
    });
  }

  return Array.from(dedup.values()).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.label.localeCompare(b.label, "es");
  });
}

export function buildPortalConfigDefaults(): PortalConfigSnapshot {
  return {
    id: "global",
    version: 1,
    patientPortalMenus: normalizeMenus([
      { key: "dashboard", label: "Dashboard", path: "/portal/app", enabled: true, order: 10 },
      { key: "appointments", label: "Mis citas", path: "/portal/app/appointments", enabled: true, order: 20 },
      {
        key: "appointments_new",
        label: "Solicitar cita",
        path: "/portal/app/appointments/new",
        enabled: true,
        order: 30
      },
      { key: "invoices", label: "Mis facturas", path: "/portal/app/invoices", enabled: true, order: 40 },
      { key: "results", label: "Mis resultados", path: "/portal/app/results", enabled: true, order: 50 },
      { key: "membership", label: "Mi membresía", path: "/portal/app/membership", enabled: true, order: 60 },
      { key: "profile", label: "Mi perfil", path: "/portal/app/profile", enabled: true, order: 70 }
    ]),
    companyPortalMenus: [],
    support: {
      phone: "7729-3636",
      whatsappUrl: "https://wa.me/50277293636",
      supportText: "Para editar tu información, escribe por WhatsApp o llama al 7729-3636.",
      hours: "Lun-Vie 08:00-17:00",
      showSupportCard: true
    },
    auth: {
      otpEnabled: true,
      magicLinkEnabled: true,
      otpLength: 6,
      otpTtlMinutes: 10,
      sessionAccessTtlMinutes: 15,
      sessionRefreshTtlHours: 24
    },
    appointmentsRules: {
      startHour: "08:00",
      endHour: "17:00",
      slotMinutes: 30,
      greenThreshold: 0.6,
      yellowThreshold: 0.2,
      requestLimitPerDay: 10
    },
    branding: {
      logoUrl: null,
      primary: "#4aa59c",
      secondary: "#4aadf5",
      corporate: "#2e75ba"
    },
    source: "defaults"
  };
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function rowToSnapshot(row: PortalConfigRow): PortalConfigSnapshot {
  const defaults = buildPortalConfigDefaults();
  const parsedPatientMenus = portalMenusSchema.safeParse(row.patientPortalMenus);
  const parsedCompanyMenus = portalMenusSchema.safeParse(row.companyPortalMenus);
  const parsedSupport = portalSupportSchema.safeParse(row.support);
  const parsedAuth = portalAuthSchema.safeParse(row.auth);
  const parsedAppointmentsRules = portalAppointmentsRulesSchema.safeParse(row.appointmentsRules);
  const parsedBranding = portalBrandingSchema.safeParse(row.branding);

  return {
    id: "global",
    version: row.version,
    patientPortalMenus: normalizeMenus(parsedPatientMenus.success ? parsedPatientMenus.data : defaults.patientPortalMenus),
    companyPortalMenus: normalizeMenus(parsedCompanyMenus.success ? parsedCompanyMenus.data : defaults.companyPortalMenus),
    support: parsedSupport.success ? parsedSupport.data : defaults.support,
    auth: parsedAuth.success ? parsedAuth.data : defaults.auth,
    appointmentsRules: parsedAppointmentsRules.success ? parsedAppointmentsRules.data : defaults.appointmentsRules,
    branding: parsedBranding.success ? parsedBranding.data : defaults.branding,
    source: "db"
  };
}

function snapshotToCreateInput(snapshot: PortalConfigSnapshot): PortalConfigCreateData {
  return {
    id: "global",
    version: snapshot.version,
    patientPortalMenus: asJson(snapshot.patientPortalMenus),
    companyPortalMenus: asJson(snapshot.companyPortalMenus),
    support: asJson(snapshot.support),
    auth: asJson(snapshot.auth),
    appointmentsRules: asJson(snapshot.appointmentsRules),
    branding: asJson(snapshot.branding),
    updatedByUserId: null
  };
}

export class PortalConfigConflictError extends Error {
  readonly currentVersion: number;

  constructor(currentVersion: number) {
    super("PortalConfig version conflict");
    this.name = "PortalConfigConflictError";
    this.currentVersion = currentVersion;
  }
}

export class PortalConfigUnavailableError extends Error {
  constructor(message = "PortalConfig no está disponible. Ejecuta migraciones y prisma generate.") {
    super(message);
    this.name = "PortalConfigUnavailableError";
  }
}

export function parsePortalConfigPatch(input: unknown): PortalConfigPatch {
  return portalConfigPatchSchema.parse(input);
}

export async function getPortalConfig(): Promise<PortalConfigSnapshot> {
  const delegate = getPortalConfigDelegate();
  if (!delegate?.findUnique) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[DEV][portales.config] prisma.portalConfig delegate no disponible. Intentando fallback SQL.");
    }
    try {
      const rawRow = await readPortalConfigRowRaw(prisma);
      if (!rawRow) return buildPortalConfigDefaults();
      return rowToSnapshot(rawRow);
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        logPrismaSchemaIssue("portales.config.get.raw", error);
        return buildPortalConfigDefaults();
      }
      if (isPrismaSchemaMismatchError(error)) {
        warnDevPortalConfigFallback("portales.config.get.raw", error);
        return buildPortalConfigDefaults();
      }
      throw error;
    }
  }

  try {
    const row = await delegate.findUnique({
      where: { id: "global" },
      select: PORTAL_CONFIG_ROW_SELECT
    });

    if (!row) return buildPortalConfigDefaults();
    return rowToSnapshot(row);
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      logPrismaSchemaIssue("portales.config.get", error);
      return buildPortalConfigDefaults();
    }
    if (isPrismaSchemaMismatchError(error)) {
      warnDevPortalConfigFallback("portales.config.get", error);
      return buildPortalConfigDefaults();
    }
    throw error;
  }
}

export async function updatePortalConfig(input: {
  expectedVersion: number;
  patch: PortalConfigPatch;
  updatedByUserId?: string | null;
}) {
  const delegate = getPortalConfigDelegate();
  if (!delegate?.findUnique || !delegate?.upsert || !delegate?.update) {
    return prisma.$transaction(async (tx) => {
      const txRawClient = tx as unknown as {
        $queryRaw?: <T = unknown>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
        $executeRaw?: (query: TemplateStringsArray, ...values: unknown[]) => Promise<number>;
        portalAuditLog?: {
          create?: (args: {
            data: {
              clientId: string | null;
              action: string;
              metadata: Prisma.InputJsonValue;
            };
          }) => Promise<unknown>;
        };
      };

      if (!txRawClient.$queryRaw || !txRawClient.$executeRaw) {
        throw new PortalConfigUnavailableError();
      }

      const changedKeys = (Object.keys(input.patch) as Array<keyof PortalConfigPatch>).filter(
        (key) => typeof input.patch[key] !== "undefined"
      );

      const defaults = buildPortalConfigDefaults();
      await ensurePortalConfigRowRaw(txRawClient, defaults);
      const ensured = await readPortalConfigRowRaw(txRawClient);
      if (!ensured) throw new PortalConfigUnavailableError();

      if (ensured.version !== input.expectedVersion) {
        throw new PortalConfigConflictError(ensured.version);
      }

      const current = rowToSnapshot(ensured);
      const merged: PortalConfigSnapshot = {
        ...current,
        patientPortalMenus: input.patch.patientPortalMenus
          ? normalizeMenus(input.patch.patientPortalMenus)
          : current.patientPortalMenus,
        companyPortalMenus: input.patch.companyPortalMenus
          ? normalizeMenus(input.patch.companyPortalMenus)
          : current.companyPortalMenus,
        support: input.patch.support ?? current.support,
        auth: input.patch.auth ?? current.auth,
        appointmentsRules: input.patch.appointmentsRules ?? current.appointmentsRules,
        branding: input.patch.branding ?? current.branding,
        source: "db"
      };

      const nextVersion = ensured.version + 1;
      await updatePortalConfigRowRaw(txRawClient, {
        snapshot: merged,
        nextVersion,
        updatedByUserId: input.updatedByUserId ?? null
      });

      try {
        await txRawClient.portalAuditLog?.create?.({
          data: {
            clientId: null,
            action: "PORTAL_CONFIG_UPDATED",
            metadata: {
              oldVersion: ensured.version,
              newVersion: nextVersion,
              changedKeys,
              updatedByUserId: input.updatedByUserId ?? null
            }
          }
        });
      } catch (error) {
        if (isPrismaMissingTableError(error)) {
          logPrismaSchemaIssue("portales.config.audit.raw", error);
        } else if (isPrismaSchemaMismatchError(error)) {
          warnDevPortalConfigFallback("portales.config.audit.raw", error);
        } else {
          throw error;
        }
      }

      const updated = await readPortalConfigRowRaw(txRawClient);
      if (!updated) throw new PortalConfigUnavailableError();
      return rowToSnapshot(updated);
    });
  }

  const changedKeys = (Object.keys(input.patch) as Array<keyof PortalConfigPatch>).filter(
    (key) => typeof input.patch[key] !== "undefined"
  );

  return prisma.$transaction(async (tx) => {
    const txClient = tx as unknown as {
      portalConfig?: {
        upsert?: (args: {
          where: { id: string };
          update: Record<string, never>;
          create: PortalConfigCreateData;
          select: typeof PORTAL_CONFIG_ROW_SELECT;
        }) => Promise<PortalConfigRow>;
        update?: (args: {
          where: { id: string };
          data: {
            version: { increment: number };
            patientPortalMenus: Prisma.InputJsonValue;
            companyPortalMenus: Prisma.InputJsonValue;
            support: Prisma.InputJsonValue;
            auth: Prisma.InputJsonValue;
            appointmentsRules: Prisma.InputJsonValue;
            branding: Prisma.InputJsonValue;
            updatedByUserId: string | null;
          };
          select: typeof PORTAL_CONFIG_ROW_SELECT;
        }) => Promise<PortalConfigRow>;
      };
      portalAuditLog?: {
        create?: (args: {
          data: {
            clientId: string | null;
            action: string;
            metadata: Prisma.InputJsonValue;
          };
        }) => Promise<unknown>;
      };
    };
    const txPortalConfig = txClient.portalConfig;
    if (!txPortalConfig?.upsert || !txPortalConfig?.update) {
      throw new PortalConfigUnavailableError();
    }

    const defaults = buildPortalConfigDefaults();

    const ensured = await txPortalConfig.upsert({
      where: { id: "global" },
      update: {},
      create: snapshotToCreateInput(defaults),
      select: PORTAL_CONFIG_ROW_SELECT
    });

    if (ensured.version !== input.expectedVersion) {
      throw new PortalConfigConflictError(ensured.version);
    }

    const current = rowToSnapshot(ensured);
    const merged: PortalConfigSnapshot = {
      ...current,
      patientPortalMenus: input.patch.patientPortalMenus
        ? normalizeMenus(input.patch.patientPortalMenus)
        : current.patientPortalMenus,
      companyPortalMenus: input.patch.companyPortalMenus
        ? normalizeMenus(input.patch.companyPortalMenus)
        : current.companyPortalMenus,
      support: input.patch.support ?? current.support,
      auth: input.patch.auth ?? current.auth,
      appointmentsRules: input.patch.appointmentsRules ?? current.appointmentsRules,
      branding: input.patch.branding ?? current.branding,
      source: "db"
    };

    const updated = await txPortalConfig.update({
      where: { id: "global" },
      data: {
        version: { increment: 1 },
        patientPortalMenus: asJson(merged.patientPortalMenus),
        companyPortalMenus: asJson(merged.companyPortalMenus),
        support: asJson(merged.support),
        auth: asJson(merged.auth),
        appointmentsRules: asJson(merged.appointmentsRules),
        branding: asJson(merged.branding),
        updatedByUserId: input.updatedByUserId ?? null
      },
      select: PORTAL_CONFIG_ROW_SELECT
    });

    try {
      await txClient.portalAuditLog?.create?.({
        data: {
          clientId: null,
          action: "PORTAL_CONFIG_UPDATED",
          metadata: {
            oldVersion: ensured.version,
            newVersion: updated.version,
            changedKeys,
            updatedByUserId: input.updatedByUserId ?? null
          }
        }
      });
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        logPrismaSchemaIssue("portales.config.audit", error);
      } else if (isPrismaSchemaMismatchError(error)) {
        warnDevPortalConfigFallback("portales.config.audit", error);
      } else {
        throw error;
      }
    }

    return rowToSnapshot(updated);
  });
}
