import { NextRequest, NextResponse } from "next/server";
import { createLoginResponse, validatePassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { buildPermissionsFromRoles, normalizeRoleName } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Faltan credenciales" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } }
    });

    if (!user || !user.isActive) {
      await auditLog({
        action: "LOGIN_FAILED",
        entityType: "SECURITY",
        entityId: "login",
        metadata: { email },
        req: request,
        before: null,
        after: null,
        user: null
      });
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const ok = await validatePassword(password, user.passwordHash);
    if (!ok) {
      await auditLog({
        action: "LOGIN_FAILED",
        entityType: "SECURITY",
        entityId: user.id,
        metadata: { email },
        req: request,
        before: null,
        after: null,
        user: null
      });
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const roleNames = user.roles.map((r) => normalizeRoleName(r.role.name));
    const permissions = buildPermissionsFromRoles(
      roleNames,
      user.roles.map((r) => (r.role.permissions || []).map((p) => p.permission.key))
    );
    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: roleNames,
      permissions,
      branchId: user.branchId || null
    };

    await auditLog({
      action: "LOGIN_SUCCESS",
      entityType: "SECURITY",
      entityId: user.id,
      metadata: { email },
      req: request,
      user: sessionUser
    });

    return createLoginResponse(sessionUser);
  } catch (err: any) {
    console.error("login error", err);
    return NextResponse.json({ error: "No se pudo iniciar sesión" }, { status: 500 });
  }
}
