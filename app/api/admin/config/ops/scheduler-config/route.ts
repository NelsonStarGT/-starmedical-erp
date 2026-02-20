import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { consumePortalRateLimit } from "@/lib/portal/rateLimitStore";
import { resolveOpsAdminRecipient } from "@/lib/ops/adminRecipient";
import { canAccessOpsHealth, canExecuteOpsCritical } from "@/lib/ops/rbac";
import {
  readLatestOpsMetricsSnapshot,
  readOpsSchedulerConfig,
  readOpsSchedulerConfigPublic,
  writeOpsSchedulerConfig
} from "@/lib/ops/store";
import { getOrCreateRequestId, readClientIp, withRequestIdHeader } from "@/lib/http/requestContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  tenantId: z.string().trim().optional().nullable(),
  enabled: z.boolean(),
  frequencySeconds: z.coerce.number().int().min(60).max(3600),
  channels: z
    .object({
      email: z.boolean().optional(),
      whatsapp: z.boolean().optional()
    })
    .optional(),
  recipients: z
    .object({
      emails: z.array(z.string().trim().email()).max(30).optional(),
      whatsapp: z.array(z.string().trim().min(5).max(40)).max(30).optional()
    })
    .optional()
});

function resolveTenantId(input: {
  requestedTenantId: string | null;
  userTenantId?: string | null;
  isSuperAdmin: boolean;
}) {
  const requested = String(input.requestedTenantId || "").trim();
  if (requested && input.isSuperAdmin) return requested;
  return String(input.userTenantId || process.env.TENANT_ID || "local").trim() || "local";
}

async function getFallbackRecipient(tenantId: string) {
  try {
    const admin = await resolveOpsAdminRecipient({ tenantId });
    return admin?.email ? [admin.email] : [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const requestId = getOrCreateRequestId(req);
  const auth = requireAuth(req);
  if (auth.errorResponse) return withRequestIdHeader(auth.errorResponse, requestId);
  const user = auth.user;

  if (!canAccessOpsHealth(user)) {
    await auditLog({
      action: "OPS_SCHEDULER_CONFIG_FORBIDDEN",
      entityType: "OPS",
      entityId: "scheduler_config",
      user,
      req,
      requestId,
      module: "ops",
      metadata: { reason: "role_forbidden" }
    });

    return withRequestIdHeader(NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 }), requestId);
  }

  const ip = readClientIp(req.headers) || user?.id || "unknown";
  const rate = await consumePortalRateLimit(`ops:admin:scheduler:config:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!rate.allowed) {
    return withRequestIdHeader(
      NextResponse.json(
        {
          ok: false,
          error: "Rate limit",
          retryAfterSeconds: rate.retryAfterSeconds
        },
        { status: 429 }
      ),
      requestId
    );
  }

  const isSuperAdmin = canExecuteOpsCritical(user);
  const tenantId = resolveTenantId({
    requestedTenantId: req.nextUrl.searchParams.get("tenantId"),
    userTenantId: user.tenantId || null,
    isSuperAdmin
  });

  const fallbackRecipients = await getFallbackRecipient(tenantId);
  const config = await readOpsSchedulerConfigPublic({
    tenantId,
    fallbackRecipients
  });
  const latestRun = await readLatestOpsMetricsSnapshot({ tenantId, source: "scheduler" });

  await auditLog({
    action: "OPS_SCHEDULER_CONFIG_VIEW",
    entityType: "OPS",
    entityId: "scheduler_config",
    user,
    req,
    requestId,
    module: "ops",
    metadata: {
      tenantId,
      canEdit: isSuperAdmin,
      frequencySeconds: config.frequencySeconds,
      enabled: config.enabled,
      latestRunAt: latestRun?.createdAt || null
    }
  });

  return withRequestIdHeader(
    NextResponse.json({
      ok: true,
      requestId,
      data: {
        ...config,
        latestRun,
        canEdit: isSuperAdmin
      }
    }),
    requestId
  );
}

export async function POST(req: NextRequest) {
  const requestId = getOrCreateRequestId(req);
  const auth = requireAuth(req);
  if (auth.errorResponse) return withRequestIdHeader(auth.errorResponse, requestId);
  const user = auth.user;

  if (!canExecuteOpsCritical(user)) {
    await auditLog({
      action: "OPS_SCHEDULER_CONFIG_UPDATE_FORBIDDEN",
      entityType: "OPS",
      entityId: "scheduler_config",
      user,
      req,
      requestId,
      module: "ops",
      metadata: { reason: "role_forbidden" }
    });

    return withRequestIdHeader(NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 }), requestId);
  }

  const ip = readClientIp(req.headers) || user?.id || "unknown";
  const rate = await consumePortalRateLimit(`ops:admin:scheduler:config:update:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!rate.allowed) {
    return withRequestIdHeader(
      NextResponse.json(
        {
          ok: false,
          error: "Rate limit",
          retryAfterSeconds: rate.retryAfterSeconds
        },
        { status: 429 }
      ),
      requestId
    );
  }

  const parsed = payloadSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return withRequestIdHeader(
      NextResponse.json(
        {
          ok: false,
          error: "Payload inválido",
          details: parsed.error.flatten()
        },
        { status: 400 }
      ),
      requestId
    );
  }

  const tenantId = resolveTenantId({
    requestedTenantId: parsed.data.tenantId || null,
    userTenantId: user.tenantId || null,
    isSuperAdmin: true
  });
  const fallbackRecipients = await getFallbackRecipient(tenantId);
  const currentConfig = await readOpsSchedulerConfig({ tenantId, fallbackRecipients });

  const channels = {
    email: parsed.data.channels?.email ?? currentConfig.channels.email,
    whatsapp: parsed.data.channels?.whatsapp ?? currentConfig.channels.whatsapp
  };
  const recipients = parsed.data.recipients
    ? {
        emails: parsed.data.recipients.emails || [],
        whatsapp: parsed.data.recipients.whatsapp || []
      }
    : currentConfig.recipients;

  const configured = await writeOpsSchedulerConfig({
    tenantId,
    enabled: parsed.data.enabled,
    frequencySeconds: parsed.data.frequencySeconds,
    channels,
    recipients
  });

  const publicConfig = await readOpsSchedulerConfigPublic({
    tenantId,
    fallbackRecipients
  });
  const latestRun = await readLatestOpsMetricsSnapshot({ tenantId, source: "scheduler" });

  await auditLog({
    action: "OPS_SCHEDULER_CONFIG_UPDATED",
    entityType: "OPS",
    entityId: "scheduler_config",
    user,
    req,
    requestId,
    module: "ops",
    metadata: {
      tenantId,
      enabled: configured.enabled,
      frequencySeconds: configured.frequencySeconds,
      channels: configured.channels,
      recipientCount: configured.recipients.emails.length
    }
  });

  return withRequestIdHeader(
    NextResponse.json({
      ok: true,
      requestId,
      data: {
        ...publicConfig,
        latestRun,
        canEdit: true
      }
    }),
    requestId
  );
}
