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

function normalizeIdentifierValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
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

async function assertClientExists(clientId: string) {
  const row = await prisma.clientProfile.findFirst({
    where: { id: clientId, deletedAt: null },
    select: { id: true }
  });
  return Boolean(row);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = hasReadAccess(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id: clientId } = await resolveParams(params);
  if (!(await assertClientExists(clientId))) {
    return NextResponse.json({ ok: false, error: "Cliente no encontrado." }, { status: 404 });
  }

  const includeInactive = new URL(req.url).searchParams.get("includeInactive") === "1";

  const rows = await prisma.clientIdentifier.findMany({
    where: {
      clientId,
      ...(includeInactive ? {} : { isActive: true })
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      clientId: true,
      countryId: true,
      documentTypeId: true,
      value: true,
      valueNormalized: true,
      isPrimary: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      country: { select: { id: true, iso2: true, name: true } },
      documentType: { select: { id: true, name: true } }
    }
  });

  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = hasManageAccess(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id: clientId } = await resolveParams(params);
    if (!(await assertClientExists(clientId))) {
      return NextResponse.json({ ok: false, error: "Cliente no encontrado." }, { status: 404 });
    }

    const body = (await req.json()) as {
      countryId?: string | null;
      documentTypeId?: string | null;
      value?: string;
      isPrimary?: boolean;
      isActive?: boolean;
    };

    const rawValue = body.value?.trim();
    if (!rawValue) {
      return NextResponse.json({ ok: false, error: "Valor de documento requerido." }, { status: 422 });
    }

    const valueNormalized = normalizeIdentifierValue(rawValue);
    if (!valueNormalized) {
      return NextResponse.json({ ok: false, error: "Formato inválido: ingresa un documento válido." }, { status: 422 });
    }

    const countryId = body.countryId?.trim() || null;
    const documentTypeId = body.documentTypeId?.trim() || null;
    const isPrimary = Boolean(body.isPrimary);
    const isActive = body.isActive ?? true;

    if (countryId) {
      const country = await prisma.geoCountry.findUnique({ where: { id: countryId }, select: { id: true } });
      if (!country) {
        return NextResponse.json({ ok: false, error: "País inválido." }, { status: 422 });
      }
    }

    if (documentTypeId) {
      const documentType = await prisma.clientCatalogItem.findFirst({
        where: { id: documentTypeId, type: ClientCatalogType.DOCUMENT_TYPE, isActive: true },
        select: { id: true }
      });
      if (!documentType) {
        return NextResponse.json({ ok: false, error: "Tipo de documento inválido o inactivo." }, { status: 422 });
      }
    }

    const existing = await prisma.clientIdentifier.findFirst({
      where: {
        clientId,
        documentTypeId,
        valueNormalized
      },
      select: { id: true, isActive: true }
    });

    const payload = await prisma.$transaction(async (tx) => {
      if (existing?.isActive) {
        throw new Error("duplicate_active");
      }

      let identifier;
      if (existing && !existing.isActive) {
        identifier = await tx.clientIdentifier.update({
          where: { id: existing.id },
          data: {
            countryId,
            value: rawValue,
            valueNormalized,
            isActive,
            isPrimary
          },
          select: {
            id: true,
            clientId: true,
            countryId: true,
            documentTypeId: true,
            value: true,
            valueNormalized: true,
            isPrimary: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            country: { select: { id: true, iso2: true, name: true } },
            documentType: { select: { id: true, name: true } }
          }
        });
      } else {
        identifier = await tx.clientIdentifier.create({
          data: {
            clientId,
            countryId,
            documentTypeId,
            value: rawValue,
            valueNormalized,
            isPrimary,
            isActive
          },
          select: {
            id: true,
            clientId: true,
            countryId: true,
            documentTypeId: true,
            value: true,
            valueNormalized: true,
            isPrimary: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            country: { select: { id: true, iso2: true, name: true } },
            documentType: { select: { id: true, name: true } }
          }
        });
      }

      if (identifier.isPrimary) {
        await tx.clientIdentifier.updateMany({
          where: { clientId, id: { not: identifier.id } },
          data: { isPrimary: false }
        });
      }

      return identifier;
    });

    return NextResponse.json({ ok: true, data: payload }, { status: existing ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "duplicate_active") {
      return NextResponse.json({ ok: false, error: "Documento duplicado para este cliente." }, { status: 409 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Documento duplicado para este cliente." }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : "No se pudo guardar el identificador.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
