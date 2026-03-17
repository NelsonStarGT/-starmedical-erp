#!/usr/bin/env tsx
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { assertPasswordPolicy } from "@/lib/password-policy";
import { syncPersistedRbac } from "@/lib/security/rbacSync";

process.loadEnvFile?.(".env");
process.loadEnvFile?.(".env.local");

const prisma = new PrismaClient();

const EMAIL = process.env.SUPER_ADMIN_EMAIL;
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "Star12345@";
const DISPLAY_NAME = process.env.SUPER_ADMIN_NAME || "Nelson Lopez";

async function resolveTenantPasswordPolicy(tenantId: string) {
  const defaults = {
    passwordMinLength: 10,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumber: true,
    passwordRequireSymbol: false
  };

  const delegate = (prisma as any).tenantSecurityPolicy;
  if (!delegate?.findUnique) return defaults;

  const row = await delegate.findUnique({ where: { tenantId } });
  if (!row) return defaults;

  return {
    passwordMinLength: row.passwordMinLength ?? defaults.passwordMinLength,
    passwordRequireUppercase: row.passwordRequireUppercase ?? defaults.passwordRequireUppercase,
    passwordRequireLowercase: row.passwordRequireLowercase ?? defaults.passwordRequireLowercase,
    passwordRequireNumber: row.passwordRequireNumber ?? defaults.passwordRequireNumber,
    passwordRequireSymbol: row.passwordRequireSymbol ?? defaults.passwordRequireSymbol
  };
}

async function ensureUser() {
  if (!EMAIL) throw new Error("SUPER_ADMIN_EMAIL no está definido en el entorno (.env)");
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  const tenantId = existing?.tenantId || "global";
  const passwordPolicy = await resolveTenantPasswordPolicy(tenantId);
  assertPasswordPolicy(PASSWORD, passwordPolicy);
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { isActive: true, name: DISPLAY_NAME || existing.name || null, passwordHash, tenantId }
      })
    : await prisma.user.create({
        data: {
          email: EMAIL,
          name: DISPLAY_NAME,
          passwordHash,
          isActive: true,
          tenantId
        }
      });

  const role = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" }, select: { id: true } });
  if (!role) throw new Error("Rol SUPER_ADMIN no encontrado tras sincronizar RBAC.");

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id }
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
  await syncPersistedRbac(prisma);
  const user = await ensureUser();
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
