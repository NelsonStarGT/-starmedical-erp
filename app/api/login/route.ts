import { NextRequest, NextResponse } from "next/server";
import { createLoginResponse, validatePassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { computeUserPermissionProfile } from "@/lib/security/permissionService";
import { enforceRateLimit } from "@/lib/api/rateLimit";
import { getTenantSecurityPolicy } from "@/lib/config-central";
import { normalizeTenantId } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVALID_CREDENTIALS_MESSAGE = "Credenciales inválidas";
const IS_PROD = process.env.NODE_ENV === "production";

function resolveClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const requestIp = (request as { ip?: string | null }).ip;
  return requestIp || forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function authError(message: string, status = 401) {
  return NextResponse.json({ error: IS_PROD ? INVALID_CREDENTIALS_MESSAGE : message }, { status });
}

function hasBcryptHash(hash?: string | null) {
  return typeof hash === "string" && /^\$2[aby]\$\d{2}\$/.test(hash);
}

function ipAllowed(clientIp: string, allowlist: string[]) {
  if (!allowlist.length) return true;
  return allowlist.some((entry) => entry.trim() === clientIp);
}

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, { limit: 30, windowMs: 60_000 });
    const { email, password, rememberMe } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: "Faltan credenciales" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        userPermissions: { include: { permission: true } }
      }
    });

    if (!user) {
      await auditLog({
        action: "LOGIN_FAILED",
        entityType: "SECURITY",
        entityId: "login",
        metadata: { email: normalizedEmail, reason: "user_not_found" },
        tenantId: null,
        req: request,
        before: null,
        after: null,
        user: null
      });
      return authError("Usuario no existe", 401);
    }

    if (!user.isActive) {
      const tenantId = normalizeTenantId(user.tenantId);
      await auditLog({
        action: "LOGIN_FAILED",
        entityType: "SECURITY",
        entityId: user.id,
        metadata: { email: normalizedEmail, reason: "user_inactive" },
        tenantId,
        req: request,
        before: null,
        after: null,
        user: null
      });
      return authError("Usuario inactivo", 403);
    }

    const tenantId = normalizeTenantId(user.tenantId);
    const policy = await getTenantSecurityPolicy(tenantId);
    const clientIp = resolveClientIp(request);

    if (!ipAllowed(clientIp, policy.ipAllowlist)) {
      await auditLog({
        action: "LOGIN_BLOCKED_IP_ALLOWLIST",
        entityType: "SECURITY",
        entityId: user.id,
        metadata: {
          email: normalizedEmail,
          clientIp,
          allowlist: policy.ipAllowlist
        },
        tenantId,
        req: request,
        user: null
      });
      return NextResponse.json({ error: "Acceso bloqueado por política IP del tenant." }, { status: 403 });
    }

    const lockoutWindowStart = new Date(Date.now() - policy.lockoutMinutes * 60_000);
    const failedAttemptsInWindow = await prisma.auditLog.count({
      where: {
        tenantId,
        action: "LOGIN_FAILED",
        entityType: "SECURITY",
        entityId: user.id,
        createdAt: {
          gte: lockoutWindowStart
        }
      }
    });

    if (failedAttemptsInWindow >= policy.maxLoginAttempts) {
      await auditLog({
        action: "LOGIN_BLOCKED_LOCKOUT",
        entityType: "SECURITY",
        entityId: user.id,
        metadata: {
          email: normalizedEmail,
          lockoutMinutes: policy.lockoutMinutes,
          failedAttemptsInWindow,
          maxLoginAttempts: policy.maxLoginAttempts
        },
        tenantId,
        req: request,
        user: null
      });
      return NextResponse.json(
        { error: `Cuenta temporalmente bloqueada. Reintenta en ${policy.lockoutMinutes} minutos.` },
        { status: 423 }
      );
    }

    if (!hasBcryptHash(user.passwordHash)) {
      await auditLog({
        action: "LOGIN_FAILED",
        entityType: "SECURITY",
        entityId: user.id,
        metadata: {
          email: normalizedEmail,
          reason: "invalid_password_hash"
        },
        tenantId,
        req: request,
        before: null,
        after: null,
        user: null
      });
      return authError("Hash/algoritmo de contraseña desalineado", 401);
    }

    let ok = false;
    try {
      ok = await validatePassword(password, user.passwordHash);
    } catch (error: any) {
      await auditLog({
        action: "LOGIN_FAILED",
        entityType: "SECURITY",
        entityId: user.id,
        metadata: {
          email: normalizedEmail,
          reason: "password_hash_validation_error",
          details: String(error?.message || error)
        },
        tenantId,
        req: request,
        before: null,
        after: null,
        user: null
      });
      return authError("Hash/algoritmo de contraseña desalineado", 401);
    }

    if (!ok) {
      const nextAttempts = failedAttemptsInWindow + 1;
      await auditLog({
        action: "LOGIN_FAILED",
        entityType: "SECURITY",
        entityId: user.id,
        metadata: {
          email: normalizedEmail,
          failedAttemptsInWindow: nextAttempts,
          maxLoginAttempts: policy.maxLoginAttempts
        },
        tenantId,
        req: request,
        before: null,
        after: null,
        user: null
      });

      if (nextAttempts >= policy.maxLoginAttempts) {
        return NextResponse.json(
          { error: `Cuenta temporalmente bloqueada. Reintenta en ${policy.lockoutMinutes} minutos.` },
          { status: 423 }
        );
      }

      return NextResponse.json(
        {
          error: IS_PROD ? INVALID_CREDENTIALS_MESSAGE : "Contraseña incorrecta",
          attemptsLeft: Math.max(policy.maxLoginAttempts - nextAttempts, 0)
        },
        { status: 401 }
      );
    }

    const profile = computeUserPermissionProfile(user);
    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: profile.roleNames,
      permissions: profile.effective,
      deniedPermissions: profile.denies,
      branchId: user.branchId || null,
      tenantId,
      legalEntityId: null
    };

    const rememberMeRequested = rememberMe === true;
    const rememberMeApplied = rememberMeRequested && policy.allowRememberMe;
    const sessionTtlSeconds = Math.max(policy.sessionTimeoutMinutes * 60, 300);

    if (policy.enforce2FA) {
      await auditLog({
        action: "LOGIN_BLOCKED_2FA_REQUIRED",
        entityType: "SECURITY",
        entityId: user.id,
        metadata: {
          email: normalizedEmail,
          tenantId,
          reason: "tenant_enforce2fa_without_runtime_flow"
        },
        tenantId,
        req: request,
        user: null
      });

      return NextResponse.json(
        {
          error: "El tenant exige 2FA, pero el flujo real de 2FA aún no está habilitado para login.",
          code: "TWO_FACTOR_REQUIRED_UNAVAILABLE"
        },
        { status: 501 }
      );
    }

    await auditLog({
      action: "LOGIN_SUCCESS",
      entityType: "SECURITY",
      entityId: user.id,
      metadata: {
        email: normalizedEmail,
        rememberMeRequested,
        rememberMeApplied,
        sessionTimeoutMinutes: policy.sessionTimeoutMinutes,
        enforce2FA: policy.enforce2FA
      },
      tenantId,
      req: request,
      user: sessionUser
    });

    return createLoginResponse(sessionUser, {
      tokenTtlSeconds: sessionTtlSeconds,
      maxAgeSeconds: sessionTtlSeconds,
      persistent: rememberMeApplied,
      sameSite: "strict"
    });
  } catch (err: any) {
    if (err && typeof err === "object" && "status" in err && (err as { status?: unknown }).status === 429) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Espera un momento para reintentar.", code: "RATE_LIMIT" },
        { status: 429 }
      );
    }

    console.error("login error", err);
    return NextResponse.json({ error: "No se pudo iniciar sesión" }, { status: 500 });
  }
}
