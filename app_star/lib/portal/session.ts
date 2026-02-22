import { ClientProfileType } from "@prisma/client";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import {
  buildPortalClientProfileSelect,
  readPortalClientProfilePhotoUrl,
  safeSupportsClientProfilePhotoColumns,
  type PortalClientProfileSelectResult
} from "@/lib/portal/clientProfileSchema";
import {
  PORTAL_ACCESS_TTL_MINUTES,
  PORTAL_REFRESH_COOKIE_NAME,
  PORTAL_SESSION_COOKIE_NAME,
  PORTAL_SESSION_TTL_HOURS
} from "@/lib/portal/constants";
import { generatePortalToken, hashPortalSecret } from "@/lib/portal/security";

export type PortalSessionClient = {
  id: string;
  type: ClientProfileType;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  companyName: string | null;
  dpi: string | null;
  nit: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  department: string | null;
  country: string | null;
  partyId: string | null;
  photoUrl: string | null;
};

export type PortalSessionContext = {
  sessionId: string;
  clientId: string;
  expiresAt: Date;
  refreshExpiresAt: Date | null;
  authSource: "access" | "refresh_fallback";
  client: PortalSessionClient;
};

export type PortalSessionCookieOptions = {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
  expires: Date;
};

export type PortalSessionTokenPair = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
};

type PortalSessionWithClientRow = {
  id: string;
  clientId: string;
  expiresAt: Date;
  refreshExpiresAt: Date | null;
  client: PortalClientProfileSelectResult;
};

type PortalSessionCoreRow = {
  id: string;
  clientId: string;
  ipHash: string | null;
  userAgentHash: string | null;
  expiresAt: Date;
  refreshExpiresAt: Date | null;
  rotationCounter: number;
};

function buildExpiry(now: Date) {
  return {
    accessExpiresAt: new Date(now.getTime() + PORTAL_ACCESS_TTL_MINUTES * 60_000),
    refreshExpiresAt: new Date(now.getTime() + PORTAL_SESSION_TTL_HOURS * 60 * 60_000)
  };
}

function mapSessionClient(profile: PortalClientProfileSelectResult): PortalSessionClient {
  return {
    id: profile.id,
    type: profile.type,
    firstName: profile.firstName ?? null,
    middleName: profile.middleName ?? null,
    lastName: profile.lastName ?? null,
    secondLastName: profile.secondLastName ?? null,
    companyName: profile.companyName ?? null,
    dpi: profile.dpi ?? null,
    nit: profile.nit ?? null,
    email: profile.email ?? null,
    phone: profile.phone ?? null,
    address: profile.address ?? null,
    city: profile.city ?? null,
    department: profile.department ?? null,
    country: profile.country ?? null,
    partyId: profile.partyId ?? null,
    photoUrl: readPortalClientProfilePhotoUrl(profile)
  };
}

function mapSessionContext(row: PortalSessionWithClientRow, authSource: PortalSessionContext["authSource"]): PortalSessionContext {
  return {
    sessionId: row.id,
    clientId: row.clientId,
    expiresAt: row.expiresAt,
    refreshExpiresAt: row.refreshExpiresAt ?? null,
    authSource,
    client: mapSessionClient(row.client)
  };
}

function buildCookieOptions(name: string, token: string, expiresAt: Date): PortalSessionCookieOptions {
  const now = Date.now();
  const maxAge = Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000));
  return {
    name,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/portal",
    maxAge,
    expires: expiresAt
  };
}

export function buildPortalSessionCookieOptions(token: string, expiresAt: Date): PortalSessionCookieOptions {
  return buildCookieOptions(PORTAL_SESSION_COOKIE_NAME, token, expiresAt);
}

export function buildPortalRefreshCookieOptions(token: string, expiresAt: Date): PortalSessionCookieOptions {
  return buildCookieOptions(PORTAL_REFRESH_COOKIE_NAME, token, expiresAt);
}

export function applyPortalSessionCookies(response: NextResponse, tokens: PortalSessionTokenPair) {
  response.cookies.set(buildPortalSessionCookieOptions(tokens.accessToken, tokens.accessExpiresAt));
  response.cookies.set(buildPortalRefreshCookieOptions(tokens.refreshToken, tokens.refreshExpiresAt));
}

export function clearPortalSessionCookies(response: NextResponse) {
  response.cookies.set({
    name: PORTAL_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/portal",
    maxAge: 0
  });
  response.cookies.set({
    name: PORTAL_REFRESH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/portal",
    maxAge: 0
  });
}

