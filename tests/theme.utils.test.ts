import test from "node:test";
import assert from "node:assert/strict";
import { buildThemeCssVariables, contrastRatio, isRecommendedContrast, isValidHexColor } from "@/lib/theme/utils";
import type { TenantThemeSnapshot } from "@/lib/config-central/theme";

test("isValidHexColor valida formato #RRGGBB", () => {
  assert.equal(isValidHexColor("#4aa59c"), true);
  assert.equal(isValidHexColor("#4AADF5"), true);
  assert.equal(isValidHexColor("#fff"), false);
  assert.equal(isValidHexColor("teal"), false);
});

test("contrastRatio y recomendación WCAG básica", () => {
  assert.equal(contrastRatio("#000000", "#ffffff") >= 21, true);
  assert.equal(isRecommendedContrast("#0f172a", "#f8fafc"), true);
  assert.equal(isRecommendedContrast("#4aa59c", "#4aadf5"), false);
});

test("buildThemeCssVariables mapea paleta y densidad", () => {
  const snapshot: TenantThemeSnapshot = {
    tenantId: "tenant-a",
    version: 3,
    theme: {
      primary: "#4aa59c",
      accent: "#4aadf5",
      structure: "#2e75ba",
      bg: "#f8fafc",
      surface: "#ffffff",
      text: "#0f172a",
      muted: "#64748b",
      border: "#dbe6f0",
      ring: "#4aadf5"
    },
    fontHeadingKey: "poppins",
    fontBodyKey: "inter",
    densityDefault: "compact",
    logoUrl: null,
    logoAssetId: null,
    updatedByUserId: null,
    updatedAt: null,
    source: "db"
  };

  const vars = buildThemeCssVariables(snapshot) as Record<string, string>;
  assert.equal(vars["--color-primary"], "#4aa59c");
  assert.equal(vars["--color-structure"], "#2e75ba");
  assert.equal(vars["--color-accent-rgb"], "74 173 245");
  assert.equal(vars["--density-scale"], "0.88");
  assert.equal(vars["--font-heading"].includes("Poppins"), true);
  assert.equal(vars["--font-sans"].includes("Inter"), true);
});
