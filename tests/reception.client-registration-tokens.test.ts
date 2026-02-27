import assert from "node:assert/strict";
import test from "node:test";
import {
  createClientRegistrationInviteToken,
  createClientRegistrationReceiptToken,
  hashClientRegistrationToken,
  verifyClientRegistrationInviteToken,
  verifyClientRegistrationReceiptToken
} from "@/lib/reception/clientRegistrationTokens";

test("token de invitación: firma válida y payload esperado", () => {
  const token = createClientRegistrationInviteToken({
    inviteId: "inv_1",
    tenantId: "tenant_1",
    clientType: "COMPANY",
    expiresAt: new Date(Date.now() + 60_000)
  });

  const verified = verifyClientRegistrationInviteToken(token);
  assert.ok(verified);
  assert.equal(verified?.inviteId, "inv_1");
  assert.equal(verified?.tenantId, "tenant_1");
  assert.equal(verified?.clientType, "COMPANY");
});

test("token de invitación inválido al alterar firma o expiración", () => {
  const valid = createClientRegistrationInviteToken({
    inviteId: "inv_2",
    tenantId: "tenant_1",
    clientType: "PERSON",
    expiresAt: new Date(Date.now() + 60_000)
  });
  const tampered = `${valid}x`;
  assert.equal(verifyClientRegistrationInviteToken(tampered), null);

  const expired = createClientRegistrationInviteToken({
    inviteId: "inv_3",
    tenantId: "tenant_1",
    clientType: "PERSON",
    expiresAt: new Date(Date.now() - 1_000)
  });
  assert.equal(verifyClientRegistrationInviteToken(expired), null);
});

test("token de comprobante y hash: válidos y determinísticos", () => {
  const token = createClientRegistrationReceiptToken({
    registrationId: "reg_1",
    tenantId: "tenant_9",
    expiresAt: new Date(Date.now() + 60_000)
  });

  const verified = verifyClientRegistrationReceiptToken(token);
  assert.ok(verified);
  assert.equal(verified?.registrationId, "reg_1");
  assert.equal(verified?.tenantId, "tenant_9");

  const hashA = hashClientRegistrationToken(token);
  const hashB = hashClientRegistrationToken(token);
  const hashC = hashClientRegistrationToken(`${token}.other`);

  assert.equal(hashA, hashB);
  assert.notEqual(hashA, hashC);
});