function issuePortalTokenPair(now = new Date()): { tokens: PortalSessionTokenPair; hashes: { accessHash: string; refreshHash: string } } {
  const accessToken = generatePortalToken(32);
  const refreshToken = generatePortalToken(48);
  const expiry = buildExpiry(now);
  return {
    tokens: {
      accessToken,
      refreshToken,
      accessExpiresAt: expiry.accessExpiresAt,
      refreshExpiresAt: expiry.refreshExpiresAt
    },
    hashes: {
      accessHash: hashPortalSecret(accessToken),
      refreshHash: hashPortalSecret(refreshToken)
    }
  };
}

async function buildSessionWithClientSelect(where: {
  sessionTokenHash?: string;
  refreshTokenHash?: string;
  includeExpiredAccess?: boolean;
}) {
  const supportsPhoto = await safeSupportsClientProfilePhotoColumns("portal.session");
  const clientSelect = buildPortalClientProfileSelect(supportsPhoto);
  const now = new Date();

  return prisma.portalSession.findFirst({
    where: {
      revokedAt: null,
      sessionTokenHash: where.sessionTokenHash,
      refreshTokenHash: where.refreshTokenHash,
      expiresAt: where.includeExpiredAccess ? undefined : { gt: now },
      refreshExpiresAt: where.refreshTokenHash ? { gt: now } : undefined
    },
    select: {
      id: true,
      clientId: true,
      expiresAt: true,
      refreshExpiresAt: true,
      client: { select: clientSelect }
    }
  }) as Promise<PortalSessionWithClientRow | null>;
}

async function findPortalSessionCoreByRefreshHash(refreshTokenHash: string) {
  return prisma.portalSession.findFirst({
    where: {
      refreshTokenHash,
      revokedAt: null,
      refreshExpiresAt: { gt: new Date() }
    },
    select: {
      id: true,
      clientId: true,
      ipHash: true,
      userAgentHash: true,
      expiresAt: true,
      refreshExpiresAt: true,
      rotationCounter: true
    }
  }) as Promise<PortalSessionCoreRow | null>;
}

export async function createPortalSession(input: {
  clientId: string;
  ipHash?: string | null;
  userAgentHash?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const pair = issuePortalTokenPair(now);

  let created: { id: string; clientId: string; expiresAt: Date; refreshExpiresAt: Date | null };
  try {
    created = await prisma.portalSession.create({
      data: {
        clientId: input.clientId,
        sessionTokenHash: pair.hashes.accessHash,
        refreshTokenHash: pair.hashes.refreshHash,
        expiresAt: pair.tokens.accessExpiresAt,
        refreshExpiresAt: pair.tokens.refreshExpiresAt,
        ipHash: input.ipHash ?? null,
        userAgentHash: input.userAgentHash ?? null
      },
      select: { id: true, clientId: true, expiresAt: true, refreshExpiresAt: true }
    });
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("portal.session.create", error);
    }
    throw error;
  }

  return {
    id: created.id,
    clientId: created.clientId,
    accessExpiresAt: created.expiresAt,
    refreshExpiresAt: created.refreshExpiresAt ?? pair.tokens.refreshExpiresAt,
    tokens: pair.tokens
  };
}

export async function findPortalSessionByAccessToken(rawAccessToken: string) {
  const sessionTokenHash = hashPortalSecret(rawAccessToken);
  let row: PortalSessionWithClientRow | null = null;

  try {
    row = await buildSessionWithClientSelect({
      sessionTokenHash
    });
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("portal.session.findByAccessToken", error);
      return null;
    }
    throw error;
  }
  return row ? mapSessionContext(row, "access") : null;
}

export async function findPortalSessionByRefreshToken(rawRefreshToken: string) {
  const refreshTokenHash = hashPortalSecret(rawRefreshToken);
  let row: PortalSessionWithClientRow | null = null;

  try {
    row = await buildSessionWithClientSelect({
      refreshTokenHash,
      includeExpiredAccess: true
    });
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("portal.session.findByRefreshToken", error);
      return null;
    }
    throw error;
  }
  return row ? mapSessionContext(row, "refresh_fallback") : null;
}

