import test from "node:test";
import assert from "node:assert/strict";
import { buildSqlWhereClauses, buildWhere } from "@/lib/clients/reports.service";

function sqlText(clauses: ReturnType<typeof buildSqlWhereClauses>) {
  return clauses.map((clause) => clause.strings.join("?")).join(" ");
}

test("referredOnly/country/q se aplican en Prisma where", () => {
  const where = buildWhere({
    tenantId: "tenant-a",
    q: "juan",
    countryId: "country-gt",
    referredOnly: true
  }) as {
    clientLocations?: { some?: { geoCountryId?: string } };
    referralsReceived?: { some?: { referrerClient?: { tenantId?: string } } };
    OR?: Array<Record<string, unknown>>;
  };

  assert.equal(where.clientLocations?.some?.geoCountryId, "country-gt");
  assert.equal(where.referralsReceived?.some?.referrerClient?.tenantId, "tenant-a");
  assert.equal(Array.isArray(where.OR), true);
  assert.equal(where.OR?.some((entry) => "clientCode" in entry), true);
});

test("referredOnly/country/q se aplican también en cláusulas SQL geo", () => {
  const clauses = buildSqlWhereClauses({
    tenantId: "tenant-a",
    q: "juan",
    countryId: "country-gt",
    referredOnly: true
  });
  const text = sqlText(clauses);

  assert.match(text, /ClientReferral/);
  assert.match(text, /ClientIdentifier/);
  assert.match(text, /ClientPhone/);
  assert.match(text, /ClientEmail/);
  assert.match(text, /geoCountryId/);
});
