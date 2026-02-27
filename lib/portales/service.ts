import { AppointmentStatus, ClientProfileType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, logPrismaSchemaIssue } from "@/lib/prisma/errors.server";
import { type SessionUser } from "@/lib/auth";
import {
  matchesPortalChannelFilter,
  normalizeIdentifier,
  parsePortalRequestChannel,
  type PortalChannelFilter,
  type PortalRequestChannel
} from "@/lib/portales/channel";

export type PortalRange = "today" | "7d" | "30d";
export type PortalBranchScope = "all" | "active";

export type PortalKpiSnapshot = {
  range: PortalRange;
  from: string;
  to: string;
  channel: PortalChannelFilter;
  branchScope: PortalBranchScope;
  effectiveBranchId: string | null;
  kpis: {
    otpRequested: number;
    otpVerified: number;
    loginFailed: number;
    sessionsActive: number;
    sessionsRevoked: number;
    requestedAppointments: number;
  };
  series: Array<{
    date: string;
    otpRequested: number;
    otpVerified: number;
    loginFailed: number;
    requestedAppointments: number;
  }>;
  criticalEvents: Array<{
    id: string;
    action: string;
    createdAt: string;
    clientName: string | null;
    metadataSummary: string | null;
  }>;
};

export type PortalAuditListItem = {
  id: string;
  createdAt: string;
  action: string;
  clientId: string | null;
  clientName: string | null;
  metadataSummary: string | null;
  metadata: unknown;
};

export type PortalAuditListResult = {
  items: PortalAuditListItem[];
  nextCursor: string | null;
};

export type PortalSessionListItem = {
  id: string;
  clientId: string;
  clientName: string;
  clientType: ClientProfileType;
  clientEmail: string | null;
  clientPhone: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  status: "active" | "revoked" | "expired";
  rotationCounter: number;
};

export type PortalSessionListResult = {
  items: PortalSessionListItem[];
  nextCursor: string | null;
};

export type PortalSessionStatusFilter = "active" | "revoked" | "expired";