export async function rotatePortalSessionByRefreshToken(input: {
  refreshToken: string;
  ipHash?: string | null;
  userAgentHash?: string | null;
  reason: "API_REFRESH" | "SERVER_FALLBACK";
}) {
  const now = new Date();
  const usedRefreshTokenHash = hashPortalSecret(input.refreshToken);
  const strictBinding = process.env.PORTAL_REFRESH_BIND_STRICT === "1";

  const replayLog = await prisma.portalSessionRotationLog.findUnique({
    where: { usedRefreshTokenHash },
    select: { sessionId: true }
  });
  if (replayLog) {
    await prisma.portalSession.updateMany({
      where: { id: replayLog.sessionId, revokedAt: null },
      data: { revokedAt: now }
    });
    return { ok: false as const, reason: "REPLAY" as const };
  }

  const current = await findPortalSessionCoreByRefreshHash(usedRefreshTokenHash);
  if (!current) {
    return { ok: false as const, reason: "INVALID" as const };
  }

  if (
    strictBinding &&
    ((current.ipHash && input.ipHash && current.ipHash !== input.ipHash) ||
      (current.userAgentHash && input.userAgentHash && current.userAgentHash !== input.userAgentHash))
  ) {
    await prisma.portalSession.update({
      where: { id: current.id },
      data: { revokedAt: now }
    });
    return { ok: false as const, reason: "BINDING_MISMATCH" as const };
  }

  const pair = issuePortalTokenPair(now);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.portalSessionRotationLog.create({
        data: {
          sessionId: current.id,
          usedRefreshTokenHash,
          reason: input.reason,
          ipHash: input.ipHash ?? null,
          userAgentHash: input.userAgentHash ?? null
        }
      });

      const updateResult = await tx.portalSession.updateMany({
        where: {
          id: current.id,
          revokedAt: null,
          refreshTokenHash: usedRefreshTokenHash
        },
        data: {
          sessionTokenHash: pair.hashes.accessHash,
          refreshTokenHash: pair.hashes.refreshHash,
          expiresAt: pair.tokens.accessExpiresAt,
          refreshExpiresAt: pair.tokens.refreshExpiresAt,
          refreshConsumedAt: null,
          lastRotatedAt: now,
          rotationCounter: { increment: 1 }
        }
      });

      if (updateResult.count !== 1) return null;
      return tx.portalSession.findUnique({
        where: { id: current.id },
        select: { id: true, clientId: true, expiresAt: true, refreshExpiresAt: true, rotationCounter: true }
      });
    });

    if (!updated) {
      return { ok: false as const, reason: "RACE" as const };
    }

    return {
      ok: true as const,
      sessionId: updated.id,
      clientId: updated.clientId,
      rotationCounter: updated.rotationCounter,
      tokens: pair.tokens
    };
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("portal.session.rotateByRefresh", error);
      return { ok: false as const, reason: "MISSING_TABLE" as const };
    }
    throw error;
  }
}

export async function getPortalSessionContextFromCookies() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(PORTAL_SESSION_COOKIE_NAME)?.value?.trim() ?? "";
  if (accessToken) {
    const byAccess = await findPortalSessionByAccessToken(accessToken);
    if (byAccess) return byAccess;
  }

  const refreshToken = cookieStore.get(PORTAL_REFRESH_COOKIE_NAME)?.value?.trim() ?? "";
  if (!refreshToken) return null;
  return findPortalSessionByRefreshToken(refreshToken);
}

export async function getPortalSessionContextFromRequest(req: NextRequest) {
  const accessToken = req.cookies.get(PORTAL_SESSION_COOKIE_NAME)?.value?.trim() ?? "";
  if (accessToken) {
    const byAccess = await findPortalSessionByAccessToken(accessToken);
    if (byAccess) return byAccess;
  }

  const refreshToken = req.cookies.get(PORTAL_REFRESH_COOKIE_NAME)?.value?.trim() ?? "";
  if (!refreshToken) return null;
  return findPortalSessionByRefreshToken(refreshToken);
}

export async function requirePortalSessionContext() {
  const session = await getPortalSessionContextFromCookies();
  if (!session) redirect("/portal");
  return session;
}

export async function revokePortalSession(input: { accessToken?: string | null; refreshToken?: string | null }) {
  const accessToken = String(input.accessToken || "").trim();
  const refreshToken = String(input.refreshToken || "").trim();
  if (!accessToken && !refreshToken) return null;

  const where = accessToken
    ? { sessionTokenHash: hashPortalSecret(accessToken), revokedAt: null as null }
    : { refreshTokenHash: hashPortalSecret(refreshToken), revokedAt: null as null };

  let current: { id: string; clientId: string } | null = null;
  try {
    current = await prisma.portalSession.findFirst({
      where,
      select: { id: true, clientId: true }
    });
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("portal.session.revoke.findFirst", error);
      return null;
    }
    throw error;
  }
  if (!current) return null;

  try {
    await prisma.portalSession.update({
      where: { id: current.id },
      data: { revokedAt: new Date() }
    });
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("portal.session.revoke.update", error);
      return null;
    }
    throw error;
  }

  return current;
}
