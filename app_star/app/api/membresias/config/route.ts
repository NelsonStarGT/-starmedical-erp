// @deprecated Legacy alias. Usa /api/memberships/config
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson, withApiErrorHandling } from "@/lib/api/http";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getMembershipConfig } from "@/lib/memberships/service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const configSchema = z.object({
  reminderDays: z.number().int().min(1).max(120),
  graceDays: z.number().int().min(0).max(60),
  inactiveAfterDays: z.number().int().min(30).max(365),
  autoRenewWithPayment: z.boolean(),
  prorateOnMidmonth: z.boolean(),
  blockIfBalanceDue: z.boolean(),
  requireInitialPayment: z.boolean(),
  cashTransferMinMonths: z.number().int().min(0).max(12),
  priceChangeNoticeDays: z.number().int().min(0).max(120)
});

async function getHandler(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const allowed = ["MEMBERSHIPS:ADMIN", "MEMBERSHIPS:READ", "MEMBERSHIPS:CONFIG:READ", "MEMBERSHIPS:DASHBOARD"].some((perm) =>
    hasPermission(auth.user, perm)
  );
  if (!allowed) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const config = await getMembershipConfig(prisma);
  return NextResponse.json({ data: config });
}

async function postHandler(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const allowed = ["MEMBERSHIPS:ADMIN", "MEMBERSHIPS:WRITE", "MEMBERSHIPS:CONFIG:WRITE"].some((perm) => hasPermission(auth.user, perm));
  if (!allowed) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await safeJson(req);
  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Config inválida", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = { ...parsed.data, updatedAt: new Date() };
  const saved = await prisma.membershipConfig.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data }
  });

  return NextResponse.json({ data: saved });
}

export const GET = withApiErrorHandling(getHandler);
export const POST = withApiErrorHandling(postHandler);
