import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api/hr";
import { branchSchema } from "@/lib/hr/schemas";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN", "HR_USER", "STAFF", "VIEWER"]);
  if (auth.errorResponse) return auth.errorResponse;

  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "1";
  const branches = await prisma.branch.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { name: "asc" }
  });
  return NextResponse.json({ data: branches });
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN", "HR_ADMIN"], "HR:SETTINGS:EDIT");
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => ({}));
  const parsed = branchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const created = await prisma.branch.create({
      data: {
        name: parsed.data.name.trim(),
        code: parsed.data.code.trim().toUpperCase(),
        address: parsed.data.address.trim(),
        isActive: parsed.data.isActive ?? true,
        createdById: auth.user?.id || null
      }
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    console.error("[hr:branches:create]", err);
    if (err.code === "P2002") return NextResponse.json({ error: "Sucursal duplicada" }, { status: 409 });
    return NextResponse.json({ error: "No se pudo crear la sucursal" }, { status: 400 });
  }
}
