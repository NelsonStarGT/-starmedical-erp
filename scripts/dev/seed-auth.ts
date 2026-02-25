#!/usr/bin/env node
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEV_EMAIL = String(process.env.DEV_AUTH_EMAIL || "nelsonlopezallen@gmail.com")
  .trim()
  .toLowerCase();
const DEV_PASSWORD = String(process.env.DEV_AUTH_PASSWORD || "StarDev123!");
const DEV_NAME = String(process.env.DEV_AUTH_NAME || "Nelson Lopez");
const REQUESTED_ROLE = String(process.env.DEV_AUTH_ROLE || "ADMIN")
  .trim()
  .toUpperCase();
const DEV_ROLE = REQUESTED_ROLE === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";

async function ensureRole(roleName: string) {
  return prisma.role.upsert({
    where: { name: roleName },
    update: {
      isSystem: true,
      description: "Development auth seed role"
    },
    create: {
      name: roleName,
      isSystem: true,
      description: "Development auth seed role"
    }
  });
}

async function main() {
  if (!DEV_EMAIL) {
    throw new Error("DEV_AUTH_EMAIL no puede estar vacío");
  }

  if (!DEV_PASSWORD) {
    throw new Error("DEV_AUTH_PASSWORD no puede estar vacío");
  }

  if (REQUESTED_ROLE !== "ADMIN" && REQUESTED_ROLE !== "SUPER_ADMIN") {
    console.warn(`[seed-auth] DEV_AUTH_ROLE inválido (${REQUESTED_ROLE}), usando ADMIN`);
  }

  const role = await ensureRole(DEV_ROLE);
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: DEV_EMAIL },
    update: {
      name: DEV_NAME,
      passwordHash,
      isActive: true
    },
    create: {
      email: DEV_EMAIL,
      name: DEV_NAME,
      passwordHash,
      isActive: true
    }
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id }
  });

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, phone: null }
  });

  console.log(`[seed-auth] DEV LOGIN: email=${DEV_EMAIL}, password=${DEV_PASSWORD}`);
  console.log(`[seed-auth] userId=${user.id}, role=${role.name}`);
}

main()
  .catch((error) => {
    console.error("[seed-auth] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
