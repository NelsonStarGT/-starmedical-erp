import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { fetchThreads } from "@/service/whatsappGateway";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.errorResponse) return auth.errorResponse;
  const permission = requirePermission(auth.user, "INTEGRATIONS:WHATSAPP:READ");
  if (permission.errorResponse) return permission.errorResponse;

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const numberId = searchParams.get("numberId");

  if (!workspaceId || !numberId) {
    return NextResponse.json(
      { error: "workspaceId y numberId son requeridos" },
      { status: 400 }
    );
  }

  const data = await fetchThreads({ workspaceId, numberId });

  await auditLog({
    action: "WHATSAPP_THREADS_VIEWED",
    entityType: "WhatsAppThread",
    entityId: `${workspaceId}:${numberId}`,
    user: auth.user,
    req: request,
    metadata: {
      workspaceId,
      numberId
    }
  });

  return NextResponse.json(data);
}