export type PortalSolicitudItem = {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  typeName: string;
  branchId: string;
  branchName: string | null;
  preferredDate: string;
  reason: string;
  requestedAt: string;
  channel: PortalRequestChannel;
  companyId: string | null;
  companyName: string | null;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const warnedPortalesContexts = new Set<string>();

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

function isKnownCompatError(error: unknown) {
  return isPrismaMissingTableError(error) || isPrismaSchemaMismatchError(error);
}

function warnDevPortalesFallback(context: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (warnedPortalesContexts.has(context)) return;
  warnedPortalesContexts.add(context);
  if (isPrismaMissingTableError(error)) {
    logPrismaSchemaIssue(context, error);
    return;
  }
  console.warn(
    `[DEV][portales] ${context}: fallback por esquema legacy. ` +
      `Ejecuta migraciones + prisma generate. Details: ${toErrorMessage(error)}`
  );
}

async function safeQuery<T>(context: string, fallback: T, query: () => Promise<T>): Promise<T> {
  try {
    return await query();
  } catch (error) {
    if (isKnownCompatError(error)) {
      warnDevPortalesFallback(context, error);
      return fallback;
    }
    throw error;
  }
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function resolveDateRange(range: PortalRange, now = new Date()) {
  const todayStart = startOfDay(now);

  if (range === "today") {
    return { from: todayStart, to: endOfDay(now) };
  }

  if (range === "7d") {
    return { from: startOfDay(addDays(todayStart, -6)), to: endOfDay(now) };
  }

  return { from: startOfDay(addDays(todayStart, -29)), to: endOfDay(now) };
}

function resolvePortalFullName(input: {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  companyName: string | null;
  tradeName: string | null;
  type: ClientProfileType;
}) {
  if (input.type === ClientProfileType.PERSON) {
    const person = [input.firstName, input.middleName, input.lastName, input.secondLastName]
      .map((part) => (part || "").trim())
      .filter(Boolean)
      .join(" ");
    return person || "Paciente";
  }

  return normalizeIdentifier(input.companyName) || normalizeIdentifier(input.tradeName) || "Cliente";
}

function normalizeText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parsePortalRequestNotes(notes: string | null, fallbackPreferredDate: Date) {
  const fragments = String(notes || "")
    .split(/\n|\|/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const findValue = (prefix: string) => {
    const normalizedPrefix = normalizeText(prefix);
    const found = fragments.find((line) => normalizeText(line).startsWith(normalizedPrefix));
    if (!found) return null;
    const separatorIndex = found.indexOf(":");
    if (separatorIndex < 0) return null;
    const value = found.slice(separatorIndex + 1).trim();
    return value || null;
  };

  const reasonValue = findValue("Motivo");
  const preferred1Value = findValue("Preferencia 1");

  const parseDateValue = (value: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const preferredDate1 = parseDateValue(preferred1Value) ?? fallbackPreferredDate;

  const fallbackReason = fragments.find((line) => {
    const normalized = normalizeText(line);
    return normalized.length > 0 && !normalized.startsWith("solicitud portal") && !normalized.startsWith("preferencia");
  });

  return {
    reason: reasonValue || fallbackReason || "Sin motivo registrado.",
    preferredDate1
  };
}

function getUtcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function clampLimit(value: number | null | undefined) {
  const parsed = Number(value || DEFAULT_PAGE_SIZE);
  if (!Number.isFinite(parsed)) return DEFAULT_PAGE_SIZE;
  return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(parsed)));
}

function channelAuditWhere(channel: PortalChannelFilter): Prisma.PortalAuditLogWhereInput {
  if (channel === "patient") {
    return {
      OR: [{ clientId: null }, { client: { is: { type: ClientProfileType.PERSON } } }]
    };
  }

  if (channel === "company") {
    return {
      client: { is: { type: ClientProfileType.COMPANY } }
    };
  }

  return {};
}

function channelSessionWhere(channel: PortalChannelFilter): Prisma.PortalSessionWhereInput {
  if (channel === "patient") {
    return { client: { is: { type: ClientProfileType.PERSON } } };
  }
  if (channel === "company") {
    return { client: { is: { type: ClientProfileType.COMPANY } } };
  }
  return {};
}

function channelOtpWhere(channel: PortalChannelFilter): Prisma.PortalOtpChallengeWhereInput {
  if (channel === "patient") {
    return {
      OR: [{ clientId: null }, { client: { is: { type: ClientProfileType.PERSON } } }]
    };
  }
  if (channel === "company") {
    return {
      client: { is: { type: ClientProfileType.COMPANY } }
    };
  }
  return {};
}

function summarizeMetadata(metadata: Prisma.JsonValue | null): string | null {
  if (!metadata) return null;
  if (typeof metadata !== "object") return String(metadata).slice(0, 180);

  const record = metadata as Record<string, unknown>;
  const preferredKeys = ["reason", "sessionId", "oldVersion", "newVersion", "changedKeys", "status", "view"];
  const chunks: string[] = [];

  for (const key of preferredKeys) {
    if (!(key in record)) continue;
    const value = record[key];
    if (value === null || typeof value === "undefined") continue;
    if (Array.isArray(value)) {
      chunks.push(`${key}: ${value.slice(0, 5).join(", ")}`);
      continue;
    }
    if (typeof value === "object") {
      chunks.push(`${key}: {...}`);
      continue;
    }
    chunks.push(`${key}: ${String(value)}`);
  }

  if (!chunks.length) {
    const serialized = JSON.stringify(record);
    const sanitized = maskSensitiveText(serialized);
    return sanitized.length > 200 ? `${sanitized.slice(0, 197)}...` : sanitized;
  }

  const text = maskSensitiveText(chunks.join(" | "));
  return text.length > 220 ? `${text.slice(0, 217)}...` : text;
}

function maskSensitiveText(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (email) => {
      const [user, domain] = email.split("@");
      const userMasked = user.length <= 2 ? "***" : `${user.slice(0, 2)}***`;
      return `${userMasked}@${domain}`;
    })
    .replace(/\+?\d[\d\s-]{7,}\d/g, (raw) => {
      const compact = raw.replace(/[^\d+]/g, "");
      if (compact.length < 8) return raw;
      const suffix = compact.slice(-4);
      return `***${suffix}`;
    });
}

export async function getPortalKpis(input: {
  range: PortalRange;
  branchScope: PortalBranchScope;
  channel: PortalChannelFilter;
  activeBranchId?: string | null;
}): Promise<PortalKpiSnapshot> {
  const now = new Date();
  const { from, to } = resolveDateRange(input.range, now);
  const requiresActiveBranch = input.branchScope === "active";
  const effectiveBranchId = input.branchScope === "active" ? normalizeIdentifier(input.activeBranchId) : null;

  if (requiresActiveBranch && !effectiveBranchId) {
    return {
      range: input.range,
      from: from.toISOString(),
      to: to.toISOString(),
      channel: input.channel,
      branchScope: input.branchScope,
      effectiveBranchId: null,
      kpis: {
        otpRequested: 0,
        otpVerified: 0,
        loginFailed: 0,
        sessionsActive: 0,
        sessionsRevoked: 0,
        requestedAppointments: 0
      },
      series: [],
      criticalEvents: []
    };
  }

  const otpWhere: Prisma.PortalOtpChallengeWhereInput = {
    ...channelOtpWhere(input.channel),
    createdAt: { gte: from, lte: to }
  };

  const otpVerifiedWhere: Prisma.PortalOtpChallengeWhereInput = {
    ...channelOtpWhere(input.channel),
    consumedAt: { gte: from, lte: to }
  };

  const loginWhere: Prisma.PortalAuditLogWhereInput = {
    action: "LOGIN_FAILED",
    createdAt: { gte: from, lte: to },
    ...channelAuditWhere(input.channel)
  };

  const sessionBaseWhere: Prisma.PortalSessionWhereInput = {
    ...channelSessionWhere(input.channel)
  };

  const appointmentRows = requiresActiveBranch && !effectiveBranchId
    ? []
    : await safeQuery(
        "portales.kpis.appointments",
        [] as Array<{ id: string; createdAt: Date; createdById: string; branchId: string }>,
        async () => {
          const rows = await prisma.appointment.findMany({
            where: {
              status: AppointmentStatus.REQUESTED,
              createdAt: { gte: from, lte: to },
              branchId: effectiveBranchId ?? undefined
            },
            select: {
              id: true,
              createdAt: true,
              createdById: true,
              branchId: true
            }
          });
          return rows;
        }
      );

  const filteredAppointmentRows = appointmentRows.filter((row) => {
    const parsed = parsePortalRequestChannel(row.createdById);
    return matchesPortalChannelFilter(parsed.channel, input.channel);
  });

  const [otpRequestedCount, otpVerifiedCount, loginFailedCount, sessionsActiveCount, sessionsRevokedCount, criticalRows] =
    await Promise.all([
      safeQuery("portales.kpis.otpRequested", 0, async () => prisma.portalOtpChallenge.count({ where: otpWhere })),
      safeQuery("portales.kpis.otpVerified", 0, async () => prisma.portalOtpChallenge.count({ where: otpVerifiedWhere })),
      safeQuery("portales.kpis.loginFailed", 0, async () => prisma.portalAuditLog.count({ where: loginWhere })),
      safeQuery("portales.kpis.sessionsActive", 0, async () =>
        prisma.portalSession.count({
          where: {
            ...sessionBaseWhere,
            revokedAt: null,
            expiresAt: { gt: now }
          }
        })
      ),
      safeQuery("portales.kpis.sessionsRevoked", 0, async () =>
        prisma.portalSession.count({
          where: {
            ...sessionBaseWhere,
            revokedAt: { gte: from, lte: to }
          }
        })
      ),
      safeQuery(
        "portales.kpis.criticalEvents",
        [] as Array<{
          id: string;
          action: string;
          createdAt: Date;
          metadata: Prisma.JsonValue | null;
          client: {
            type: ClientProfileType;
            firstName: string | null;
            middleName: string | null;
            lastName: string | null;
            secondLastName: string | null;
            companyName: string | null;
            tradeName: string | null;
          } | null;
        }>,
        async () =>
          prisma.portalAuditLog.findMany({
            where: {
              action: { in: ["LOGIN_FAILED", "SESSION_REVOKED_BY_ADMIN"] },
              createdAt: { gte: from, lte: to },
              ...channelAuditWhere(input.channel)
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 10,
            select: {
              id: true,
              action: true,
              createdAt: true,
              metadata: true,
              client: {
                select: {
                  type: true,
                  firstName: true,
                  middleName: true,
                  lastName: true,
                  secondLastName: true,
                  companyName: true,
                  tradeName: true
                }
              }
            }
          })
      )
    ]);

  const [otpCreatedRows, otpConsumedRows, loginRows] = await Promise.all([
    safeQuery("portales.kpis.series.otpCreated", [] as Array<{ createdAt: Date }>, async () =>
      prisma.portalOtpChallenge.findMany({
        where: otpWhere,
        select: { createdAt: true },
        orderBy: { createdAt: "asc" }
      })
    ),
    safeQuery("portales.kpis.series.otpConsumed", [] as Array<{ consumedAt: Date | null }>, async () =>
      prisma.portalOtpChallenge.findMany({
        where: otpVerifiedWhere,
        select: { consumedAt: true },
        orderBy: { consumedAt: "asc" }
      })
    ),
    safeQuery("portales.kpis.series.loginFailed", [] as Array<{ createdAt: Date }>, async () =>
      prisma.portalAuditLog.findMany({
        where: loginWhere,
        select: { createdAt: true },
        orderBy: { createdAt: "asc" }
      })
    )
  ]);

  const buckets = new Map<
    string,
    {
      otpRequested: number;
      otpVerified: number;
      loginFailed: number;
      requestedAppointments: number;
    }
  >();

  const bump = (date: Date, key: "otpRequested" | "otpVerified" | "loginFailed" | "requestedAppointments") => {
    const dayKey = getUtcDayKey(date);
    const current = buckets.get(dayKey) || {
      otpRequested: 0,
      otpVerified: 0,
      loginFailed: 0,
      requestedAppointments: 0
    };
    current[key] += 1;
    buckets.set(dayKey, current);
  };

  for (const row of otpCreatedRows) bump(row.createdAt, "otpRequested");
  for (const row of otpConsumedRows) {
    if (row.consumedAt) bump(row.consumedAt, "otpVerified");
  }
  for (const row of loginRows) bump(row.createdAt, "loginFailed");
  for (const row of filteredAppointmentRows) bump(row.createdAt, "requestedAppointments");

  const series = Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, value]) => ({ date, ...value }));

  const criticalEvents = criticalRows.map((row) => ({
    id: row.id,
    action: row.action,
    createdAt: row.createdAt.toISOString(),
    clientName: row.client
      ? resolvePortalFullName({
          type: row.client.type,
          firstName: row.client.firstName,
          middleName: row.client.middleName,
          lastName: row.client.lastName,
          secondLastName: row.client.secondLastName,
          companyName: row.client.companyName,
          tradeName: row.client.tradeName
        })
      : null,
    metadataSummary: summarizeMetadata(row.metadata)
  }));

  return {
    range: input.range,
    from: from.toISOString(),
    to: to.toISOString(),
    channel: input.channel,
    branchScope: input.branchScope,
    effectiveBranchId,
    kpis: {
      otpRequested: otpRequestedCount,
      otpVerified: otpVerifiedCount,
      loginFailed: loginFailedCount,
      sessionsActive: sessionsActiveCount,
      sessionsRevoked: sessionsRevokedCount,
      requestedAppointments: filteredAppointmentRows.length
    },
    series,
    criticalEvents
  };
}

