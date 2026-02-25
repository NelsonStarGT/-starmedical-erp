import test from "node:test";
import assert from "node:assert/strict";
import { parseImportRows } from "@/components/clients/config/GeoCatalogManager";

test("parseImportRows procesa JSON de departamentos/municipios", () => {
  const json = JSON.stringify({
    countries: [
      {
        countryIso2: "GT",
        departments: [
          {
            code: "01",
            name: "Guatemala",
            municipalities: [
              { code: "0101", name: "Guatemala" },
              { code: "0102", name: "Santa Catarina Pinula" }
            ]
          }
        ]
      }
    ]
  });

  const rows = parseImportRows(json, "gt_departamentos_municipios.json", "GT");
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.level, 2);
  assert.equal(rows[0]?.parentCode, "01");
  assert.equal(rows[0]?.name, "Guatemala");
  assert.equal(rows[1]?.name, "Santa Catarina Pinula");
});

test("parseImportRows procesa CSV estándar", () => {
  const csv = [
    "level,code,name,parent_code,parent_name,data_source,is_active",
    "1,SV-01,San Salvador,,,official,1",
    "2,SV-0101,San Salvador,SV-01,San Salvador,operational,1"
  ].join("\n");

  const rows = parseImportRows(csv, "sv_divisiones.csv", "SV");
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.level, 1);
  assert.equal(rows[0]?.code, "SV-01");
  assert.equal(rows[1]?.level, 2);
  assert.equal(rows[1]?.parentCode, "SV-01");
  assert.equal(rows[1]?.dataSource, "operational");
});
