import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createPortalFileProxyToken, verifyPortalFileProxyToken } from "@/lib/portal/files";
import { GET as getSignedUrl } from "@/app/portal/api/files/signed/route";

test("portal file proxy token respeta expiración", () => {
  const validToken = createPortalFileProxyToken({
    storageKey: "results/lab/report.pdf",
    originalName: "report.pdf",
    mimeType: "application/pdf",
    expMs: Date.now() + 60_000
  });
  const payload = verifyPortalFileProxyToken(validToken);
  assert.ok(payload);
  assert.equal(payload?.storageKey, "results/lab/report.pdf");

  const expiredToken = createPortalFileProxyToken({
    storageKey: "results/lab/report.pdf",
    originalName: "report.pdf",
    mimeType: "application/pdf",
    expMs: Date.now() - 1_000
  });
  const expiredPayload = verifyPortalFileProxyToken(expiredToken);
  assert.equal(expiredPayload, null);
});

test("signed url endpoint requiere sesión activa", async () => {
  const req = new NextRequest("http://localhost:3000/portal/api/files/signed?assetId=fake");
  const res = await getSignedUrl(req);
  assert.equal(res.status, 401);
});