export async function listPortalAudit(input: {
  cursor?: string | null;
  limit?: number;
  from?: string | null;
  to?: string | null;
  action?: string | null;
  channel?: PortalChannelFilter;
}): Promise<PortalAuditListResult> {
  const limit = clampLimit(input.limit);
  const from = input.from ? new Date(input.from) : null;
  const to = input.to ? new Date(input.to) : null;
  const channel = input.channel || "all";

  const rows = await safeQuery(
    "portales.audit.list",
    [] as Array<{
      id: string;
      createdAt: Date;
      action: string;
      clientId: string | null;
      metadata: Prisma.JsonValue | null;
      client: {
        type: ClientProfileType;
        firstName: string | null;
        middleName: string | null;
        lastName: string | null;
        secondLastName: string | null;
        companyName: string | null;
        tradeName: string | null;
      } | null;
    }>,
    async () =>
      prisma.portalAuditLog.findMany({
        where: {
          action: input.action?.trim() || undefined,
          createdAt: {
            gte: from && !Number.isNaN(from.getTime()) ? from : undefined,
            lte: to && !Number.isNaN(to.getTime()) ? to : undefined
          },
          ...channelAuditWhere(channel)
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        cursor: input.cursor?.trim() ? { id: input.cursor.trim() } : undefined,
        skip: input.cursor?.trim() ? 1 : undefined,
        select: {
          id: true,
          createdAt: true,
          action: true,
          clientId: true,
          metadata: true,
          client: {
            select: {
              type: true,
              firstName: true,
              middleName: true,
              lastName: true,
              secondLastName: true,
              companyName: true,
              tradeName: true
            }
          }
        }
      })
  );

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: pageRows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      action: row.action,
      clientId: row.clientId,
      clientName: row.client
        ? resolvePortalFullName({
            type: row.client.type,
            firstName: row.client.firstName,
            middleName: row.client.middleName,
            lastName: row.client.lastName,
            secondLastName: row.client.secondLastName,
            companyName: row.client.companyName,
            tradeName: row.client.tradeName
          })
        : null,
      metadataSummary: summarizeMetadata(row.metadata),
      metadata: row.metadata
    })),
    nextCursor: hasMore ? pageRows[pageRows.length - 1]?.id ?? null : null
  };
}

