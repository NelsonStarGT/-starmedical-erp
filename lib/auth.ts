import { NextRequest, NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { AUTH_COOKIE_NAME } from "./constants";
import { buildPermissionsFromRoles } from "./rbac";

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-star-secret";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8h

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  roles: string[];
  permissions: string[];
  deniedPermissions?: string[];
  branchId?: string | null;
  tenantId?: string | null;
  branchAccessMode?: "LOCKED" | "SWITCH" | null;
  allowedBranchIds?: string[];
  canSwitchBranch?: boolean;
  legalEntityId?: string | null;
};

type CookieReaderLike = {
  get?: (name: string) => { value?: string } | undefined;
};

function toSessionUser(decoded: unknown): SessionUser | null {
  if (!decoded || typeof decoded !== "object") return null;
  const value = decoded as Record<string, unknown>;
  if (typeof value.id !== "string" || typeof value.email !== "string") return null;
  return {
    id: value.id,
    email: value.email,
    name: typeof value.name === "string" ? value.name : null,
    roles: Array.isArray(value.roles) ? value.roles.filter((item): item is string => typeof item === "string") : [],
    permissions: Array.isArray(value.permissions)
      ? value.permissions.filter((item): item is string => typeof item === "string")
      : [],
    deniedPermissions: Array.isArray(value.deniedPermissions)
      ? value.deniedPermissions.filter((item): item is string => typeof item === "string")
      : [],
    branchId: typeof value.branchId === "string" ? value.branchId : null,
    tenantId: typeof value.tenantId === "string" ? value.tenantId : null,
    branchAccessMode: value.branchAccessMode === "LOCKED" || value.branchAccessMode === "SWITCH" ? value.branchAccessMode : null,
    allowedBranchIds: Array.isArray(value.allowedBranchIds)
      ? value.allowedBranchIds.filter((item): item is string => typeof item === "string")
      : [],
    canSwitchBranch: Boolean(value.canSwitchBranch),
    legalEntityId: typeof value.legalEntityId === "string" ? value.legalEntityId : null
  };
}

function resolveTokenFromCookieReader(reader: CookieReaderLike | null | undefined): string | null {
  if (!reader || typeof reader.get !== "function") return null;
  const raw = reader.get(AUTH_COOKIE_NAME)?.value;
  return typeof raw === "string" && raw.trim().length > 0 ? raw : null;
}

function resolveSessionUserFromToken(token: string | null | undefined): SessionUser | null {
  if (!token) return null;
  const decoded = verifyToken(token);
  return toSessionUser(decoded);
}

function signToken(payload: SessionUser, ttlSeconds = SESSION_TTL_SECONDS) {
  return jwt.sign(payload, AUTH_SECRET, { expiresIn: ttlSeconds });
}

function verifyToken(token: string) {
  try {
    return jwt.verify(token, AUTH_SECRET) as any;
  } catch {
    return null;
  }
}

export function getSessionUser(req: NextRequest): SessionUser | null {
  return resolveSessionUserFromToken(resolveTokenFromCookieReader(req.cookies as unknown as CookieReaderLike));
}

export function requireAuth(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) {
    return { user: null, errorResponse: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }
  return { user, errorResponse: null };
}

export function createLoginResponse(
  sessionUser: SessionUser,
  options?: {
    maxAgeSeconds?: number;
    tokenTtlSeconds?: number;
    persistent?: boolean;
    sameSite?: "lax" | "strict" | "none";
  }
) {
  const response = NextResponse.json({ email: sessionUser.email, name: sessionUser.name });
  const maxAgeSeconds = Number(options?.maxAgeSeconds);
  const tokenTtlCandidate = Number(options?.tokenTtlSeconds);
  const ttlSeconds =
    Number.isInteger(tokenTtlCandidate) && tokenTtlCandidate > 0
      ? tokenTtlCandidate
      : Number.isInteger(maxAgeSeconds) && maxAgeSeconds > 0
        ? maxAgeSeconds
        : SESSION_TTL_SECONDS;
  const token = signToken(sessionUser, ttlSeconds);
  const cookiePayload: {
    name: string;
    value: string;
    httpOnly: true;
    path: "/";
    sameSite: "lax" | "strict" | "none";
    secure: boolean;
    maxAge?: number;
  } = {
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: "/",
    sameSite: options?.sameSite || "strict",
    secure: process.env.NODE_ENV === "production"
  };
  const persistent = options?.persistent !== false;
  if (persistent) {
    cookiePayload.maxAge = Number.isInteger(maxAgeSeconds) && maxAgeSeconds > 0 ? maxAgeSeconds : ttlSeconds;
  }
  response.cookies.set(cookiePayload);
  return response;
}

export const createLogoutResponse = () => {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0
  });
  return response;
};

export const hasValidSession = (cookieValue?: string | null) => {
  if (!cookieValue) return false;
  return Boolean(verifyToken(cookieValue));
};

export async function validatePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function getSessionUserFromCookies(
  cookieStore?: Awaited<ReturnType<typeof nextCookies>> | Promise<Awaited<ReturnType<typeof nextCookies>>>
) {
  const storeCandidate = typeof cookieStore === "function" ? (cookieStore as any)() : cookieStore || nextCookies();
  const resolvedStore = await storeCandidate;
  const token = resolveTokenFromCookieReader(resolvedStore as unknown as CookieReaderLike);
  return resolveSessionUserFromToken(token);
}

export async function requireAuthenticatedUser(reqOrCookieStore?: NextRequest | Awaited<ReturnType<typeof nextCookies>> | Promise<Awaited<ReturnType<typeof nextCookies>>>) {
  const user =
    reqOrCookieStore && typeof reqOrCookieStore === "object" && "cookies" in reqOrCookieStore
      ? await getSessionUserFromCookies((reqOrCookieStore as NextRequest).cookies as unknown as Awaited<ReturnType<typeof nextCookies>>)
      : await getSessionUserFromCookies(reqOrCookieStore as Awaited<ReturnType<typeof nextCookies>> | Promise<Awaited<ReturnType<typeof nextCookies>>> | undefined);

  if (!user) {
    return { user: null, errorResponse: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }

  return { user, errorResponse: null };
}
