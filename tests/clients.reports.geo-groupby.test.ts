import test from "node:test";
import assert from "node:assert/strict";
import { buildGeoBucketCountryProjectionSql } from "@/lib/clients/reports.service";

function sqlText(sql: { strings: ReadonlyArray<string> }) {
  return sql.strings.join("?");
}

test("geo buckets (country) usa agregación MIN para countryId/countryIso2", () => {
  const projection = buildGeoBucketCountryProjectionSql("country");
  const countryIdExpr = sqlText(projection.countryIdSql);
  const countryIso2Expr = sqlText(projection.countryIso2Sql);

  assert.match(countryIdExpr, /MIN\(loc\."geoCountryId"\)/);
  assert.match(countryIso2Expr, /MIN\(gco\."iso2"\)/);
  assert.equal(countryIdExpr.includes('loc."geoCountryId"') && !countryIdExpr.includes("MIN("), false);
});

test("geo buckets (admin1/admin2) fuerza countryId/countryIso2 en NULL", () => {
  const admin1Projection = buildGeoBucketCountryProjectionSql("admin1");
  const admin2Projection = buildGeoBucketCountryProjectionSql("admin2");

  assert.equal(sqlText(admin1Projection.countryIdSql), "NULL");
  assert.equal(sqlText(admin1Projection.countryIso2Sql), "NULL");
  assert.equal(sqlText(admin2Projection.countryIdSql), "NULL");
  assert.equal(sqlText(admin2Projection.countryIso2Sql), "NULL");
});
