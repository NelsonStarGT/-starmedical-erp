import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveDensityModePreference,
  resolveSidebarCollapsedPreference,
  serializeSidebarCollapsedPreference
} from "@/lib/ui/persistence";

test("sidebar colapsada respeta política forzada del tenant", () => {
  const resolved = resolveSidebarCollapsedPreference({
    storedValue: "0",
    policyDefault: false,
    policyForce: true
  });
  assert.equal(resolved, true);
  assert.equal(
    serializeSidebarCollapsedPreference({
      collapsed: false,
      policyForce: true
    }),
    "1"
  );
});

test("sidebar usa preferencia local cuando existe", () => {
  const resolvedCollapsed = resolveSidebarCollapsedPreference({
    storedValue: "1",
    policyDefault: false,
    policyForce: false
  });
  const resolvedExpanded = resolveSidebarCollapsedPreference({
    storedValue: "0",
    policyDefault: true,
    policyForce: false
  });

  assert.equal(resolvedCollapsed, true);
  assert.equal(resolvedExpanded, false);
});

test("densidad persiste en preferencia local y cae a default", () => {
  assert.equal(
    resolveDensityModePreference({
      storedValue: "compact",
      defaultMode: "normal"
    }),
    "compact"
  );
  assert.equal(
    resolveDensityModePreference({
      storedValue: null,
      defaultMode: "normal"
    }),
    "normal"
  );
});
