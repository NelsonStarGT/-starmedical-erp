import assert from "node:assert/strict";
import test from "node:test";
import { parsePortalRequestChannel } from "@/lib/portales/channel";

test("parsePortalRequestChannel clasifica canal correctamente", () => {
  assert.deepEqual(parsePortalRequestChannel("portal:client_123"), {
    channel: "PATIENT_PORTAL",
    companyId: null
  });

  assert.deepEqual(parsePortalRequestChannel("portal_company:company_456"), {
    channel: "COMPANY_PORTAL",
    companyId: "company_456"
  });

  assert.deepEqual(parsePortalRequestChannel("portal:company:company_789"), {
    channel: "COMPANY_PORTAL",
    companyId: "company_789"
  });

  assert.deepEqual(parsePortalRequestChannel("internal:user_1"), {
    channel: "INTERNAL",
    companyId: null
  });

  assert.deepEqual(parsePortalRequestChannel(""), {
    channel: "UNKNOWN",
    companyId: null
  });

  assert.deepEqual(parsePortalRequestChannel(null), {
    channel: "UNKNOWN",
    companyId: null
  });
});
