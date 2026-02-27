import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

function withAuth(url: string) {
  return new NextRequest(url, {
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=test-session`
    }
  });
}

test("proxy: redirect legacy /admin/reception/* -> /admin/recepcion/*", () => {
  const request = withAuth("http://localhost:3000/admin/reception/queues?branch=b1");
  const response = proxy(request);

  assert.equal(response.status, 308);
  const location = response.headers.get("location");
  assert.equal(location, "http://localhost:3000/admin/recepcion/queues?branch=b1");
});

test("proxy: canonical v2 /admin/recepcion/* rewrites internamente a /admin/reception/*", () => {
  const request = withAuth("http://localhost:3000/admin/recepcion/queues?branch=b1");
  const response = proxy(request);

  const rewrite = response.headers.get("x-middleware-rewrite");
  assert.equal(rewrite, "http://localhost:3000/admin/reception/queues?branch=b1");
  assert.equal(response.headers.get("location"), null);
});

test("proxy: rutas v1 /admin/recepcion/* (no v2) no se reescriben", () => {
  const request = withAuth("http://localhost:3000/admin/recepcion/citas");
  const response = proxy(request);

  assert.equal(response.headers.get("x-middleware-rewrite"), null);
  assert.equal(response.headers.get("location"), null);
});
