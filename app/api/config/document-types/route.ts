import { ClientCatalogType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  const auth = hasReadAccess(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "1";
    const q = searchParams.get("q")?.trim() ?? "";

    const rows = await prisma.clientCatalogItem.findMany({
      where: {
        type: ClientCatalogType.DOCUMENT_TYPE,
        ...(includeInactive ? {} : { isActive: true }),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {})
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            clientIdentifiersByDocumentType: true
          }
        }
      }
    });

    return NextResponse.json({ ok: true, data: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar tipos de documento.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = hasManageAccess(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = (await req.json()) as {
      name?: string;
      description?: string | null;
      isActive?: boolean;
    };

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "Nombre requerido." }, { status: 422 });
    }

    const created = await prisma.clientCatalogItem.create({
      data: {
        type: ClientCatalogType.DOCUMENT_TYPE,
        name,
        description: body.description?.trim() || null,
        isActive: body.isActive ?? true
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

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ ok: false, error: "El tipo de documento ya existe." }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : "No se pudo crear el tipo de documento.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
