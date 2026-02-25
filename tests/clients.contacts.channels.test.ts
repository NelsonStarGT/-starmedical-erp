import test from "node:test";
import assert from "node:assert/strict";
import { ClientEmailCategory, ClientPhoneCategory, ClientPhoneRelationType } from "@prisma/client";
import {
  normalizeClientEmailChannels,
  normalizeClientPhoneChannels
} from "@/lib/clients/contactChannels";

test("normalizeClientPhoneChannels agrega fallback primario y conserva secundarios", () => {
  const rows = normalizeClientPhoneChannels({
    channels: [
      {
        category: ClientPhoneCategory.MOBILE,
        relationType: ClientPhoneRelationType.CONYUGE,
        value: "5551-1111",
        countryIso2: "GT",
        canCall: true,
        canWhatsapp: true,
        isPrimary: false,
        isActive: true
      }
    ],
    fallbackPhone: "55500000",
    fallbackCountryIso2: "GT"
  });

  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.isPrimary, true);
  assert.equal(rows[0]?.category, ClientPhoneCategory.PRIMARY);
  assert.equal(rows[0]?.relationType, ClientPhoneRelationType.TITULAR);
  assert.equal(rows[0]?.canCall, true);
  assert.equal(rows[0]?.canWhatsapp, false);
  assert.equal(rows[0]?.number, "55500000");
  assert.equal(rows[0]?.countryCode, "GT");
  assert.equal(rows[1]?.number, "55511111");
  assert.equal(rows[1]?.isPrimary, false);
  assert.equal(rows[1]?.relationType, ClientPhoneRelationType.CONYUGE);
  assert.equal(rows[1]?.canCall, true);
  assert.equal(rows[1]?.canWhatsapp, true);
});

test("normalizeClientPhoneChannels aplica defaults de relación y permisos en filas activas", () => {
  const rows = normalizeClientPhoneChannels({
    channels: [
      {
        category: ClientPhoneCategory.WORK,
        value: "+34 600-123-123",
        countryIso2: "ES",
        isPrimary: true,
        isActive: true
      },
      {
        category: ClientPhoneCategory.OTHER,
        relationType: "DESCONOCIDO",
        value: "123",
        countryIso2: "ES",
        canCall: false,
        isPrimary: false,
        isActive: false
      }
    ]
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.relationType, ClientPhoneRelationType.TITULAR);
  assert.equal(rows[0]?.canCall, true);
  assert.equal(rows[0]?.canWhatsapp, false);
});

test("normalizeClientPhoneChannels dedupe teléfonos y deja un único principal conservando WhatsApp-only", () => {
  const rows = normalizeClientPhoneChannels({
    channels: [
      {
        category: ClientPhoneCategory.PRIMARY,
        relationType: ClientPhoneRelationType.TITULAR,
        value: "5550-0000",
        countryIso2: "GT",
        canCall: true,
        canWhatsapp: false,
        isPrimary: true,
        isActive: true
      },
      {
        category: ClientPhoneCategory.MOBILE,
        relationType: ClientPhoneRelationType.OTRO,
        value: "55500000",
        countryIso2: "GT",
        canCall: false,
        canWhatsapp: true,
        isPrimary: false,
        isActive: true
      },
      {
        category: ClientPhoneCategory.WORK,
        relationType: ClientPhoneRelationType.CONYUGE,
        value: "55501111",
        countryIso2: "GT",
        canCall: false,
        canWhatsapp: true,
        isPrimary: true,
        isActive: true
      }
    ]
  });

  assert.equal(rows.length, 2);
  assert.equal(rows.filter((row) => row.isPrimary).length, 1);

  const dedupedPrimaryCandidate = rows.find((row) => row.number === "55500000");
  assert.ok(dedupedPrimaryCandidate);
  assert.equal(dedupedPrimaryCandidate?.canCall, true);
  assert.equal(dedupedPrimaryCandidate?.canWhatsapp, true);

  const whatsappOnly = rows.find((row) => row.number === "55501111");
  assert.ok(whatsappOnly);
  assert.equal(whatsappOnly?.canCall, false);
  assert.equal(whatsappOnly?.canWhatsapp, true);
});

test("normalizeClientEmailChannels normaliza lowercase y fuerza primario si falta", () => {
  const rows = normalizeClientEmailChannels({
    channels: [
      {
        category: ClientEmailCategory.WORK,
        value: "VENTAS@ACME.COM",
        isPrimary: false,
        isActive: true
      }
    ]
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.category, ClientEmailCategory.WORK);
  assert.equal(rows[0]?.valueNormalized, "ventas@acme.com");
  assert.equal(rows[0]?.isPrimary, true);
});
