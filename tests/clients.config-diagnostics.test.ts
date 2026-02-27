import test from "node:test";
import assert from "node:assert/strict";
import {
  filterDiagnosticsEvents,
  getRecommendedAction,
  groupDiagnosticsEventsByDigest,
  listTopMissingSchemaTables,
  normalizeDiagnosticsDomain,
  resolveDiagnosticsRecommendedAction,
  schemaStatusLabel
} from "@/lib/clients/configDiagnostics";
import type { DomainSchemaHealthSnapshot } from "@/lib/prisma/domainSchemaHealth";
import type { SystemEventLogItem } from "@/lib/ops/eventLog";

test("schema-health resumen expone estados OK/Missing para card", () => {
  const snapshot: DomainSchemaHealthSnapshot = {
    generatedAt: new Date().toISOString(),
    schema: "public",
    domains: [
      {
        domain: "clients",
        status: "OK",
        requiredMissing: [],
        optionalMissing: ["ClientContact"],
        tables: []
      },
      {
        domain: "reception",
        status: "Missing",
        requiredMissing: ["Visit"],
        optionalMissing: [],
        tables: []
      }
    ]
  };

  const labels = snapshot.domains.map((item) => schemaStatusLabel(item.status));
  assert.deepEqual(labels, ["OK", "Missing"]);

  const topMissing = listTopMissingSchemaTables(snapshot, 5);
  assert.equal(topMissing.length, 2);
  assert.equal(topMissing[0]?.required, true);
  assert.equal(topMissing[0]?.table, "Visit");
});

test("filterDiagnosticsEvents filtra por dominio, severidad y ventana", () => {
  const now = Date.now();
  const events: SystemEventLogItem[] = [
    {
      id: "evt-1",
      createdAt: new Date(now - 10 * 60 * 1000).toISOString(),
      tenantId: "tenant-a",
      domain: "clients",
      eventType: "PRISMA_SCHEMA_FALLBACK_OPTIONAL",
      severity: "WARN",
      code: "P2021",
      resource: "clients.sample",
      messageShort: "fallback",
      digest: "digest-1",
      metaJson: null,
      resolvedAt: null,
      resolvedByUserId: null,
      resolutionNote: null
    },
    {
      id: "evt-2",
      createdAt: new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString(),
      tenantId: "tenant-a",
      domain: "reception",
      eventType: "PRISMA_SCHEMA_REQUIRED_BLOCKED",
      severity: "ERROR",
      code: "P2021",
      resource: "reception.sample",
      messageShort: "required",
      digest: "digest-2",
      metaJson: null,
      resolvedAt: null,
      resolvedByUserId: null,
      resolutionNote: null
    }
  ];

  const filtered = filterDiagnosticsEvents(events, {
    domain: "clients",
    severity: "WARN",
    dateWindow: "30d"
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.id, "evt-1");
});

test("normaliza alias de dominio y agrupa por digest con acción recomendada", () => {
  const now = Date.now();
  const events: SystemEventLogItem[] = [
    {
      id: "evt-1",
      createdAt: new Date(now - 5 * 60 * 1000).toISOString(),
      tenantId: "tenant-a",
      domain: "portal",
      eventType: "PRISMA_SCHEMA_REQUIRED_BLOCKED",
      severity: "ERROR",
      code: "P2021",
      resource: "portal.config",
      messageShort: "Dependencia de esquema requerida no disponible.",
      digest: "digest-portal-1",
      metaJson: { classification: "REQUIRED", actionHint: "Ejecuta migraciones" },
      resolvedAt: null,
      resolvedByUserId: null,
      resolutionNote: null
    },
    {
      id: "evt-2",
      createdAt: new Date(now - 2 * 60 * 1000).toISOString(),
      tenantId: "tenant-a",
      domain: "portales",
      eventType: "PRISMA_SCHEMA_REQUIRED_BLOCKED",
      severity: "ERROR",
      code: "P2021",
      resource: "portal.config",
      messageShort: "Dependencia de esquema requerida no disponible.",
      digest: "digest-portal-1",
      metaJson: { classification: "REQUIRED", actionHint: "Ejecuta migraciones" },
      resolvedAt: null,
      resolvedByUserId: null,
      resolutionNote: null
    }
  ];

  assert.equal(normalizeDiagnosticsDomain("portal"), "portals");
  assert.equal(normalizeDiagnosticsDomain("portales"), "portals");

  const groups = groupDiagnosticsEventsByDigest(events);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.domain, "portals");
  assert.equal(groups[0]?.occurrences24h, 2);
  assert.match(resolveDiagnosticsRecommendedAction(groups[0]!).description, /Ejecuta migraciones/i);
});

test("getRecommendedAction es determinista por code/eventType/classification", () => {
  const required = getRecommendedAction({
    code: "P2021",
    eventType: "PRISMA_SCHEMA_REQUIRED_BLOCKED",
    domain: "clients",
    metaJson: { classification: "REQUIRED" }
  });
  assert.equal(required.key, "schema-required-missing-table");
  assert.equal(required.docsAnchor, "#schema-required-missing-table");

  const optional = getRecommendedAction({
    code: "P2021",
    eventType: "PRISMA_SCHEMA_FALLBACK_OPTIONAL",
    domain: "reception",
    metaJson: { classification: "OPTIONAL" }
  });
  assert.equal(optional.key, "schema-optional-fallback");
  assert.equal(optional.docsAnchor, "#schema-optional-fallback");

  const generic = getRecommendedAction({
    code: null,
    eventType: "UNKNOWN_EVENT",
    domain: "ops",
    metaJson: null
  });
  assert.equal(generic.key, "generic-review");
});
