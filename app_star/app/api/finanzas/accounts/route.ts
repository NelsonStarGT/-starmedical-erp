import { NextRequest, NextResponse } from "next/server";
import { AccountType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureFinanceAccess } from "@/lib/api/finance";
import { serializeAccount } from "../_utils";

export const dynamic = "force-dynamic";

const ACCOUNT_TYPES = Object.values(AccountType);

function normalizeAccount(body: any, requireAll = true) {
  const code = body.code !== undefined ? String(body.code || "").trim() : undefined;
  const name = body.name !== undefined ? String(body.name || "").trim() : undefined;
  const type = body.type !== undefined ? String(body.type || "").toUpperCase() : undefined;
  const parentId = body.parentId !== undefined ? String(body.parentId || "") || null : undefined;
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : undefined;

  if (requireAll) {
    if (!code) throw new Error("code requerido");
    if (!name) throw new Error("name requerido");
    if (!type || !ACCOUNT_TYPES.includes(type as AccountType)) throw new Error("type inválido");
  } else if (type && !ACCOUNT_TYPES.includes(type as AccountType)) {
    throw new Error("type inválido");
  }

  return { code, name, type: type as AccountType | undefined, parentId, isActive };
}

export async function GET(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const accounts = await prisma.account.findMany({
      orderBy: [{ code: "asc" }]
    });
    return NextResponse.json({ data: accounts.map(serializeAccount) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo obtener el catálogo" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const data = normalizeAccount(body, true);

    if (data.parentId) {
      const parent = await prisma.account.findUnique({ where: { id: data.parentId } });
      if (!parent) return NextResponse.json({ error: "parentId inválido" }, { status: 400 });
    }

    const saved = await prisma.account.create({
      data: {
        code: data.code!,
        name: data.name!,
        type: data.type!,
        parentId: data.parentId || null,
        isActive: data.isActive ?? true
      }
    });
    return NextResponse.json({ data: serializeAccount(saved) });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2002") {
      return NextResponse.json({ error: "El código ya existe" }, { status: 400 });
    }
    return NextResponse.json({ error: err?.message || "No se pudo crear la cuenta" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureFinanceAccess(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const { code, name, type, parentId, isActive } = normalizeAccount(body, false);
    const id = body.id ? String(body.id) : "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const updateData: Prisma.AccountUpdateInput = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (parentId !== undefined) {
      updateData.parent = parentId ? { connect: { id: parentId } } : { disconnect: true };
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    if (!Object.keys(updateData).length) {
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    }

    if (parentId) {
      const parent = await prisma.account.findUnique({ where: { id: parentId } });
      if (!parent) return NextResponse.json({ error: "parentId inválido" }, { status: 400 });
    }

    const saved = await prisma.account.update({
      where: { id },
      data: updateData
    });
    return NextResponse.json({ data: serializeAccount(saved) });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    if (err.code === "P2002") return NextResponse.json({ error: "El código ya existe" }, { status: 400 });
    return NextResponse.json({ error: err?.message || "No se pudo actualizar la cuenta" }, { status: 400 });
  }
}