export async function listPortalSessions(input: {
  status: PortalSessionStatusFilter;
  queryClient?: string | null;
  channel?: PortalChannelFilter;
  cursor?: string | null;
  limit?: number;
}): Promise<PortalSessionListResult> {
  const limit = clampLimit(input.limit);
  const now = new Date();
  const queryClient = input.queryClient?.trim() || "";
  const channel = input.channel || "all";

  const statusWhere: Prisma.PortalSessionWhereInput =
    input.status === "active"
      ? { revokedAt: null, expiresAt: { gt: now } }
      : input.status === "revoked"
        ? { revokedAt: { not: null } }
        : { revokedAt: null, expiresAt: { lte: now } };

  const searchWhere: Prisma.PortalSessionWhereInput = queryClient
    ? {
        OR: [
          { id: { contains: queryClient, mode: "insensitive" } },
          { clientId: { contains: queryClient, mode: "insensitive" } },
          { client: { is: { firstName: { contains: queryClient, mode: "insensitive" } } } },
          { client: { is: { middleName: { contains: queryClient, mode: "insensitive" } } } },
          { client: { is: { lastName: { contains: queryClient, mode: "insensitive" } } } },
          { client: { is: { secondLastName: { contains: queryClient, mode: "insensitive" } } } },
          { client: { is: { companyName: { contains: queryClient, mode: "insensitive" } } } },
          { client: { is: { tradeName: { contains: queryClient, mode: "insensitive" } } } },
          { client: { is: { email: { contains: queryClient, mode: "insensitive" } } } },
          { client: { is: { dpi: { contains: queryClient, mode: "insensitive" } } } }
        ]
      }
    : {};

  const rows = await safeQuery(
    "portales.sessions.list",
    [] as Array<{
      id: string;
      clientId: string;
      createdAt: Date;
      expiresAt: Date;
      revokedAt: Date | null;
      rotationCounter: number;
      client: {
        type: ClientProfileType;
        firstName: string | null;
        middleName: string | null;
        lastName: string | null;
        secondLastName: string | null;
        companyName: string | null;
        tradeName: string | null;
        email: string | null;
        phone: string | null;
      };
    }>,
    async () =>
      prisma.portalSession.findMany({
        where: {
          ...statusWhere,
          ...channelSessionWhere(channel),
          ...searchWhere
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        cursor: input.cursor?.trim() ? { id: input.cursor.trim() } : undefined,
        skip: input.cursor?.trim() ? 1 : undefined,
        select: {
          id: true,
          clientId: true,
          createdAt: true,
          expiresAt: true,
          revokedAt: true,
          rotationCounter: true,
          client: {
            select: {
              type: true,
              firstName: true,
              middleName: true,
              lastName: true,
              secondLastName: true,
              companyName: true,
              tradeName: true,
              email: true,
              phone: true
            }
          }
        }
      })
  );

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: pageRows.map((row) => ({
      id: row.id,
      clientId: row.clientId,
      clientName: resolvePortalFullName({
        type: row.client.type,
        firstName: row.client.firstName,
        middleName: row.client.middleName,
        lastName: row.client.lastName,
        secondLastName: row.client.secondLastName,
        companyName: row.client.companyName,
        tradeName: row.client.tradeName
      }),
      clientType: row.client.type,
      clientEmail: row.client.email,
      clientPhone: row.client.phone,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
      status: row.revokedAt ? "revoked" : row.expiresAt > now ? "active" : "expired",
      rotationCounter: row.rotationCounter
    })),
    nextCursor: hasMore ? pageRows[pageRows.length - 1]?.id ?? null : null
  };
}

