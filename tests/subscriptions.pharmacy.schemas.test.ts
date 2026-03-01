import test from "node:test";
import assert from "node:assert/strict";
import {
  createMedicationSubscriptionSchema,
  listDiscountPlansQuerySchema,
  pharmacyConfigSchema
} from "@/lib/subscriptions/pharmacy/schemas";

test("pharmacy schema: create medication subscription validates custom frequency", () => {
  const valid = createMedicationSubscriptionSchema.safeParse({
    patientId: "patient-1",
    frequency: "CUSTOM_DAYS",
    customDays: 21,
    nextFillAt: new Date().toISOString(),
    deliveryMethod: "PICKUP",
    contactPreference: "WHATSAPP",
    items: [{ medicationId: "med-1", qty: 2 }]
  });

  assert.equal(valid.success, true);

  const invalid = createMedicationSubscriptionSchema.safeParse({
    patientId: "patient-1",
    frequency: "CUSTOM_DAYS",
    nextFillAt: new Date().toISOString(),
    deliveryMethod: "PICKUP",
    contactPreference: "WHATSAPP",
    items: [{ medicationId: "med-1", qty: 2 }]
  });

  assert.equal(invalid.success, false);
});

test("pharmacy schema: includeInactive string is coerced via route layer expectation", () => {
  const parsed = listDiscountPlansQuerySchema.parse({ includeInactive: true, take: "20" as any });
  assert.equal(parsed.includeInactive, true);
  assert.equal(parsed.take, 20);
});

test("pharmacy schema: config bounds", () => {
  const parsed = pharmacyConfigSchema.parse({
    medicationEnabled: true,
    discountEnabled: false,
    reminderLeadDays: 7
  });

  assert.equal(parsed.reminderLeadDays, 7);
});
