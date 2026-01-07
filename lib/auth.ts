import { NextRequest, NextResponse } from "next/server";
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
  branchId?: string | null;
};

function signToken(payload: Omit<SessionUser, "permissions"> & { permissions: string[] }) {
  return jwt.sign(payload, AUTH_SECRET, { expiresIn: SESSION_TTL_SECONDS });
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
    branchId: decoded.branchId || null
  };
}

export function requireAuth(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) {
    return { user: null, errorResponse: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }
  return { user, errorResponse: null };
}

export function createLoginResponse(sessionUser: SessionUser) {
  const response = NextResponse.json({ email: sessionUser.email, name: sessionUser.name });
  const token = signToken(sessionUser);
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS
  });
  return response;
}

export const createLogoutResponse = () => {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
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
