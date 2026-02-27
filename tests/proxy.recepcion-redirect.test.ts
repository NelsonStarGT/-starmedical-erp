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

test("proxy: redirect alias /admin/recepcion/* -> /admin/reception/*", () => {
  const request = withAuth("http://localhost:3000/admin/recepcion/queues?branch=b1");
  const response = proxy(request);

  assert.equal(response.status, 308);
  const location = response.headers.get("location");
  assert.equal(location, "http://localhost:3000/admin/reception/queues?branch=b1");
});

test("proxy: alias raiz /admin/recepcion -> /admin/reception/dashboard", () => {
  const request = withAuth("http://localhost:3000/admin/recepcion");
  const response = proxy(request);

  assert.equal(response.status, 308);
  const location = response.headers.get("location");
  assert.equal(location, "http://localhost:3000/admin/reception/dashboard");
});

test("proxy: mappea alias legacy /admin/recepcion/cola -> /admin/reception/queues", () => {
  const request = withAuth("http://localhost:3000/admin/recepcion/cola?branch=b1");
  const response = proxy(request);

  assert.equal(response.status, 308);
  const location = response.headers.get("location");
  assert.equal(location, "http://localhost:3000/admin/reception/queues?branch=b1");
});

test("proxy: canonical /admin/reception/* no redirige ni reescribe", () => {
  const request = withAuth("http://localhost:3000/admin/reception/appointments");
  const response = proxy(request);

  assert.equal(response.headers.get("x-middleware-rewrite"), null);
  assert.equal(response.headers.get("location"), null);
});
