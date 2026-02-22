import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { safeJson, withApiErrorHandling } from "@/lib/api/http";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const schema = z.object({
  active: z.boolean()
});

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const allowed = ["MEMBERSHIPS:ADMIN", "MEMBERSHIPS:WRITE", "MEMBERSHIPS:PLANS:WRITE"].some((perm) => hasPermission(auth.user, perm));
  if (!allowed) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await safeJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Estado inválido", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { id } = params;
  const plan = await prisma.membershipPlan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });

  if (!parsed.data.active) {
    const activeContracts = await prisma.membershipContract.count({ where: { planId: id, status: "ACTIVO" } });
    if (activeContracts > 0) {
      return NextResponse.json({ error: "No se puede desactivar un plan con membresías activas" }, { status: 400 });
    }
  }

  const updated = await prisma.membershipPlan.update({
    where: { id },
    data: { active: parsed.data.active, updatedAt: new Date() }
  });

  return NextResponse.json({ data: updated });
}

export const POST = withApiErrorHandling(handler);
