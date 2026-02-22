import assert from "node:assert/strict";
import test from "node:test";
import { selectBillingProfileByPriority } from "@/lib/billing/profileSelection";

test("selectBillingProfileByPriority elige el perfil activo de mayor prioridad", () => {
  const selected = selectBillingProfileByPriority([
    {
      id: "profile-10",
      legalEntityId: "legal-1",
      establishmentId: "est-1",
      priority: 10,
      isActive: true
    },
    {
      id: "profile-1",
      legalEntityId: "legal-2",
      establishmentId: "est-2",
      priority: 1,
      isActive: true
    }
  ]);

  assert.equal(selected?.id, "profile-1");
});

test("selectBillingProfileByPriority ignora inactivos y retorna null si no hay activos", () => {
  const selected = selectBillingProfileByPriority([
    {
      id: "profile-inactive",
      legalEntityId: "legal-1",
      establishmentId: "est-1",
      priority: 1,
      isActive: false
    }
  ]);

  assert.equal(selected, null);
});

test("selectBillingProfileByPriority permite perfiles sin establecimiento específico", () => {
  const selected = selectBillingProfileByPriority([
    {
      id: "profile-default",
      legalEntityId: "legal-1",
      establishmentId: null,
      priority: 5,
      isActive: true
    }
  ]);

  assert.equal(selected?.id, "profile-default");
});
