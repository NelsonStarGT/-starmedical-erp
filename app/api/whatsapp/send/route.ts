import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { sendMessage } from "@/service/whatsappGateway";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const permission = requirePermission(auth.user, "INTEGRATIONS:WHATSAPP:SEND");
  if (permission.errorResponse) return permission.errorResponse;

  const payload = await req.json();
  await sendMessage(payload);

  await auditLog({
    action: "WHATSAPP_MESSAGE_SENT",
    entityType: "WhatsAppMessage",
    entityId: String(payload?.threadId || payload?.to || "manual-send"),
    user: auth.user,
    req,
    metadata: {
      to: payload?.to ?? null,
      workspaceId: payload?.workspaceId ?? null,
      numberId: payload?.numberId ?? null
    }
  });

  return NextResponse.json({
    ok: true,
    echo: payload,
    message: "Integración con gateway pendiente"
  });
}
