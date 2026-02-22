// @deprecated Legacy alias. Usa /api/memberships/contracts/[id]
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api/http";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getMembershipConfig, serializeContract } from "@/lib/memberships/service";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const allowed = ["MEMBERSHIPS:ADMIN", "MEMBERSHIPS:READ", "MEMBERSHIPS:CONTRACTS:READ"].some((perm) => hasPermission(auth.user, perm));
  if (!allowed) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = params;
  const contract = await prisma.membershipContract.findUnique({
    where: { id },
    include: {
      MembershipPlan: { include: { MembershipBenefit: true } },
      MembershipDependent: true,
      MembershipPayment: { orderBy: { paidAt: "desc" } },
      MembershipUsage: { orderBy: { occurredAt: "desc" }, take: 20 },
      Branch: true,
      ClientProfile: true
    }
  });

  if (!contract) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  const config = await getMembershipConfig(prisma);
  const data = serializeContract(contract, config);

  return NextResponse.json({
    data: {
      ...data,
      payments: contract.MembershipPayment,
      dependents: contract.MembershipDependent,
      usages: contract.MembershipUsage
    }
  });
}

export const GET = withApiErrorHandling(handler);
