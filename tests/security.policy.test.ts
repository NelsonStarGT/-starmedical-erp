import test from "node:test";
import assert from "node:assert/strict";
import { parseTenantSecurityPolicyPatch } from "@/lib/config-central/security-policy";

test("parseTenantSecurityPolicyPatch acepta configuración válida", () => {
  const parsed = parseTenantSecurityPolicyPatch({
    sessionTimeoutMinutes: 120,
    enforce2FA: true,
    passwordMinLength: 12,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumber: true,
    passwordRequireSymbol: true,
    ipAllowlist: ["203.0.113.10", "203.0.113.10", "198.51.100.7"],
    allowRememberMe: false,
    maxLoginAttempts: 4,
    lockoutMinutes: 30
  });

  assert.equal(parsed.sessionTimeoutMinutes, 120);
  assert.deepEqual(parsed.ipAllowlist, ["203.0.113.10", "198.51.100.7"]);
  assert.equal(parsed.maxLoginAttempts, 4);
});

test("parseTenantSecurityPolicyPatch rechaza valores fuera de rango", () => {
  assert.throws(
    () =>
      parseTenantSecurityPolicyPatch({
        sessionTimeoutMinutes: 2,
        maxLoginAttempts: 100
      }),
    /minutes|maxLoginAttempts/i
  );
});