export async function revokePortalSessionById(input: { id: string; actor: SessionUser }) {
  const sessionId = input.id.trim();
  if (!sessionId) {
    throw new Error("Sesión inválida.");
  }

  return prisma.$transaction(async (tx) => {
    const session = await tx.portalSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        clientId: true,
        revokedAt: true
      }
    });

    if (!session) {
      throw new Error("Sesión no encontrada.");
    }

    if (session.revokedAt) {
      return {
        ok: true,
        alreadyRevoked: true,
        revokedAt: session.revokedAt.toISOString()
      };
    }

    const revokedAt = new Date();
    await tx.portalSession.update({
      where: { id: sessionId },
      data: {
        revokedAt
      }
    });

    try {
      await tx.portalAuditLog.create({
        data: {
          clientId: session.clientId,
          action: "SESSION_REVOKED_BY_ADMIN",
          metadata: {
            sessionId,
            revokedByUserId: input.actor.id,
            revokedByEmail: input.actor.email
          }
        }
      });
    } catch (error) {
      if (isKnownCompatError(error)) {
        warnDevPortalesFallback("portales.sessions.revoke.audit", error);
      } else {
        throw error;
      }
    }

    return {
      ok: true,
      alreadyRevoked: false,
      revokedAt: revokedAt.toISOString()
    };
  });
}

