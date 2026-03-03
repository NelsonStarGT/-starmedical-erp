import test from "node:test";
import assert from "node:assert/strict";
import { ClientProfileType, Prisma } from "@prisma/client";
import {
  assignSequentialClientCodes,
  formatClientCode,
  reserveNextClientCodeTx,
  resolveClientCodePrefix
} from "@/lib/clients/clientCode";

test("prefijos por tipo de cliente", () => {
  assert.equal(resolveClientCodePrefix(ClientProfileType.PERSON), "C");
  assert.equal(resolveClientCodePrefix(ClientProfileType.COMPANY), "E");
  assert.equal(resolveClientCodePrefix(ClientProfileType.INSTITUTION), "I");
  assert.equal(resolveClientCodePrefix(ClientProfileType.INSURER), "A");
  assert.equal(formatClientCode("C", 1), "C001");
  assert.equal(formatClientCode("E", 12), "E012");
});

test("asignación secuencial de backfill evita colisiones", () => {
  const allocation = assignSequentialClientCodes({
    prefix: "C",
    existingCodes: ["C001", "C002", "C003", "C006", null, ""],
    count: 3
  });

  assert.deepEqual(allocation.codes, ["C007", "C008", "C009"]);
  assert.equal(allocation.nextNumber, 10);
});

test("reserva de correlativo es única por tenant + tipo (simulación concurrente)", async () => {
  const state = new Map<string, number>();

  const tx = {
    $queryRaw: async (sql: Prisma.Sql) => {
      const tenantId = String(sql.values[0] ?? "");
      const clientType = String(sql.values[1] ?? "");
      const prefix = String(sql.values[2] ?? "C");
      const key = `${tenantId}:${clientType}`;
      const next = (state.get(key) ?? 1) + 1;
      state.set(key, next);
      return [{ prefix, nextNumber: next }];
    }
  } as unknown as Prisma.TransactionClient;

  const [first, second] = await Promise.all([
    reserveNextClientCodeTx(tx, { tenantId: "tenant-a", clientType: ClientProfileType.PERSON }),
    reserveNextClientCodeTx(tx, { tenantId: "tenant-a", clientType: ClientProfileType.PERSON })
  ]);

  assert.notEqual(first.code, second.code);
  assert.deepEqual([first.code, second.code].sort(), ["C001", "C002"]);
});

test("correlativo reinicia por tenant y por tipo", async () => {
  const state = new Map<string, number>();

  const tx = {
    $queryRaw: async (sql: Prisma.Sql) => {
      const tenantId = String(sql.values[0] ?? "");
      const clientType = String(sql.values[1] ?? "");
      const prefix = String(sql.values[2] ?? "C");
      const key = `${tenantId}:${clientType}`;
      const next = (state.get(key) ?? 1) + 1;
      state.set(key, next);
      return [{ prefix, nextNumber: next }];
    }
  } as unknown as Prisma.TransactionClient;

  const personT1 = await reserveNextClientCodeTx(tx, { tenantId: "tenant-1", clientType: ClientProfileType.PERSON });
  const personT2 = await reserveNextClientCodeTx(tx, { tenantId: "tenant-2", clientType: ClientProfileType.PERSON });
  const companyT1 = await reserveNextClientCodeTx(tx, { tenantId: "tenant-1", clientType: ClientProfileType.COMPANY });

  assert.equal(personT1.code, "C001");
  assert.equal(personT2.code, "C001");
  assert.equal(companyT1.code, "E001");
});

test("reserva de correlativo castea clientType a enum ClientProfileType en SQL", async () => {
  let capturedSql: Prisma.Sql | null = null;

  const tx = {
    $queryRaw: async (sql: Prisma.Sql) => {
      capturedSql = sql;
      return [{ prefix: "C", nextNumber: 2 }];
    }
  } as unknown as Prisma.TransactionClient;

  await reserveNextClientCodeTx(tx, {
    tenantId: "tenant-cast",
    clientType: ClientProfileType.PERSON
  });

  assert.ok(capturedSql);
  const sqlText = (capturedSql as Prisma.Sql).strings.join(" ");
  assert.match(sqlText, /CAST\(/);
  assert.match(sqlText, /AS "ClientProfileType"\)/);
  assert.match(sqlText, /"id",\s*"tenantId",\s*"clientType"/);
  assert.match(sqlText, /gen_random_uuid\(\)::text/);
});
