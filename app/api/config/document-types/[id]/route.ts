import { ClientCatalogType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveParams(
  params: { id: string } | Promise<{ id: string }>
): Promise<{ id: string }> {
  if ("then" in params) return params;
  return params;
}

function hasReadAccess(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth;
  if (!isAdmin(auth.user)) {
    return {
      user: auth.user,
      errorResponse: NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 })
    };
  }
  return auth;
}

function hasManageAccess(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth;
  if (!isAdmin(auth.user)) {
    return {
      user: auth.user,
      errorResponse: NextResponse.json({ ok: false, error: "No tienes permisos para realizar esta acción." }, { status: 403 })
    };
  }
  return auth;
}

async function findDocumentType(id: string) {
  return prisma.clientCatalogItem.findFirst({
    where: { id, type: ClientCatalogType.DOCUMENT_TYPE },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          clientIdentifiersByDocumentType: true,
          requiredDocumentRules: true,
          clientDocuments: true
        }
      }
    }
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = hasReadAccess(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await resolveParams(params);
  const row = await findDocumentType(id);
  if (!row) {
    return NextResponse.json({ ok: false, error: "Tipo de documento no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: row });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = hasManageAccess(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await resolveParams(params);
    const existing = await prisma.clientCatalogItem.findFirst({
      where: { id, type: ClientCatalogType.DOCUMENT_TYPE },
      select: { id: true }
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Tipo de documento no encontrado." }, { status: 404 });
    }

    const body = (await req.json()) as {
      name?: string;
      description?: string | null;
      isActive?: boolean;
    };

    const name = body.name?.trim();

    const updated = await prisma.clientCatalogItem.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
        ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {})
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: false, error: "El tipo de documento ya existe." }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "No se pudo actualizar el tipo de documento.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = hasManageAccess(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await resolveParams(params);
  const existing = await prisma.clientCatalogItem.findFirst({
    where: { id, type: ClientCatalogType.DOCUMENT_TYPE },
    select: { id: true }
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "Tipo de documento no encontrado." }, { status: 404 });
  }

  await prisma.clientCatalogItem.update({
    where: { id },
    data: { isActive: false }
  });

  return NextResponse.json({ ok: true });
}
