import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MembershipStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { safeJson, withApiErrorHandling } from "@/lib/api/http";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getMembershipConfig, serializeContract } from "@/lib/memberships/service";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.nativeEnum(MembershipStatus)
});

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const allowed = ["MEMBERSHIPS:ADMIN", "MEMBERSHIPS:WRITE", "MEMBERSHIPS:CONTRACTS:WRITE"].some((perm) => hasPermission(auth.user, perm));
  if (!allowed) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await safeJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Estado inválido", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { id } = params;
  const existing = await prisma.membershipContract.findUnique({
    where: { id },
    include: { MembershipPlan: true, MembershipDependent: true, Branch: true, ClientProfile: true }
  });
  if (!existing) return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });

  const updated = await prisma.membershipContract.update({
    where: { id },
    data: { status: parsed.data.status },
    include: { MembershipPlan: true, MembershipDependent: true, Branch: true, ClientProfile: true }
  });
  const config = await getMembershipConfig(prisma);
  return NextResponse.json({ data: serializeContract(updated, config) });
}

export const POST = withApiErrorHandling(handler);
