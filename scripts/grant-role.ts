#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CliArgs = {
  email: string;
  role: "OPS" | "SUPER_ADMIN";
};

function readArg(name: string) {
  const index = process.argv.findIndex((arg) => arg === `--${name}`);
  if (index === -1) return "";
  return String(process.argv[index + 1] || "").trim();
}

function parseArgs(): CliArgs {
  const email = readArg("email").toLowerCase();
  const roleRaw = readArg("role").toUpperCase();

  if (!email || !email.includes("@")) {
    throw new Error("Uso: npm run dev:grant-role -- --email usuario@dominio.com --role OPS|SUPER_ADMIN");
  }

  const role = roleRaw === "SUPER_ADMIN" ? "SUPER_ADMIN" : roleRaw === "OPS" ? "OPS" : null;
  if (!role) {
    throw new Error("--role debe ser OPS o SUPER_ADMIN");
  }

  return { email, role };
}

async function ensureRole(roleName: CliArgs["role"]) {
  return prisma.role.upsert({
    where: { name: roleName },
    update: {
      isSystem: true,
      description: "Development role grant"
    },
    create: {
      name: roleName,
      isSystem: true,
      description: "Development role grant"
    }
  });
}

async function main() {
  const args = parseArgs();

  const user = await prisma.user.findUnique({
    where: { email: args.email },
    select: {
      id: true,
      email: true,
      name: true
    }
  });

  if (!user) {
    throw new Error(`No existe usuario con email ${args.email}. Crea el usuario primero.`);
  }

  const role = await ensureRole(args.role);

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id
      }
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id
    }
  });

  console.log(`[grant-role] user=${user.email} role=${role.name} status=granted`);
}

main()
  .catch((error) => {
    console.error("[grant-role] failed", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
