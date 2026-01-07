import { NextRequest, NextResponse } from "next/server";
import { PartyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureFinanceAccess } from "@/lib/api/finance";

export const dynamic = "force-dynamic";

const TYPES = Object.values(PartyType);

function normalize(body: any, requireAll = true) {
  const type = body.type !== undefined ? String(body.type || "").toUpperCase() : undefined;
  const name = body.name !== undefined ? String(body.name || "").trim() : undefined;
  const nit = body.nit !== undefined ? String(body.nit || "").trim() : undefined;
  const email = body.email !== undefined ? String(body.email || "").trim() : undefined;
  const phone = body.phone !== undefined ? String(body.phone || "").trim() : undefined;
  const address = body.address !== undefined ? String(body.address || "").trim() : undefined;
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : undefined;

  if (requireAll) {
    if (!type || !TYPES.includes(type as PartyType)) throw new Error("type inválido");
    if (!name) throw new Error("name requerido");
  } else if (type && !TYPES.includes(type as PartyType)) {
    throw new Error("type inválido");
  }

  return { type: type as PartyType | undefined, name, nit, email, phone, address, isActive };
}

export async function GET(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const type = req.nextUrl.searchParams.get("type");
    const where = type && TYPES.includes(type as PartyType) ? { type: type as PartyType } : undefined;
    const parties = await prisma.party.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { name: "asc" }]
    });
    return NextResponse.json({ data: parties });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener los terceros" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const { type, name, nit, email, phone, address, isActive } = normalize(body, true);
    const saved = await prisma.party.create({
      data: {
        type: type!,
        name: name!,
        nit: nit || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        isActive: isActive ?? true
      }
    });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear el tercero" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const id = body.id ? String(body.id) : "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const { type, name, nit, email, phone, address, isActive } = normalize(body, false);

    const data: any = {};
    if (type !== undefined) data.type = type;
    if (name !== undefined) data.name = name;
    if (nit !== undefined) data.nit = nit;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (address !== undefined) data.address = address;
    if (isActive !== undefined) data.isActive = isActive;
    if (!Object.keys(data).length) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

    const saved = await prisma.party.update({ where: { id }, data });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") return NextResponse.json({ error: "Tercero no encontrado" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo actualizar el tercero" }, { status: 400 });
  }
}
