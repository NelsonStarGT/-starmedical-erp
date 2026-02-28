import type { SessionUser } from "@/lib/auth";
import { recordSystemEvent } from "@/lib/ops/eventLog.server";
import { tenantIdFromUser } from "@/lib/tenant";

export async function recordClientsAccessBlocked(input: {
  user: SessionUser;
  route: string;
  capability: string;
  resourceType: "reports" | "bulk_export" | "bulk_import" | "bulk_template";
  reason?: string;
}) {
  const actorTenantId = tenantIdFromUser(input.user);

  await recordSystemEvent({
    tenantId: null,
    domain: "security",
    eventType: "CLIENTS_ACCESS_BLOCKED",
    severity: "WARN",
    resource: input.route,
    messageShort: "Intento bloqueado por permisos en módulo Clientes.",
    digestKey: `clients-access-blocked:${actorTenantId}:${input.route}:${input.capability}`,
    metaJson: {
      capability: input.capability,
      resourceType: input.resourceType,
      actorUserId: input.user.id,
      actorTenantId,
      reason: input.reason ?? null
    }
  });
}
