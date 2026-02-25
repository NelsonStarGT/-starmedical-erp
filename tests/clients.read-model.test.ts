import test from "node:test";
import assert from "node:assert/strict";
import { ClientLocationType } from "@prisma/client";
import {
  getPrimaryEmailValue,
  getPrimaryIdentifierValue,
  getPrimaryPhoneValue,
  getResidenceSnapshot
} from "@/lib/clients/readModel";

test("getPrimaryPhoneValue prioriza e164 del primario", () => {
  const value = getPrimaryPhoneValue([
    { number: "55551111", e164: "+50255551111", isPrimary: true, isActive: true },
    { number: "55552222", e164: "+50255552222", isPrimary: false, isActive: true }
  ]);
  assert.equal(value, "+50255551111");
});

test("getPrimaryEmailValue retorna correo primario activo", () => {
  const value = getPrimaryEmailValue([
    { valueRaw: "otro@demo.com", valueNormalized: "otro@demo.com", isPrimary: false, isActive: true },
    { valueRaw: "principal@demo.com", valueNormalized: "principal@demo.com", isPrimary: true, isActive: true }
  ]);
  assert.equal(value, "principal@demo.com");
});

test("getPrimaryIdentifierValue usa identificador primario", () => {
  const value = getPrimaryIdentifierValue([
    { value: "A-123", isPrimary: false, isActive: true },
    { value: "DPI-999", isPrimary: true, isActive: true }
  ]);
  assert.equal(value, "DPI-999");
});

test("getResidenceSnapshot usa HOME primario con fallback de ciudad/departamento libre", () => {
  const snapshot = getResidenceSnapshot([
    {
      type: ClientLocationType.WORK,
      isPrimary: false,
      isActive: true,
      address: "Oficina",
      addressLine1: "Oficina",
      country: "Guatemala",
      department: "Guatemala",
      city: "Zona 10"
    },
    {
      type: ClientLocationType.HOME,
      isPrimary: true,
      isActive: true,
      address: "Casa referencia",
      addressLine1: "Colonia El Centro 1-23",
      country: "Guatemala",
      department: null,
      city: null,
      freeState: "Escuintla",
      freeCity: "Masagua",
      postalCode: "05011"
    }
  ]);

  assert.deepEqual(snapshot, {
    addressLine1: "Colonia El Centro 1-23",
    country: "Guatemala",
    department: "Escuintla",
    city: "Masagua",
    postalCode: "05011"
  });
});
