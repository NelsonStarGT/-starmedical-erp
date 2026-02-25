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
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded?.id || !decoded?.email) return null;
  return {
    id: decoded.id,
    email: decoded.email,
    name: decoded.name,
    roles: decoded.roles || [],
    permissions: decoded.permissions || [],
    deniedPermissions: decoded.deniedPermissions || [],
    branchId: decoded.branchId || null,
    tenantId: decoded.tenantId || null,
    branchAccessMode: decoded.branchAccessMode || null,
    allowedBranchIds: Array.isArray(decoded.allowedBranchIds) ? decoded.allowedBranchIds : [],
    canSwitchBranch: Boolean(decoded.canSwitchBranch),
    legalEntityId: decoded.legalEntityId || null
  };
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
  const token = typeof (resolvedStore as any).get === "function" ? resolvedStore.get(AUTH_COOKIE_NAME)?.value : undefined;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded?.id || !decoded?.email) return null;
  return {
    id: decoded.id,
    email: decoded.email,
    name: decoded.name,
    roles: decoded.roles || [],
    permissions: decoded.permissions || [],
    deniedPermissions: decoded.deniedPermissions || [],
    branchId: decoded.branchId || null,
    tenantId: decoded.tenantId || null,
    branchAccessMode: decoded.branchAccessMode || null,
    allowedBranchIds: Array.isArray(decoded.allowedBranchIds) ? decoded.allowedBranchIds : [],
    canSwitchBranch: Boolean(decoded.canSwitchBranch),
    legalEntityId: decoded.legalEntityId || null
  } as SessionUser;
}
