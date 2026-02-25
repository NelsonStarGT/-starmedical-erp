import assert from "node:assert/strict";
import test from "node:test";
import {
  isOtherAcquisitionDetail,
  isReferralAcquisitionSource,
  isSocialAcquisitionSource,
  normalizeAcquisitionToken,
  requiresAcquisitionOtherNote,
  validateAcquisitionConditionalFields
} from "@/lib/clients/acquisition";

test("normalizeAcquisitionToken normaliza acentos y separadores", () => {
  assert.equal(normalizeAcquisitionToken("Redes sociales"), "REDES_SOCIALES");
  assert.equal(normalizeAcquisitionToken("Otra red"), "OTRA_RED");
});

test("detector de canal referido y social funciona por code o name", () => {
  assert.equal(isReferralAcquisitionSource({ code: "REFERRED" }), true);
  assert.equal(isReferralAcquisitionSource({ name: "Referido" }), true);
  assert.equal(isSocialAcquisitionSource({ code: "SOCIAL_MEDIA" }), true);
  assert.equal(isSocialAcquisitionSource({ name: "Redes sociales" }), true);
});

test("isOtherAcquisitionDetail reconoce otras variantes de red social", () => {
  assert.equal(isOtherAcquisitionDetail({ code: "OTHER_NETWORK" }), true);
  assert.equal(isOtherAcquisitionDetail({ name: "Otra red" }), true);
  assert.equal(isOtherAcquisitionDetail({ name: "Facebook" }), false);
});

test("requiresAcquisitionOtherNote exige nota para canal OTRO", () => {
  assert.equal(
    requiresAcquisitionOtherNote({
      sourceCode: "OTHER"
    }),
    true
  );
});

test("requiresAcquisitionOtherNote exige nota para redes sociales con detalle 'Otra red'", () => {
  assert.equal(
    requiresAcquisitionOtherNote({
      sourceCode: "SOCIAL_MEDIA",
      detailCode: "OTHER_NETWORK"
    }),
    true
  );

  assert.equal(
    requiresAcquisitionOtherNote({
      sourceCode: "SOCIAL_MEDIA",
      detailCode: "FACEBOOK"
    }),
    false
  );
});

test("persona: canal OTRO sin nota devuelve error", () => {
  const result = validateAcquisitionConditionalFields({
    sourceCode: "OTHER",
    otherNote: ""
  });

  assert.equal(result.noteError, "Describe cómo nos conoció.");
});

test("persona: redes sociales + otra red sin nota devuelve error", () => {
  const result = validateAcquisitionConditionalFields({
    sourceCode: "SOCIAL_MEDIA",
    detailCode: "OTHER_NETWORK",
    detailOptionId: "detail-other-network",
    otherNote: ""
  });

  assert.equal(result.noteError, "Describe la red social.");
});

test("persona: casos validos de adquisicion no generan error", () => {
  const otherOk = validateAcquisitionConditionalFields({
    sourceCode: "OTHER",
    otherNote: "Vio una lona en la calle."
  });
  assert.equal(otherOk.noteError, null);

  const socialStandardOk = validateAcquisitionConditionalFields({
    sourceCode: "SOCIAL_MEDIA",
    detailCode: "FACEBOOK",
    detailOptionId: "detail-facebook",
    otherNote: ""
  });
  assert.equal(socialStandardOk.detailError, null);
  assert.equal(socialStandardOk.noteError, null);

  const socialOtherOk = validateAcquisitionConditionalFields({
    sourceCode: "SOCIAL_MEDIA",
    detailCode: "OTHER_NETWORK",
    detailOptionId: "detail-other-network",
    otherNote: "Campana en red local."
  });
  assert.equal(socialOtherOk.noteError, null);
});
