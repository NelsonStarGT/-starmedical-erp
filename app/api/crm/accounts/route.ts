import { NextRequest, NextResponse } from "next/server";
import { ClientProfileType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";
import { linkOrCreateClientProfile } from "@/lib/api/crmLink";

export const dynamic = "force-dynamic";

function normalize(body: any, requireAll = true) {
  const name = body.name !== undefined ? String(body.name || "").trim() : undefined;
  const nit = body.nit !== undefined ? String(body.nit || "").trim() : undefined;
  const address = body.address !== undefined ? String(body.address || "").trim() : undefined;
  const sector = body.sector !== undefined ? String(body.sector || "").trim() : undefined;
  const size = body.size !== undefined ? String(body.size || "").trim() : undefined;
  const creditTerm = body.creditTerm !== undefined ? String(body.creditTerm || "").trim() : undefined;
  const status = body.status !== undefined ? String(body.status || "").trim() : undefined;
  const ownerId = body.ownerId !== undefined ? String(body.ownerId || "").trim() : undefined;
  const createdById = body.createdById !== undefined ? String(body.createdById || "") : undefined;

  if (requireAll && !name) throw new Error("name requerido");
  return { name, nit, address, sector, size, creditTerm, status, ownerId, createdById };
}

export async function GET(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const q = req.nextUrl.searchParams.get("q");
    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { nit: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { address: { contains: q, mode: Prisma.QueryMode.insensitive } }
          ]
        }
      : undefined;
    const accounts = await prisma.crmAccount.findMany({
      where,
      select: {
        id: true,
        clientId: true,
        name: true,
        nit: true,
        address: true,
        sector: true,
        creditTerm: true,
        status: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { contacts: true, deals: true } }
      },
      orderBy: [{ createdAt: "desc" }]
    });
    return NextResponse.json({ data: accounts });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "No se pudieron obtener cuentas";
    return NextResponse.json({ error: "No se pudieron obtener cuentas", detail: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const { name, nit, address, sector, size, creditTerm, status, ownerId, createdById } = normalize(body, true);
    const profile = await linkOrCreateClientProfile({
      type: ClientProfileType.COMPANY,
      companyName: name!,
      nit: nit || null,
      email: body.email || null,
      phone: body.phone || null
    });
    const saved = await prisma.crmAccount.create({
      data: {
        name: name!,
        clientId: profile.id,
        nit: nit || null,
        address: address || null,
        sector: sector || null,
        creditTerm: creditTerm || null,
        status: status || "ACTIVE",
        ownerId: ownerId || auth.role || "Ventas",
        createdById: createdById || auth.role || "Ventas"
      }
    });
    return NextResponse.json({ data: saved, client: profile });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear la cuenta" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureCrmAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const id = body.id ? String(body.id) : "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const { name, nit, address, sector, size, creditTerm, status, ownerId, createdById } = normalize(body, false);

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (nit !== undefined) data.nit = nit;
    if (address !== undefined) data.address = address;
    if (sector !== undefined) data.sector = sector;
    if (creditTerm !== undefined) data.creditTerm = creditTerm;
    if (status !== undefined) data.status = status;
    if (ownerId !== undefined) data.ownerId = ownerId;
    if (createdById !== undefined) data.createdById = createdById;
    if (!Object.keys(data).length) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

    const saved = await prisma.crmAccount.update({ where: { id }, data });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo actualizar la cuenta" }, { status: 400 });
  }
}
