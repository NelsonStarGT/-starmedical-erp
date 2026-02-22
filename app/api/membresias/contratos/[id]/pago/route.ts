// @deprecated Legacy alias. Usa /api/memberships/contracts/[id]/payment
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson, withApiErrorHandling } from "@/lib/api/http";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { registerPayment } from "@/lib/memberships/service";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const allowed = ["MEMBERSHIPS:ADMIN", "MEMBERSHIPS:WRITE", "MEMBERSHIPS:PAYMENTS:WRITE"].some((perm) => hasPermission(auth.user, perm));
  if (!allowed) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await safeJson(req);
  const result = await registerPayment(prisma, params.id, body);

  return NextResponse.json({ data: result.contract, payment: result.payment });
}

export const POST = withApiErrorHandling(handler);
