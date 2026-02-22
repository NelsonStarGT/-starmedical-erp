import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureFinanceAccess } from "@/lib/api/finance";

export const dynamic = "force-dynamic";

function normalize(body: any, requireAll = true) {
  const name = body.name !== undefined ? String(body.name || "").trim() : undefined;
  const comercialName = body.comercialName !== undefined ? String(body.comercialName || "").trim() : undefined;
  const nit = body.nit !== undefined ? String(body.nit || "").trim() : undefined;
  const fiscalAddress = body.fiscalAddress !== undefined ? String(body.fiscalAddress || "").trim() : undefined;
  const phone = body.phone !== undefined ? String(body.phone || "").trim() : undefined;
  const email = body.email !== undefined ? String(body.email || "").trim() : undefined;
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : undefined;

  if (requireAll && !name) throw new Error("name requerido");
  return { name, comercialName, nit, fiscalAddress, phone, email, isActive };
}

export async function GET(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const entities = await prisma.legalEntity.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }]
    });
    return NextResponse.json({ data: entities });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener las empresas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const { name, comercialName, nit, fiscalAddress, phone, email, isActive } = normalize(body, true);
    const saved = await prisma.legalEntity.create({
      data: {
        name: name!,
        comercialName: comercialName || null,
        nit: nit || null,
        fiscalAddress: fiscalAddress || null,
        phone: phone || null,
        email: email || null,
        isActive: isActive ?? true
      }
    });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear la empresa" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const id = body.id ? String(body.id) : "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const { name, comercialName, nit, fiscalAddress, phone, email, isActive } = normalize(body, false);

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (comercialName !== undefined) data.comercialName = comercialName;
    if (nit !== undefined) data.nit = nit;
    if (fiscalAddress !== undefined) data.fiscalAddress = fiscalAddress;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (isActive !== undefined) data.isActive = isActive;

    if (!Object.keys(data).length) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

    const saved = await prisma.legalEntity.update({ where: { id }, data });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo actualizar la empresa" }, { status: 400 });
  }
}
