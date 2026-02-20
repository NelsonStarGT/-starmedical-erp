import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { POST as schedulerConfigPost } from "@/app/api/admin/config/ops/scheduler-config/route";

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-star-secret";

test("ops scheduler config rbac: rol OPS no puede actualizar configuración", { concurrency: false }, async () => {
  const token = jwt.sign(
    {
      id: "ops-user-99",
      email: "ops@starmedical.test",
      roles: ["OPS"],
      permissions: ["OPS:HEALTH:READ"]
    },
    AUTH_SECRET,
    { expiresIn: "1h" }
  );

  const req = new NextRequest("http://localhost/api/admin/config/ops/scheduler-config", {
    method: "POST",
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      enabled: true,
      frequencySeconds: 120,
      channels: {
        email: true,
        whatsapp: false
      }
    })
  });

  const res = await schedulerConfigPost(req);
  assert.equal(res.status, 403);
});
