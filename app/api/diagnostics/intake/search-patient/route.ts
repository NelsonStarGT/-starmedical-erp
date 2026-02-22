import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticsIntakeRole } from "@/lib/api/diagnostics";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = requireDiagnosticsIntakeRole(req);
  if (auth.errorResponse) return auth.errorResponse;

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q || q.length < 2) return NextResponse.json({ data: [] });

  const where: Prisma.ClientProfileWhereInput = {
    OR: [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { dpi: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } }
    ]
  };

  const patients = await prisma.clientProfile.findMany({
    where,
    take: 20,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dpi: true,
      phone: true,
      email: true,
      sex: true,
      birthDate: true,
      address: true
    }
  });

  return NextResponse.json({ data: patients });
}
