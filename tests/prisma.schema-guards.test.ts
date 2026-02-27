import test from "node:test";
import assert from "node:assert/strict";
import {
  __setPrismaSchemaEventWriterForTests,
  PrismaRequiredTableDependencyError,
  resolvePrismaSchemaFallback
} from "@/lib/prisma/errors";
import { resolveDomainSchemaStatus } from "@/lib/prisma/domainSchemaHealth";

test("optional missing-table usa fallback visible con badge", () => {
  const resolution = resolvePrismaSchemaFallback({
    domain: "clients",
    context: "clients.test.optional",
    requirement: "OPTIONAL",
    error: {
      code: "P2021",
      message: 'The table public."ClientContact" does not exist'
    },
    fallback: { source: "fallback" as const }
  });

  assert.equal(resolution.handled, true);
  assert.equal(resolution.requirement, "OPTIONAL");
  assert.equal(resolution.issue, "missing_table");
  assert.equal(resolution.source, "fallback");
  assert.equal(resolution.badge, "fallback");
  assert.deepEqual(resolution.value, { source: "fallback" });
});

test("required missing-table retorna error controlado", () => {
  const resolution = resolvePrismaSchemaFallback({
    domain: "reception",
    context: "reception.test.required",
    requirement: "REQUIRED",
    error: {
      code: "P2021",
      message: 'The table public."Visit" does not exist'
    }
  });

  assert.equal(resolution.handled, true);
  assert.equal(resolution.requirement, "REQUIRED");
  assert.equal(resolution.issue, "missing_table");
  assert.ok(resolution.error instanceof PrismaRequiredTableDependencyError);
  assert.match(resolution.error.message, /migraci/i);
});

test("optional legacy-schema usa fallback visible", () => {
  const resolution = resolvePrismaSchemaFallback({
    domain: "clients",
    context: "clients.test.legacy",
    requirement: "OPTIONAL",
    error: {
      code: "P2022",
      message: 'The column "ClientContact.relationType" does not exist'
    },
    fallback: [] as string[]
  });

  assert.equal(resolution.handled, true);
  assert.equal(resolution.requirement, "OPTIONAL");
  assert.equal(resolution.issue, "legacy_schema");
  assert.equal(resolution.source, "fallback");
  assert.equal(resolution.badge, "fallback");
  assert.deepEqual(resolution.value, []);
});

test("schema-health status resolver: Missing > Legacy > OK", () => {
  assert.equal(resolveDomainSchemaStatus({ requiredMissingCount: 1, optionalMissingCount: 0 }), "Missing");
  assert.equal(resolveDomainSchemaStatus({ requiredMissingCount: 0, optionalMissingCount: 2 }), "Legacy");
  assert.equal(resolveDomainSchemaStatus({ requiredMissingCount: 0, optionalMissingCount: 0 }), "OK");
});

test("registra evento de schema para OPTIONAL y REQUIRED", () => {
  const events: Array<Record<string, unknown>> = [];
  __setPrismaSchemaEventWriterForTests((payload) => {
    events.push(payload as unknown as Record<string, unknown>);
  });

  try {
    resolvePrismaSchemaFallback({
      domain: "clients",
      context: "clients.test.event.optional",
      requirement: "OPTIONAL",
      error: {
        code: "P2021",
        message: 'The table public."ClientContact" does not exist'
      },
      fallback: []
    });

    resolvePrismaSchemaFallback({
      domain: "reception",
      context: "reception.test.event.required",
      requirement: "REQUIRED",
      error: {
        code: "P2021",
        message: 'The table public."Visit" does not exist'
      }
    });
  } finally {
    __setPrismaSchemaEventWriterForTests(null);
  }

  assert.equal(events.length, 2);
  assert.equal(events[0]?.classification, "OPTIONAL");
  assert.equal(events[1]?.classification, "REQUIRED");
  assert.equal(events[0]?.issue, "missing_table");
  assert.equal(events[1]?.issue, "missing_table");
});
