#!/usr/bin/env ts-node
/**
 * Backfill job roles for existing users based on legacy role columns if present.
 * Idempotent: updates/creates UserProfile as needed and sets jobRoleId when match is found.
 *
 * Usage:
 *   npm run backfill:user-job-roles
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const JOB_ROLE_NAMES = [
  "Administrador",
  "Médico",
  "Enfermería",
  "Recepción",
  "Laboratorio",
  "Rayos X",
  "Ultrasonido",
  "Caja / Facturación",
  "SSO - Monitor",
  "SSO - Coordinador"
];

type ColumnSet = {
  profile: string[];
  user: string[];
};

function normalizeName(name?: string | null) {
  return (name || "").trim().toLowerCase();
}

async function getExistingColumns(table: "UserProfile" | "User", candidates: string[]) {
  const rows = (await prisma.$queryRawUnsafe<
    { column_name: string }[]
  >(
    `select column_name from information_schema.columns where table_schema='public' and table_name='${table}' and column_name = ANY($1::text[])`,
    candidates
  )) as { column_name: string }[];
  return rows.map((r) => r.column_name);
}

async function ensureJobRoles() {
  const map: Record<string, string> = {};
  for (const name of JOB_ROLE_NAMES) {
    const role = await prisma.jobRole.upsert({
      where: { name },
      update: { name, isActive: true },
      create: { name, isActive: true }
    });
    map[normalizeName(name)] = role.id;
  }
  return map;
}

async function fetchProfiles(columns: string[]) {
  if (!columns.length) return [];
  const selectCols = ['id', '"userId"', ...columns.map((c) => `"${c}"`)].join(", ");
  return prisma.$queryRawUnsafe<any[]>(`select ${selectCols} from "UserProfile"`);
}

async function fetchUsers(columns: string[]) {
  if (!columns.length) return [];
  const selectCols = ['id', ...columns.map((c) => `"${c}"`)].join(", ");
  return prisma.$queryRawUnsafe<any[]>(`select ${selectCols} from "User"`);
}

async function backfill() {
  const jobRoleMap = await ensureJobRoles();
  const columns: ColumnSet = {
    profile: await getExistingColumns("UserProfile", ["roleName", "operationalRole", "jobRole", "jobRoleName", "jobRoleText"]),
    user: await getExistingColumns("User", ["roleName", "operationalRole", "jobRole", "jobRoleName"])
  };

  const profiles = await fetchProfiles(columns.profile);
  const users = await fetchUsers(columns.user);

  let updated = 0;
  let missing = 0;

  // Index profiles by userId for quick attach
  const profileByUserId = new Map<string, any>();
  profiles.forEach((p) => profileByUserId.set(p.userId, p));

  for (const user of await prisma.user.findMany({ select: { id: true } })) {
    const profile = profileByUserId.get(user.id);
    const candidates: string[] = [];
    if (profile) {
      for (const col of columns.profile) {
        if (profile[col]) candidates.push(profile[col]);
      }
    }
    const userRow = users.find((u) => u.id === user.id);
    if (userRow) {
      for (const col of columns.user) {
        if (userRow[col]) candidates.push(userRow[col]);
      }
    }

    const matchedId =
      candidates
        .map((c) => jobRoleMap[normalizeName(c)])
        .find((id) => Boolean(id)) || null;

    if (matchedId) {
      await prisma.userProfile.upsert({
        where: { userId: user.id },
        update: { jobRoleId: matchedId },
        create: { userId: user.id, jobRoleId: matchedId }
      });
      updated++;
    } else {
      // Ensure profile exists but without jobRoleId
      await prisma.userProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id }
      });
      missing++;
    }
  }

  console.log(
    `[backfill-user-job-roles] updated=${updated} missing=${missing} (missing = sin rol operativo legacy)`
  );
}

backfill()
  .catch((err) => {
    console.error("[backfill-user-job-roles] failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
