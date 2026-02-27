import assert from "node:assert/strict";
import test from "node:test";
import {
  getSelfRegistrationIdentityHints,
  summarizeClientSelfRegistrationPayload,
  validateClientSelfRegistrationPayload
} from "@/lib/reception/clientSelfRegistration";

test("validación PERSON exige campos mínimos", () => {
  assert.throws(
    () =>
      validateClientSelfRegistrationPayload({
        clientType: "PERSON",
        payload: {
          firstName: "",
          lastName: "López",
          idValue: "123",
          phone: "5555-5555",
          country: "GT",
          department: "Guatemala",
          city: "Guatemala",
          address: "Zona 10"
        }
      }),
    /Nombre requerido/i
  );
});

test("validación COMPANY normaliza email/teléfono y resumen", () => {
  const payload = validateClientSelfRegistrationPayload({
    clientType: "COMPANY",
    payload: {
      nit: "1234567",
      legalName: "Laboratorios Demo, S.A.",
      tradeName: "Labs Demo",
      contactName: "Recepción",
      phone: "+502 5555-1212",
      email: "  INFO@DEMO.COM  ",
      country: "Guatemala",
      department: "Guatemala",
      city: "Guatemala",
      address: "Zona 9"
    }
  });

  assert.equal(payload.clientType, "COMPANY");
  assert.equal(payload.phone, "50255551212");
  assert.equal(payload.email, "info@demo.com");

  const summary = summarizeClientSelfRegistrationPayload(payload);
  assert.equal(summary.displayName, "Laboratorios Demo, S.A.");
  assert.equal(summary.documentRef, "1234567");
});

test("identity hints en PERSON reutiliza id como nit/dpi", () => {
  const payload = validateClientSelfRegistrationPayload({
    clientType: "PERSON",
    payload: {
      firstName: "Ana",
      lastName: "Pérez",
      idValue: "1234567890101",
      phone: "5511-7788",
      email: "ana@example.com",
      country: "Guatemala",
      department: "Guatemala",
      city: "Mixco",
      address: "Colonia Demo"
    }
  });

  const hints = getSelfRegistrationIdentityHints(payload);
  assert.equal(hints.idValue, "1234567890101");
  assert.equal(hints.nit, "1234567890101");
  assert.equal(hints.dpi, "1234567890101");
  assert.equal(hints.email, "ana@example.com");
  assert.equal(hints.phone, "55117788");
});
