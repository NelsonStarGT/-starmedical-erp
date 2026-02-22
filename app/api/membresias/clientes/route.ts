// @deprecated Legacy alias. Usa /api/memberships/clients
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api/http";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  const allowed = ["MEMBERSHIPS:ADMIN", "MEMBERSHIPS:WRITE", "MEMBERSHIPS:CONTRACTS:WRITE"].some((perm) => hasPermission(auth.user, perm));
  if (!allowed) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q") || "";
  if (q.length < 2) return NextResponse.json({ data: [] });

  const results = await prisma.clientProfile.findMany({
    where: {
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { nit: { contains: q, mode: "insensitive" } }
      ]
    },
    take: 20
  });

  return NextResponse.json({
    data: results.map((r) => ({
      id: r.id,
      type: r.type,
      name: r.companyName || [r.firstName, r.lastName].filter(Boolean).join(" "),
      nit: r.nit,
      email: r.email,
      phone: r.phone
    }))
  });
}

export const GET = withApiErrorHandling(handler);
