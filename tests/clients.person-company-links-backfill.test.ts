import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATION_PATH = resolve(
  process.cwd(),
  "prisma/migrations/20260723100000_person_company_links/migration.sql"
);

test("migration PersonCompanyLink incluye backfill desde ClientAffiliation", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");

  assert.match(sql, /CREATE TABLE "PersonCompanyLink"/);
  assert.match(sql, /INSERT INTO "PersonCompanyLink"/);
  assert.match(sql, /FROM "ClientAffiliation" ca/);
  assert.match(sql, /WHERE ca\."entityType" = 'COMPANY'/);
  assert.match(sql, /ON CONFLICT \("personId", "companyId"\) DO UPDATE/);
});
