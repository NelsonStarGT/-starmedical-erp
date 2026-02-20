import test from "node:test";
import assert from "node:assert/strict";
import { areOpsAlertsEnabled } from "@/lib/ops/alerts";

test("ops alerts toggle: OPS_ALERTS_ENABLED=false desactiva notificaciones", () => {
  const previous = process.env.OPS_ALERTS_ENABLED;
  process.env.OPS_ALERTS_ENABLED = "false";
  try {
    assert.equal(areOpsAlertsEnabled(), false);
  } finally {
    if (typeof previous === "string") {
      process.env.OPS_ALERTS_ENABLED = previous;
    } else {
      delete process.env.OPS_ALERTS_ENABLED;
    }
  }
});

test("ops alerts toggle: default activo", () => {
  const previous = process.env.OPS_ALERTS_ENABLED;
  delete process.env.OPS_ALERTS_ENABLED;
  try {
    assert.equal(areOpsAlertsEnabled(), true);
  } finally {
    if (typeof previous === "string") {
      process.env.OPS_ALERTS_ENABLED = previous;
    }
  }
});
