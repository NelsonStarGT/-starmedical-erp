import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { Registry, collectDefaultMetrics } from "prom-client";
import { z } from "zod";
import { env, OPS_ALLOWLIST } from "./config/env.js";
import { isBearerTokenValid, guardNonce, guardRateLimit, verifySignature } from "./security/auth.js";
import { isIpAllowed, normalizeIp } from "./security/network.js";
import { applyResources, currentResources, resetResources, restartService } from "./services/compose.js";
import { RESOURCE_RECOMMENDATIONS } from "./services/recommendations.js";
import { triggerAppDataReset } from "./services/appResetClient.js";
import { logError, logInfo, logWarn } from "./utils/logger.js";

const resourcesApplyBatchSchema = z.object({
  tenantId: z.string().trim().optional(),
  services: z
    .array(
      z.object({
        service: z.string().min(1).max(64),
        cpus: z.number().min(0.1).max(16),
        memoryMb: z.number().int().min(64).max(131072)
      })
    )
    .min(1)
});

const resourcesApplySingleSchema = z.object({
  tenantId: z.string().trim().optional(),
  serviceKey: z.string().trim().min(1).max(64),
  cpuLimit: z.coerce.number().min(0.1).max(16),
  memLimit: z.union([z.coerce.number(), z.string().trim().min(1).max(16)])
});

const resourcesApplySchema = z.union([resourcesApplyBatchSchema, resourcesApplySingleSchema]);

const resourcesResetBatchSchema = z.object({
  tenantId: z.string().trim().optional(),
  services: z.array(z.string().min(1).max(64)).optional()
});

const resourcesResetSingleSchema = z.object({
  tenantId: z.string().trim().optional(),
  serviceKey: z.string().trim().min(1).max(64).optional()
});

const resourcesResetSchema = z.union([resourcesResetBatchSchema, resourcesResetSingleSchema]);

const restartSchema = z.union([
  z.object({
    tenantId: z.string().trim().optional(),
    service: z.string().min(1).max(64)
  }),
  z.object({
    tenantId: z.string().trim().optional(),
    serviceKey: z.string().min(1).max(64)
  })
]);

const actorContextSchema = z.object({
  actorUserId: z.string().trim().optional(),
  actorRole: z.string().trim().optional(),
  tenantId: z.string().trim().optional(),
  branchId: z.string().trim().optional()
});

const dataResetSchema = z.object({
  tenantId: z.string().trim().optional(),
  scope: z.enum(["module", "global"]),
  module: z.string().trim().optional(),
  moduleKey: z.string().trim().optional(),
  requestId: z.string().trim().optional(),
  actorUserId: z.string().trim().optional(),
  actorRole: z.string().trim().optional(),
  actorContext: actorContextSchema.optional(),
  challengeId: z.string().trim().optional(),
  reason: z.string().trim().max(500).optional()
});

function getClientIp(headers: Record<string, string | string[] | undefined>, fallbackIp: string) {
  const xForwardedFor = headers["x-forwarded-for"];
  const raw = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
  return normalizeIp(raw || fallbackIp);
}

type RawBodyRequest = FastifyRequest & { rawBody?: string };

