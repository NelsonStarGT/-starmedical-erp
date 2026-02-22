#!/usr/bin/env tsx
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { ALL_PERMISSION_KEYS, ROLE_PERMISSION_MAP } from "@/lib/security/permissionCatalog";

const prisma = new PrismaClient();

const EMAIL = process.env.SUPER_ADMIN_EMAIL;
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "Star1234@";
const DISPLAY_NAME = process.env.SUPER_ADMIN_NAME || "Nelson Lopez";

async function ensurePermissions() {
  const permMap: Record<string, string> = {};
  for (const key of ALL_PERMISSION_KEYS) {
    const [module = "GENERAL", area = "GENERAL", action = "READ"] = key.split(":");
    const perm = await prisma.permission.upsert({
      where: { key },
      update: { module, area, action },
      create: { key, module, area, action }
    });
    permMap[key] = perm.id;
  }
  return permMap;
}

async function ensureRoles(permMap: Record<string, string>) {
  const roles = await prisma.$transaction(async (tx) => {
    const created: Record<string, string> = {};
    for (const roleName of Object.keys(ROLE_PERMISSION_MAP)) {
      const role = await tx.role.upsert({
        where: { name: roleName },
        update: { description: roleName, isSystem: roleName === "SUPER_ADMIN" || roleName === "ADMIN" },
        create: { name: roleName, description: roleName, isSystem: roleName === "SUPER_ADMIN" || roleName === "ADMIN" }
      });
      created[roleName] = role.id;
      // reset permissions to catalog
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      const perms = (ROLE_PERMISSION_MAP[roleName] || []).map((p) => permMap[p]).filter(Boolean);
      if (perms.length) {
        await tx.rolePermission.createMany({
          data: perms.map((permissionId) => ({ roleId: role.id, permissionId })),
          skipDuplicates: true
        });
      }
    }
    return created;
  });
  return roles;
}

async function ensureUser(roleIds: Record<string, string>) {
  if (!EMAIL) throw new Error("SUPER_ADMIN_EMAIL no está definido en el entorno (.env)");
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { isActive: true, name: DISPLAY_NAME || existing.name || null }
      })
    : await prisma.user.create({
        data: {
          email: EMAIL,
          name: DISPLAY_NAME,
          passwordHash,
          isActive: true
        }
      });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: roleIds["SUPER_ADMIN"] } },
    update: {},
    create: { userId: user.id, roleId: roleIds["SUPER_ADMIN"] }
  });

  // ensure profile exists for contact/addresses (empty defaults)
  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, phone: null }
  });

  return user;
}

async function main() {
  const permMap = await ensurePermissions();
  const roleIds = await ensureRoles(permMap);
  const user = await ensureUser(roleIds);
  console.log(`[bootstrap-super-admin] SUPER_ADMIN asegurado: ${user.email} (id=${user.id})`);
}

main()
  .catch((err) => {
    console.error("[bootstrap-super-admin] failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
