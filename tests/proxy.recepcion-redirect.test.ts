import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

function withAuth(url: string) {
  const token = jwt.sign(
    {
      id: "user-proxy",
      email: "proxy@starmedical.test",
      roles: ["ADMIN"],
      permissions: ["SYSTEM:ADMIN"],
      tenantId: "global"
    },
    process.env.AUTH_SECRET || "test-star-secret",
    { expiresIn: "1h" }
  );
  return new NextRequest(url, {
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`
    }
  });
}

test("proxy: redirect alias /admin/recepcion/* -> /admin/reception/*", async () => {
  const request = withAuth("http://localhost:3000/admin/recepcion/queues?branch=b1");
  const response = await proxy(request);

  assert.equal(response.status, 308);
  const location = response.headers.get("location");
  assert.equal(location, "http://localhost:3000/admin/reception/queues?branch=b1");
});

test("proxy: alias raiz /admin/recepcion -> /admin/reception/dashboard", async () => {
  const request = withAuth("http://localhost:3000/admin/recepcion");
  const response = await proxy(request);

  assert.equal(response.status, 308);
  const location = response.headers.get("location");
  assert.equal(location, "http://localhost:3000/admin/reception/dashboard");
});

test("proxy: mappea alias legacy /admin/recepcion/cola -> /admin/reception/queues", async () => {
  const request = withAuth("http://localhost:3000/admin/recepcion/cola?branch=b1");
  const response = await proxy(request);

  assert.equal(response.status, 308);
  const location = response.headers.get("location");
  assert.equal(location, "http://localhost:3000/admin/reception/queues?branch=b1");
});

test("proxy: canonical /admin/reception/* no redirige ni reescribe", async () => {
  const request = withAuth("http://localhost:3000/admin/reception/appointments");
  const response = await proxy(request);

  assert.equal(response.headers.get("x-middleware-rewrite"), null);
  assert.equal(response.headers.get("location"), null);
});

test("proxy: /admin/usuarios redirige a login sin sesion valida", async () => {
  const request = new NextRequest("http://localhost:3000/admin/usuarios");
  const response = await proxy(request);

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/login");
});