function parseMemoryLimitMb(value: number | string) {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) throw new Error("memory_limit_invalid");
    return Math.round(value);
  }

  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) throw new Error("memory_limit_invalid");
  const parsed = Number(normalized.replace(/[a-z]+$/, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("memory_limit_invalid");

  if (normalized.endsWith("gb") || normalized.endsWith("g")) {
    return Math.round(parsed * 1024);
  }
  if (normalized.endsWith("mb") || normalized.endsWith("m")) {
    return Math.round(parsed);
  }

  return Math.round(parsed);
}

function normalizeResourcesApplyInput(input: z.infer<typeof resourcesApplySchema>) {
  if ("services" in input) {
    return {
      tenantId: input.tenantId,
      services: input.services.map((service) => ({
        service: service.service,
        cpus: service.cpus,
        memoryMb: service.memoryMb
      }))
    };
  }

  return {
    tenantId: input.tenantId,
    services: [
      {
        service: input.serviceKey,
        cpus: input.cpuLimit,
        memoryMb: parseMemoryLimitMb(input.memLimit)
      }
    ]
  };
}

function normalizeResourcesResetInput(input: z.infer<typeof resourcesResetSchema>) {
  if ("services" in input) {
    return {
      tenantId: input.tenantId,
      services: input.services
    };
  }

  const serviceKey = "serviceKey" in input ? input.serviceKey : undefined;
  return {
    tenantId: input.tenantId,
    services: serviceKey ? [serviceKey] : []
  };
}

function normalizeRestartInput(input: z.infer<typeof restartSchema>) {
  return {
    tenantId: input.tenantId,
    service: "service" in input ? input.service : input.serviceKey
  };
}

function normalizeDataResetInput(input: z.infer<typeof dataResetSchema>) {
  const actorContext = input.actorContext;
  return {
    tenantId: input.tenantId || actorContext?.tenantId,
    scope: input.scope,
    module: input.module || input.moduleKey,
    requestId: input.requestId,
    actorUserId: input.actorUserId || actorContext?.actorUserId,
    actorRole: input.actorRole || actorContext?.actorRole,
    challengeId: input.challengeId,
    reason: input.reason
  };
}

export function createServer() {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  const app = Fastify({ logger: false });

  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req: RawBodyRequest, body: string, done) => {
      req.rawBody = body || "";
      try {
        done(null, body ? JSON.parse(body) : {});
      } catch {
        done(new Error("json_invalid"));
      }
    }
  );

  app.get("/healthz", async () => ({ ok: true, service: "ops-agent", ts: new Date().toISOString() }));

  app.get("/metrics", async (_req, reply) => {
    reply.header("Content-Type", registry.contentType);
    return registry.metrics();
  });

  app.addHook("preHandler", async (req, reply) => {
    if (req.url === "/healthz" || req.url === "/metrics") return;

    const ip = getClientIp(req.headers as any, req.ip);
    if (!isIpAllowed(ip, OPS_ALLOWLIST)) {
      logWarn("auth.blocked_ip", { ip, path: req.url });
      return reply.code(403).send({ ok: false, error: "blocked_ip" });
    }

    const nowMs = Date.now();
    const rate = guardRateLimit(ip, nowMs);
    if (!rate.allowed) {
      return reply.code(429).send({ ok: false, error: "rate_limit", retryAfterSeconds: rate.retryAfterSeconds });
    }

    if (!isBearerTokenValid(req.headers.authorization)) {
      return reply.code(401).send({ ok: false, error: "unauthorized" });
    }

    const rawReq = req as RawBodyRequest;
    const bodyText = req.method === "GET" ? "" : rawReq.rawBody || "";
    const timestamp = String(req.headers["x-timestamp"] || "");
    const nonce = String(req.headers["x-nonce"] || "");
    const signature = String(req.headers["x-signature"] || "");

    if (!timestamp || !nonce || !signature) {
      return reply.code(401).send({ ok: false, error: "signature_required" });
    }

    if (!guardNonce(nonce, nowMs)) {
      return reply.code(409).send({ ok: false, error: "replay_detected" });
    }

    const valid = verifySignature({
      body: bodyText,
      timestamp,
      nonce,
      signature,
      nowMs,
      maxSkewMs: env.OPS_AGENT_NONCE_TTL_MS
    });
    if (!valid) {
      return reply.code(401).send({ ok: false, error: "signature_invalid" });
    }
  });

  const resourcesCurrentHandler = async (req: FastifyRequest) => {
    const query = req.query as { tenantId?: string };
    const state = await currentResources(query.tenantId);

    return {
      ok: true,
      data: {
        ...state,
        recommendations: RESOURCE_RECOMMENDATIONS
      }
    };
  };

  const resourcesApplyHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = resourcesApplySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, error: "invalid_payload", details: parsed.error.flatten() });
    }

    try {
      const result = await applyResources(normalizeResourcesApplyInput(parsed.data));
      logInfo("resources.apply", {
        tenantId: result.tenantId,
        serviceCount: Object.keys(result.services).length
      });
      return { ok: true, data: result };
    } catch (error) {
      logError("resources.apply.failed", { message: (error as Error).message });
      return reply.code(502).send({ ok: false, error: "apply_failed", detail: (error as Error).message });
    }
  };

  const resourcesResetHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = resourcesResetSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, error: "invalid_payload", details: parsed.error.flatten() });
    }

    try {
      const result = await resetResources(normalizeResourcesResetInput(parsed.data));
      logInfo("resources.reset", {
        tenantId: result.tenantId,
        remainingServices: Object.keys(result.services).length
      });
      return { ok: true, data: result };
    } catch (error) {
      logError("resources.reset.failed", { message: (error as Error).message });
      return reply.code(502).send({ ok: false, error: "reset_failed", detail: (error as Error).message });
    }
  };

  const restartHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = restartSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, error: "invalid_payload", details: parsed.error.flatten() });
    }

    try {
      const result = await restartService(normalizeRestartInput(parsed.data));
      logInfo("service.restart", {
        tenantId: result.tenantId,
        service: result.service
      });
      return { ok: true, data: result };
    } catch (error) {
      logError("service.restart.failed", { message: (error as Error).message });
      return reply.code(502).send({ ok: false, error: "restart_failed", detail: (error as Error).message });
    }
  };

  const dataResetHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = dataResetSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, error: "invalid_payload", details: parsed.error.flatten() });
    }
    const payload = normalizeDataResetInput(parsed.data);

    if (payload.scope === "module" && !payload.module) {
      return reply.code(400).send({ ok: false, error: "module_required" });
    }

    try {
      const result = await triggerAppDataReset(payload);
      logInfo("data.reset.executed", {
        scope: payload.scope,
        module: payload.module || null,
        tenantId: payload.tenantId || null,
        actorUserId: payload.actorUserId || null,
        challengeId: payload.challengeId || null
      });
      return { ok: true, data: result };
    } catch (error) {
      logError("data.reset.failed", { message: (error as Error).message });
      return reply.code(502).send({ ok: false, error: "data_reset_failed", detail: (error as Error).message });
    }
  };

  app.get("/v1/resources/current", resourcesCurrentHandler);
  app.get("/internal/ops/resources/current", resourcesCurrentHandler);

  app.post("/v1/resources/apply", resourcesApplyHandler);
  app.post("/internal/ops/resources/apply", resourcesApplyHandler);

  app.post("/v1/resources/reset", resourcesResetHandler);
  app.post("/internal/ops/config/reset", resourcesResetHandler);

  app.post("/v1/services/restart", restartHandler);
  app.post("/internal/ops/service/restart", restartHandler);

  app.post("/v1/data-reset", dataResetHandler);
  app.post("/internal/ops/data/reset/confirm", dataResetHandler);
  app.post("/internal/ops/data/reset/request", async (_req, reply) => {
    return reply.code(400).send({
      ok: false,
      error: "otp_request_managed_by_erp",
      detail: "Use /api/admin/config/ops/actions/reset/request-otp in ERP."
    });
  });

  return app;
}
