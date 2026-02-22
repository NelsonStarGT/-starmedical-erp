import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { computeUserPermissionProfile } from "@/lib/security/permissionService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) {
    return NextResponse.json({ authenticated: false, userId: null, email: null, role: null, permissions: [] });
  }

  let dbUser =
    (session.id &&
      (await prisma.user.findUnique({
        where: { id: session.id },
        include: {
          roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
          userPermissions: { include: { permission: true } }
        }
      }))) ||
    (session.email &&
      (await prisma.user.findUnique({
        where: { email: session.email },
        include: {
          roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
          userPermissions: { include: { permission: true } }
        }
      })));

  if (!dbUser) {
    return NextResponse.json({
      authenticated: true,
      userId: session.id || null,
      email: session.email || null,
      role: session.roles?.[0] || null,
      permissions: session.permissions || []
    });
  }

  const profile = computeUserPermissionProfile(dbUser as any);
  const role = profile.roleNames[0] || session.roles?.[0] || null;

  return NextResponse.json({
    authenticated: true,
    userId: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role,
    roles: profile.roleNames,
    permissions: profile.effective
  });
}
