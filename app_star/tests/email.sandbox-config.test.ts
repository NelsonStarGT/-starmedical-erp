import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildEmailSandboxDefaults,
  buildTenantAliasAddress,
  normalizeSandboxEmailType,
  normalizeTenantId,
  resolveTenantSandboxMode,
  shouldUseSandboxForTenant,
  tenantSlugFromId
} from "../lib/email/sandbox-config";

test("tenantId and slug normalization fallback to global", () => {
  assert.equal(normalizeTenantId(""), "global");
  assert.equal(normalizeTenantId(undefined), "global");
  assert.equal(tenantSlugFromId("TENANT A"), "tenant-a");
});

test("buildTenantAliasAddress uses tenant slug and type", () => {
  const alias = buildTenantAliasAddress({
    tenantId: "Tenant QA",
    aliasDomain: "sandbox.starmedical.test",
    emailType: "OTP"
  });
  assert.equal(alias, "tenant-qa+otp@sandbox.starmedical.test");

  const second = buildTenantAliasAddress({
    tenantId: "Tenant QA",
    aliasDomain: "sandbox.starmedical.test",
    emailType: "otp",
    index: 1
  });
  assert.equal(second, "tenant-qa+otp-2@sandbox.starmedical.test");
});

test("tenant mode resolve honors tenant override map", () => {
  const settings = buildEmailSandboxDefaults();
  settings.enabled = true;
  settings.modeDefault = "inherit";
  settings.tenantModes = {
    "tenant-a": "override"
  };

  assert.equal(resolveTenantSandboxMode(settings, "tenant-a"), "override");
  assert.equal(resolveTenantSandboxMode(settings, "tenant-b"), "inherit");
  assert.equal(shouldUseSandboxForTenant(settings, "tenant-a"), true);
  assert.equal(shouldUseSandboxForTenant(settings, "tenant-b"), false);
});

test("normalizeSandboxEmailType strips invalid chars", () => {
  assert.equal(normalizeSandboxEmailType(" OTP Code "), "otp-code");
  assert.equal(normalizeSandboxEmailType("***"), "general");
});
