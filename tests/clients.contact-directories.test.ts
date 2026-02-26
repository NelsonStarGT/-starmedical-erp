import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFallbackClientContactDirectories,
  filterJobTitlesByDepartment,
  resolveMissingDepartmentDefaults,
  resolveMissingJobTitleDefaults,
  resolveMissingPbxCategoryDefaults,
  resolveUniqueContactDirectoryCode,
  toDirectorySelectOptions
} from "@/lib/clients/contactDirectories";
import { resolveCompanyContactDepartment, resolveCompanyContactJobTitle } from "@/lib/clients/companyProfile";

test("fallback de directorios incluye mínimos y opción Otro", () => {
  const snapshot = buildFallbackClientContactDirectories("global");

  assert.ok(snapshot.departments.length >= 12);
  assert.ok(snapshot.jobTitles.length >= 25);
  assert.ok(snapshot.departments.some((item) => item.id === "otro"));
  assert.ok(snapshot.jobTitles.some((item) => item.id === "otro"));
  assert.ok(snapshot.pbxCategories.length >= 6);
  assert.ok(snapshot.pbxCategories.some((item) => item.code === "central"));
  assert.ok(snapshot.pbxCategories.some((item) => item.code === "otro"));
  assert.equal(snapshot.departmentsSource, "fallback");
  assert.equal(snapshot.jobTitlesSource, "fallback");
  assert.equal(snapshot.pbxCategoriesSource, "fallback");
});

test("filtro de cargos por área usa correlación y conserva 'Otro'", () => {
  const snapshot = buildFallbackClientContactDirectories("global");
  const jobTitleOptions = toDirectorySelectOptions(snapshot.jobTitles);

  const filtered = filterJobTitlesByDepartment(jobTitleOptions, "rrhh", {
    rrhh: ["jefe_rrhh", "coordinador_rrhh"]
  });

  assert.equal(filtered.some((item) => item.id === "jefe_rrhh"), true);
  assert.equal(filtered.some((item) => item.id === "coordinador_rrhh"), true);
  assert.equal(filtered.some((item) => item.id === "analista_ti"), false);
  assert.equal(filtered.some((item) => item.id === "otro"), true);
});

test("sin correlación para área se muestran todos los cargos", () => {
  const snapshot = buildFallbackClientContactDirectories("global");
  const jobTitleOptions = toDirectorySelectOptions(snapshot.jobTitles);

  const filtered = filterJobTitlesByDepartment(jobTitleOptions, "compras", {
    rrhh: ["jefe_rrhh"]
  });

  assert.equal(filtered.length, jobTitleOptions.length);
});

test("resolve de área/cargo acepta IDs dinámicos tenant-scoped", () => {
  const department = resolveCompanyContactDepartment({
    departmentId: "cm_custom_department_id",
    department: null,
    departmentOther: null
  });
  assert.equal(department.departmentId, "cm_custom_department_id");
  assert.equal(department.departmentOther, null);

  const jobTitle = resolveCompanyContactJobTitle({
    jobTitleId: "cm_custom_job_title_id",
    role: null,
    jobTitleOther: null
  });
  assert.equal(jobTitle.jobTitleId, "cm_custom_job_title_id");
  assert.equal(jobTitle.jobTitleOther, null);
});

test("slug PBX resuelve colisiones con sufijo incremental", () => {
  const unique = resolveUniqueContactDirectoryCode({
    baseCode: "central",
    existingCodes: ["central", "central_2", "central_3"]
  });
  assert.equal(unique, "central_4");
});

test("slug de área/cargo resuelve colisiones con sufijo incremental", () => {
  const departmentSlug = resolveUniqueContactDirectoryCode({
    baseCode: "rrhh",
    existingCodes: ["rrhh", "rrhh_2", "rrhh_3"]
  });
  assert.equal(departmentSlug, "rrhh_4");

  const jobTitleSlug = resolveUniqueContactDirectoryCode({
    baseCode: "analista_ti",
    existingCodes: ["analista_ti", "analista_ti_2"]
  });
  assert.equal(jobTitleSlug, "analista_ti_3");
});

test("CTA de categorías PBX devuelve solo defaults faltantes", () => {
  const missing = resolveMissingPbxCategoryDefaults([
    { code: "central", name: "Central" },
    { code: "ventas", name: "Ventas" }
  ]);
  assert.equal(missing.some((item) => item.id === "central"), false);
  assert.equal(missing.some((item) => item.id === "ventas"), false);
  assert.equal(missing.some((item) => item.id === "compras"), true);
  assert.equal(missing.some((item) => item.id === "soporte"), true);
  assert.equal(missing.some((item) => item.id === "recepcion"), true);
});

test("CTA de áreas devuelve solo defaults faltantes", () => {
  const missing = resolveMissingDepartmentDefaults([
    { code: "administracion", name: "Administración" },
    { code: "rrhh", name: "RRHH" }
  ]);
  assert.equal(missing.some((item) => item.id === "administracion"), false);
  assert.equal(missing.some((item) => item.id === "rrhh"), false);
  assert.equal(missing.some((item) => item.id === "compras"), true);
  assert.equal(missing.some((item) => item.id === "otro"), true);
});

test("CTA de cargos devuelve solo defaults faltantes", () => {
  const missing = resolveMissingJobTitleDefaults([
    { code: "gerente_general", name: "Gerente general" },
    { code: "coordinador_rrhh", name: "Coordinador de RRHH" }
  ]);
  assert.equal(missing.some((item) => item.id === "gerente_general"), false);
  assert.equal(missing.some((item) => item.id === "coordinador_rrhh"), false);
  assert.equal(missing.some((item) => item.id === "analista_ti"), true);
  assert.equal(missing.some((item) => item.id === "otro"), true);
});
