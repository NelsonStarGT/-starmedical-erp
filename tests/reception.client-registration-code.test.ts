import assert from "node:assert/strict";
import test from "node:test";
import { ClientProfileType, Prisma } from "@prisma/client";
import { reserveNextClientRegistrationCodeTx } from "@/lib/reception/clientRegistrationCode";

test("correlativo provisional por tipo es único (simulación concurrente)", async () => {
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

  const [a, b] = await Promise.all([
    reserveNextClientRegistrationCodeTx(tx, { tenantId: "tenant-a", clientType: ClientProfileType.PERSON }),
    reserveNextClientRegistrationCodeTx(tx, { tenantId: "tenant-a", clientType: ClientProfileType.PERSON })
  ]);

  assert.notEqual(a.code, b.code);
  assert.deepEqual([a.code, b.code].sort(), ["C001", "C002"]);
});

test("correlativo provisional reinicia por tenant y por tipo", async () => {
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

  const personT1 = await reserveNextClientRegistrationCodeTx(tx, { tenantId: "tenant-1", clientType: ClientProfileType.PERSON });
  const personT2 = await reserveNextClientRegistrationCodeTx(tx, { tenantId: "tenant-2", clientType: ClientProfileType.PERSON });
  const insurerT1 = await reserveNextClientRegistrationCodeTx(tx, { tenantId: "tenant-1", clientType: ClientProfileType.INSURER });

  assert.equal(personT1.code, "C001");
  assert.equal(personT2.code, "C001");
  assert.equal(insurerT1.code, "A001");
});
