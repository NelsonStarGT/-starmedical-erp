import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export type DbHealthStatus = "GREEN" | "YELLOW" | "RED";

export type DbHealthSnapshot = {
  status: DbHealthStatus;
  timestamp: string;
  nodeEnv: string;
  appEnv: string | null;
  databaseUrlMasked: string;
  schema: string;
  criticalTables: Array<{ name: string; exists: boolean }>;
  migrations: {
    repo: string[];
    applied: string[];
    pending: string[];
    unknownApplied: string[];
    upToDate: boolean | null;
    error?: string | null;
  };
};

const DEFAULT_SCHEMA = "public";

const CRITICAL_TABLES = [
  "Branch",
  "User",
  "ClientProfile",
  "Visit",
  "VisitEvent",
  "Queue",
  "QueueItem",
  "ServiceRequest",
  "TicketSequence",
  "_prisma_migrations"
];

function safeSchemaName(schema: string | null | undefined): string {
  const value = (schema || "").trim();
  if (!value) return DEFAULT_SCHEMA;
  if (!/^[a-zA-Z0-9_]+$/.test(value)) return DEFAULT_SCHEMA;
  return value;
}

function maskDatabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl) return "(missing)";
  try {
    const url = new URL(rawUrl);
    const schema = url.searchParams.get("schema");
    const credentials = url.username ? `${url.username}:***@` : "";
    const port = url.port ? `:${url.port}` : "";
    const query = schema ? `?schema=${schema}` : url.search;
    return `${url.protocol}//${credentials}${url.hostname}${port}${url.pathname}${query}`;
  } catch {
    return "(invalid)";
  }
}

async function listRepoMigrations(): Promise<string[]> {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function listAppliedMigrations(schema: string): Promise<string[]> {
  const table = `"${schema}"."_prisma_migrations"`;
  const rows = await prisma.$queryRawUnsafe<
    Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>
  >(
    `SELECT migration_name, finished_at, rolled_back_at FROM ${table} ORDER BY finished_at DESC NULLS LAST, started_at DESC;`
  );

  return rows
    .filter((row) => row.rolled_back_at === null && row.finished_at !== null)
    .map((row) => row.migration_name);
}

async function checkCriticalTablesExist(schema: string): Promise<Array<{ name: string; exists: boolean }>> {
  const select = CRITICAL_TABLES.map((name) => `to_regclass('${schema}."${name}"')::text AS "${name}"`).join(", ");
  const rows = await prisma.$queryRawUnsafe<Array<Record<string, string | null>>>(`SELECT ${select};`);
  const row = rows[0] ?? {};
  return CRITICAL_TABLES.map((name) => ({ name, exists: Boolean(row[name]) }));
}

export async function getDbHealthSnapshot(): Promise<DbHealthSnapshot> {
  const rawUrl = process.env.DATABASE_URL;
  const schema = safeSchemaName((() => {
    try {
      return rawUrl ? new URL(rawUrl).searchParams.get("schema") : null;
    } catch {
      return null;
    }
  })());

  const timestamp = new Date().toISOString();
  const nodeEnv = String(process.env.NODE_ENV || "");
  const appEnv = process.env.APP_ENV ? String(process.env.APP_ENV) : null;

  let criticalTables: Array<{ name: string; exists: boolean }> = [];
  let repoMigrations: string[] = [];
  let appliedMigrations: string[] = [];
  let migrationsError: string | null = null;

  try {
    criticalTables = await checkCriticalTablesExist(schema);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    migrationsError = migrationsError ? migrationsError : message;
    criticalTables = CRITICAL_TABLES.map((name) => ({ name, exists: false }));
  }

  try {
    [repoMigrations, appliedMigrations] = await Promise.all([listRepoMigrations(), listAppliedMigrations(schema)]);
  } catch (error) {
    migrationsError = error instanceof Error ? error.message : String(error);
    repoMigrations = [];
    appliedMigrations = [];
  }

  const repoSet = new Set(repoMigrations);
  const appliedSet = new Set(appliedMigrations);

  const pending = repoMigrations.filter((name) => !appliedSet.has(name));
  const unknownApplied = appliedMigrations.filter((name) => !repoSet.has(name));

  const criticalMissing = criticalTables.some((t) => !t.exists);
  const migrationsUpToDate = migrationsError ? null : pending.length === 0 && unknownApplied.length === 0;

  const status: DbHealthStatus = criticalMissing
    ? "RED"
    : migrationsUpToDate === false
      ? "YELLOW"
      : migrationsUpToDate === null
        ? "YELLOW"
        : "GREEN";

  return {
    status,
    timestamp,
    nodeEnv,
    appEnv,
    databaseUrlMasked: maskDatabaseUrl(rawUrl),
    schema,
    criticalTables,
    migrations: {
      repo: repoMigrations,
      applied: appliedMigrations,
      pending,
      unknownApplied,
      upToDate: migrationsUpToDate,
      error: migrationsError
    }
  };
}
