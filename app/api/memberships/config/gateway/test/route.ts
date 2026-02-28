import { NextRequest, NextResponse } from "next/server";
import { ensureMembershipAccess } from "@/lib/api/memberships";
import { getMembershipGatewayConfig } from "@/lib/memberships/service";
import { PERMISSIONS } from "@/lib/rbac";
import { handleMembershipApiError } from "@/app/api/memberships/_utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = ensureMembershipAccess(req, PERMISSIONS.MEMBERSHIPS_ADMIN);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const gateway = await getMembershipGatewayConfig();
    const ok = gateway.isEnabled && gateway.hasApiKey;
    return NextResponse.json({
      data: {
        ok,
        provider: gateway.provider,
        mode: gateway.mode,
        checkedAt: new Date().toISOString(),
        message: ok ? "Conexión básica validada" : "Configura API key y habilita la pasarela"
      }
    });
  } catch (error) {
    return handleMembershipApiError(error);
  }
}
