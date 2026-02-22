import { NextRequest, NextResponse } from "next/server";
import { ClientProfileType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDiagnosticsPermission } from "@/lib/api/diagnostics";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = requireDiagnosticsPermission(req, "DIAG:READ");
  if (auth.errorResponse) return auth.errorResponse;
  const q = req.nextUrl.searchParams.get("q") || "";
  const where: Prisma.ClientProfileWhereInput | undefined = q
    ? {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { dpi: { contains: q, mode: "insensitive" } }
        ]
      }
    : undefined;
  const patients = await prisma.clientProfile.findMany({
    where,
    take: 20,
    orderBy: { updatedAt: "desc" },
    select: { id: true, firstName: true, lastName: true, dpi: true, phone: true, email: true }
  });
  return NextResponse.json({ data: patients });
}

export async function POST(req: NextRequest) {
  const auth = requireDiagnosticsPermission(req, "DIAG:WRITE");
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : null;
    const email = typeof body.email === "string" ? body.email.trim() : null;
    const dpi = typeof body.dpi === "string" ? body.dpi.trim() : null;
    if (!firstName) return NextResponse.json({ error: "firstName requerido" }, { status: 400 });

    const saved = await prisma.clientProfile.create({
      data: {
        type: ClientProfileType.PERSON,
        firstName,
        lastName: lastName || null,
        phone,
        email,
        dpi
      }
    });

    return NextResponse.json({ data: saved }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un paciente con DPI/NIT duplicado" }, { status: 409 });
    }
    console.error("create patient error", err);
    return NextResponse.json({ error: "No se pudo crear el paciente" }, { status: 500 });
  }
}
