#!/usr/bin/env tsx
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { assertPasswordPolicy } from "@/lib/password-policy";
import { syncPersistedRbac } from "@/lib/security/rbacSync";
import { normalizeTenantId } from "@/lib/tenant";

process.loadEnvFile?.(".env");
process.loadEnvFile?.(".env.local");

const prisma = new PrismaClient();

const EMAIL = String(process.env.EMERGENCY_ADMIN_EMAIL || "").trim().toLowerCase();
const PASSWORD = String(process.env.EMERGENCY_ADMIN_PASSWORD || "").trim();
const NAME = String(process.env.EMERGENCY_ADMIN_NAME || "Emergency Admin").trim();
const TENANT_ID = normalizeTenantId(process.env.EMERGENCY_ADMIN_TENANT || "global");
const BRANCH_ID = String(process.env.EMERGENCY_ADMIN_BRANCH_ID || "").trim() || null;
const BREAK_GLASS_TAG = String(process.env.EMERGENCY_ADMIN_TAG || "break-glass").trim() || "break-glass";

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

async function main() {
  if (!EMAIL) {
    throw new Error("EMERGENCY_ADMIN_EMAIL es requerido.");
  }
  if (!PASSWORD) {
    throw new Error("EMERGENCY_ADMIN_PASSWORD es requerido.");
  }

  await syncPersistedRbac(prisma);

  const superAdminRole = await prisma.role.findUnique({
    where: { name: "SUPER_ADMIN" },
    select: { id: true }
  });
  if (!superAdminRole) {
    throw new Error("Rol SUPER_ADMIN no encontrado tras sincronizar RBAC.");
  }

  const passwordPolicy = await resolveTenantPasswordPolicy(TENANT_ID);
  assertPasswordPolicy(PASSWORD, passwordPolicy);
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {
      name: NAME,
      passwordHash,
      isActive: true,
      tenantId: TENANT_ID,
      branchId: BRANCH_ID
    },
    create: {
      email: EMAIL,
      name: NAME,
      passwordHash,
      isActive: true,
      tenantId: TENANT_ID,
      branchId: BRANCH_ID
    }
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: user.id, roleId: superAdminRole.id }
  });

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, phone: null }
  });

  if (BRANCH_ID) {
    await prisma.userBranchAccess.upsert({
      where: { userId_branchId: { userId: user.id, branchId: BRANCH_ID } },
      update: { tenantId: TENANT_ID, accessMode: "LOCKED", isDefault: true },
      create: {
        userId: user.id,
        tenantId: TENANT_ID,
        branchId: BRANCH_ID,
        accessMode: "LOCKED",
        isDefault: true
      }
    });
  }

  console.log(
    `[create-emergency-admin] usuario asegurado: ${user.email} (id=${user.id}, tenant=${TENANT_ID}, tag=${BREAK_GLASS_TAG})`
  );
}

main()
  .catch((error) => {
    console.error("[create-emergency-admin] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