function formatShortIdentifier(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "—";
  if (trimmed.length <= 8) return trimmed;
  return trimmed.slice(-8).toUpperCase();
}

export async function listPortalSolicitudes(input: {
  branchScope: PortalBranchScope;
  channel: PortalChannelFilter;
  activeBranchId?: string | null;
}) {
  const effectiveBranchId = input.branchScope === "active" ? normalizeIdentifier(input.activeBranchId) : null;
  if (input.branchScope === "active" && !effectiveBranchId) {
    return [] as PortalSolicitudItem[];
  }

  const requestedRows = await safeQuery(
    "portales.solicitudes.appointments",
    [] as Array<{
      id: string;
      patientId: string;
      date: Date;
      createdAt: Date;
      createdById: string;
      companyId: string | null;
      notes: string | null;
      branchId: string;
      type: {
        name: string;
      };
    }>,
    async () =>
      prisma.appointment.findMany({
        where: {
          status: AppointmentStatus.REQUESTED,
          branchId: effectiveBranchId ?? undefined
        },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          patientId: true,
          date: true,
          createdAt: true,
          createdById: true,
          companyId: true,
          notes: true,
          branchId: true,
          type: {
            select: {
              name: true
            }
          }
        }
      })
  );

  if (!requestedRows.length) return [] as PortalSolicitudItem[];

  const originByAppointment = new Map(
    requestedRows.map((row) => {
      const parsed = parsePortalRequestChannel(row.createdById);
      const companyId = normalizeIdentifier(row.companyId) ?? parsed.companyId;
      return [row.id, { channel: parsed.channel, companyId }] as const;
    })
  );

  const filteredRows = requestedRows.filter((row) => {
    const parsed = originByAppointment.get(row.id) ?? { channel: "UNKNOWN" as const, companyId: null };
    return matchesPortalChannelFilter(parsed.channel, input.channel);
  });

  if (!filteredRows.length) return [] as PortalSolicitudItem[];

  const patientIds = Array.from(new Set(filteredRows.map((row) => row.patientId)));
  const branchIds = Array.from(new Set(filteredRows.map((row) => row.branchId)));
  const companyIds = Array.from(
    new Set(
      filteredRows
        .map((row) => originByAppointment.get(row.id)?.companyId)
        .filter((value): value is string => Boolean(value))
    )
  );

  const [patients, branches, companies, companyProfiles] = await Promise.all([
    safeQuery(
      "portales.solicitudes.patients",
      [] as Array<{
        id: string;
        type: ClientProfileType;
        firstName: string | null;
        middleName: string | null;
        lastName: string | null;
        secondLastName: string | null;
        companyName: string | null;
        tradeName: string | null;
        phone: string | null;
      }>,
      async () =>
        prisma.clientProfile.findMany({
          where: { id: { in: patientIds } },
          select: {
            id: true,
            type: true,
            firstName: true,
            middleName: true,
            lastName: true,
            secondLastName: true,
            companyName: true,
            tradeName: true,
            phone: true
          }
        })
    ),
    safeQuery(
      "portales.solicitudes.branches",
      [] as Array<{ id: string; name: string }>,
      async () =>
        prisma.branch.findMany({
          where: { id: { in: branchIds } },
          select: { id: true, name: true }
        })
    ),
    companyIds.length
      ? safeQuery(
          "portales.solicitudes.companies",
          [] as Array<{
            id: string;
            legalName: string | null;
            tradeName: string | null;
            clientProfile: {
              companyName: string | null;
              tradeName: string | null;
            };
          }>,
          async () =>
            prisma.company.findMany({
              where: {
                id: { in: companyIds },
                deletedAt: null
              },
              select: {
                id: true,
                legalName: true,
                tradeName: true,
                clientProfile: {
                  select: {
                    companyName: true,
                    tradeName: true
                  }
                }
              }
            })
        )
      : Promise.resolve([]),
    companyIds.length
      ? safeQuery(
          "portales.solicitudes.companyProfiles",
          [] as Array<{
            id: string;
            type: ClientProfileType;
            firstName: string | null;
            middleName: string | null;
            lastName: string | null;
            secondLastName: string | null;
            companyName: string | null;
            tradeName: string | null;
          }>,
          async () =>
            prisma.clientProfile.findMany({
              where: {
                id: { in: companyIds },
                deletedAt: null
              },
              select: {
                id: true,
                type: true,
                firstName: true,
                middleName: true,
                lastName: true,
                secondLastName: true,
                companyName: true,
                tradeName: true
              }
            })
        )
      : Promise.resolve([])
  ]);

  const patientById = new Map(patients.map((row) => [row.id, row]));
  const branchById = new Map(branches.map((row) => [row.id, row.name]));
  const companyNameById = new Map<string, string>();

  for (const company of companies) {
    const resolvedName =
      normalizeIdentifier(company.legalName) ||
      normalizeIdentifier(company.tradeName) ||
      normalizeIdentifier(company.clientProfile.companyName) ||
      normalizeIdentifier(company.clientProfile.tradeName);
    if (resolvedName) {
      companyNameById.set(company.id, resolvedName);
    }
  }

  for (const profile of companyProfiles) {
    if (companyNameById.has(profile.id)) continue;
    const resolvedName = resolvePortalFullName({
      type: profile.type,
      firstName: profile.firstName,
      middleName: profile.middleName,
      lastName: profile.lastName,
      secondLastName: profile.secondLastName,
      companyName: profile.companyName,
      tradeName: profile.tradeName
    });
    if (resolvedName) {
      companyNameById.set(profile.id, resolvedName);
    }
  }

  return filteredRows.map((row) => {
    const parsed = parsePortalRequestNotes(row.notes, row.date);
    const origin = originByAppointment.get(row.id) ?? { channel: "UNKNOWN" as const, companyId: null };
    const companyId = origin.channel === "COMPANY_PORTAL" ? origin.companyId : null;
    const companyName = companyId ? companyNameById.get(companyId) ?? `Empresa ${formatShortIdentifier(companyId)}` : null;

    const patient = patientById.get(row.patientId);
    const patientName = patient
      ? resolvePortalFullName({
          type: patient.type,
          firstName: patient.firstName,
          middleName: patient.middleName,
          lastName: patient.lastName,
          secondLastName: patient.secondLastName,
          companyName: patient.companyName,
          tradeName: patient.tradeName
        })
      : "Paciente";

    return {
      id: row.id,
      patientId: row.patientId,
      patientName,
      patientPhone: patient?.phone ?? null,
      typeName: row.type.name,
      branchId: row.branchId,
      branchName: branchById.get(row.branchId) ?? null,
      preferredDate: parsed.preferredDate1.toISOString(),
      reason: parsed.reason,
      requestedAt: row.createdAt.toISOString(),
      channel: origin.channel,
      companyId,
      companyName
    } satisfies PortalSolicitudItem;
  });
}
