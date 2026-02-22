import assert from "node:assert/strict";
import test from "node:test";
import { portalConfigPatchSchema } from "@/lib/portales/config";

test("portalConfigPatchSchema rechaza keys duplicadas y rutas inválidas", () => {
  const result = portalConfigPatchSchema.safeParse({
    patientPortalMenus: [
      { key: "dashboard", label: "Dashboard", path: "/portal/app", enabled: true, order: 10 },
      { key: "dashboard", label: "Citas", path: "portal/app/appointments", enabled: true, order: 20 }
    ]
  });

  assert.equal(result.success, false);
  if (result.success) return;

  const issues = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));

  assert.ok(issues.some((issue) => issue.path.includes("1.path")));
  assert.ok(issues.some((issue) => issue.message.includes("key duplicada")));
});

test("portalConfigPatchSchema valida reglas de semáforo y horario", () => {
  const result = portalConfigPatchSchema.safeParse({
    appointmentsRules: {
      startHour: "17:00",
      endHour: "08:00",
      slotMinutes: 30,
      greenThreshold: 0.5,
      yellowThreshold: 0.5,
      requestLimitPerDay: 10
    }
  });

  assert.equal(result.success, false);
  if (result.success) return;

  const issues = result.error.issues.map((issue) => `${issue.path.join(".")}:${issue.message}`);
  assert.ok(issues.some((issue) => issue.includes("endHour")));
  assert.ok(issues.some((issue) => issue.includes("yellowThreshold")));
});

test("portalConfigPatchSchema acepta patch válido", () => {
  const result = portalConfigPatchSchema.safeParse({
    support: {
      phone: "7729-3636",
      whatsappUrl: "https://wa.me/50277293636",
      supportText: "Soporte disponible.",
      hours: "Lun-Vie 08:00-17:00",
      showSupportCard: true
    },
    appointmentsRules: {
      startHour: "08:00",
      endHour: "17:00",
      slotMinutes: 30,
      greenThreshold: 0.6,
      yellowThreshold: 0.2,
      requestLimitPerDay: 10
    }
  });

  assert.equal(result.success, true);
});
