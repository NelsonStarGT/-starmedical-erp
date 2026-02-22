import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

function signBody(secret: string, body: string, timestamp: string, nonce: string) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${nonce}.${body}`).digest("hex");
}

function buildSignedHeaders(input?: {
  ip?: string;
  invalidSignature?: boolean;
  includeAuth?: boolean;
  rawBody?: string;
}) {
  const token = process.env.OPS_AGENT_TOKEN || "ops-agent-test-token";
  const secret = process.env.OPS_AGENT_HMAC_SECRET || "ops-agent-test-hmac-secret";
  const timestamp = String(Date.now());
  const nonce = crypto.randomBytes(12).toString("hex");
  const rawBody = input?.rawBody || "";
  const signature = signBody(secret, rawBody, timestamp, nonce);

  const headers: Record<string, string> = {
    "x-timestamp": timestamp,
    "x-nonce": nonce,
    "x-signature": input?.invalidSignature ? "bad-signature" : signature,
    "x-forwarded-for": input?.ip || "10.10.0.5"
  };

  if (input?.includeAuth !== false) {
    headers.authorization = `Bearer ${token}`;
  }

  return headers;
}

let createServerFn: null | (() => any) = null;

async function loadCreateServer() {
  if (createServerFn) return createServerFn;

  process.env.OPS_AGENT_TOKEN = process.env.OPS_AGENT_TOKEN || "ops-agent-test-token";
  process.env.OPS_AGENT_HMAC_SECRET = process.env.OPS_AGENT_HMAC_SECRET || "ops-agent-test-hmac-secret";
  process.env.OPS_AGENT_ALLOWLIST = process.env.OPS_AGENT_ALLOWLIST || "127.0.0.1,::1";
  process.env.OPS_APP_RESET_TOKEN = process.env.OPS_APP_RESET_TOKEN || "ops-app-reset-test-token";
  process.env.OPS_APP_RESET_HMAC_SECRET = process.env.OPS_APP_RESET_HMAC_SECRET || "ops-app-reset-test-hmac-secret";
  process.env.OPS_APP_RESET_URL = process.env.OPS_APP_RESET_URL || "http://app:3000/api/internal/ops/reset-data";
  process.env.OPS_OVERRIDE_DIR = process.env.OPS_OVERRIDE_DIR || "/tmp/ops-agent-test";
  process.env.OPS_WORKDIR = process.env.OPS_WORKDIR || "/tmp";
  process.env.OPS_COMPOSE_FILE = process.env.OPS_COMPOSE_FILE || "/tmp/docker-compose.local.yml";
  process.env.OPS_DEFAULT_TENANT = process.env.OPS_DEFAULT_TENANT || "local";
  process.env.OPS_PROJECT_PREFIX = process.env.OPS_PROJECT_PREFIX || "starmedical";

  const serverModule = await import("../server.js");
  createServerFn = serverModule.createServer;
  return createServerFn;
}

test("ops-agent auth: bloquea cuando falta bearer token", async () => {
  const createServer = await loadCreateServer();
  const app = createServer();
  try {
    const response = await app.inject({
      method: "GET",
      url: "/internal/ops/resources/current",
      headers: buildSignedHeaders({ includeAuth: false })
    });
    assert.equal(response.statusCode, 401);
    assert.match(response.body, /unauthorized/i);
  } finally {
    await app.close();
  }
});

test("ops-agent auth: bloquea firma inválida", async () => {
  const createServer = await loadCreateServer();
  const app = createServer();
  try {
    const response = await app.inject({
      method: "GET",
      url: "/internal/ops/resources/current",
      headers: buildSignedHeaders({ invalidSignature: true })
    });
    assert.equal(response.statusCode, 401);
    assert.match(response.body, /signature_invalid/i);
  } finally {
    await app.close();
  }
});

test("ops-agent auth: bloquea IP pública fuera de allowlist", async () => {
  const createServer = await loadCreateServer();
  const app = createServer();
  try {
    const response = await app.inject({
      method: "GET",
      url: "/internal/ops/resources/current",
      headers: buildSignedHeaders({ ip: "8.8.8.8" })
    });
    assert.equal(response.statusCode, 403);
    assert.match(response.body, /blocked_ip/i);
  } finally {
    await app.close();
  }
});

test("ops-agent auth: permite request firmado en ruta interna", async () => {
  const createServer = await loadCreateServer();
  const app = createServer();
  try {
    const response = await app.inject({
      method: "GET",
      url: "/internal/ops/resources/current?tenantId=local",
      headers: buildSignedHeaders()
    });
    assert.equal(response.statusCode, 200);
    const payload = response.json() as { ok?: boolean; data?: { tenantId?: string } };
    assert.equal(payload.ok, true);
    assert.equal(payload.data?.tenantId, "local");
  } finally {
    await app.close();
  }
});

test("ops-agent auth: firma raw-body permite mismo payload con distinto orden de keys", async () => {
  const createServer = await loadCreateServer();
  const app = createServer();
  try {
    const bodyA = '{"scope":"module","module":"processing_jobs"}';
    const bodyB = '{"module":"processing_jobs","scope":"module"}';

    const responseA = await app.inject({
      method: "POST",
      url: "/internal/ops/data/reset/request",
      payload: bodyA,
      headers: {
        ...buildSignedHeaders({ rawBody: bodyA }),
        "content-type": "application/json"
      }
    });

    const responseB = await app.inject({
      method: "POST",
      url: "/internal/ops/data/reset/request",
      payload: bodyB,
      headers: {
        ...buildSignedHeaders({ rawBody: bodyB }),
        "content-type": "application/json"
      }
    });

    assert.equal(responseA.statusCode, 400);
    assert.equal(responseB.statusCode, 400);
    assert.match(responseA.body, /otp_request_managed_by_erp/i);
    assert.match(responseB.body, /otp_request_managed_by_erp/i);
  } finally {
    await app.close();
  }
});
