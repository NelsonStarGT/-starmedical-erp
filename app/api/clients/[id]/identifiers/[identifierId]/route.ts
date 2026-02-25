import { ClientCatalogType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveParams(
  params: { id: string; identifierId: string } | Promise<{ id: string; identifierId: string }>
): Promise<{ id: string; identifierId: string }> {
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

async function getIdentifier(clientId: string, identifierId: string) {
  return prisma.clientIdentifier.findFirst({
    where: { id: identifierId, clientId },
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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; identifierId: string } } | { params: Promise<{ id: string; identifierId: string }> }
) {
  const auth = hasReadAccess(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id: clientId, identifierId } = await resolveParams(params);
  const row = await getIdentifier(clientId, identifierId);

  if (!row) {
    return NextResponse.json({ ok: false, error: "Identificador no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: row });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; identifierId: string } } | { params: Promise<{ id: string; identifierId: string }> }
) {
  const auth = hasManageAccess(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id: clientId, identifierId } = await resolveParams(params);
    const existing = await prisma.clientIdentifier.findFirst({
      where: { id: identifierId, clientId },
      select: {
        id: true,
        clientId: true,
        countryId: true,
        documentTypeId: true,
        value: true,
        valueNormalized: true,
        isPrimary: true,
        isActive: true
      }
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Identificador no encontrado." }, { status: 404 });
    }

    const body = (await req.json()) as {
      countryId?: string | null;
      documentTypeId?: string | null;
      value?: string;
      isPrimary?: boolean;
      isActive?: boolean;
    };

    const nextCountryId = body.countryId !== undefined ? body.countryId?.trim() || null : existing.countryId;
    const nextDocumentTypeId =
      body.documentTypeId !== undefined ? body.documentTypeId?.trim() || null : existing.documentTypeId;
    const nextValue = body.value !== undefined ? body.value.trim() : existing.value;
    const nextValueNormalized = normalizeIdentifierValue(nextValue);

    if (!nextValueNormalized) {
      return NextResponse.json({ ok: false, error: "Formato inválido: ingresa un documento válido." }, { status: 422 });
    }

    const nextIsActive = body.isActive ?? existing.isActive;
    const nextIsPrimary = nextIsActive ? body.isPrimary ?? existing.isPrimary : false;

    if (nextCountryId) {
      const country = await prisma.geoCountry.findUnique({ where: { id: nextCountryId }, select: { id: true } });
      if (!country) {
        return NextResponse.json({ ok: false, error: "País inválido." }, { status: 422 });
      }
    }

    if (nextDocumentTypeId) {
      const documentType = await prisma.clientCatalogItem.findFirst({
        where: { id: nextDocumentTypeId, type: ClientCatalogType.DOCUMENT_TYPE, isActive: true },
        select: { id: true }
      });
      if (!documentType) {
        return NextResponse.json({ ok: false, error: "Tipo de documento inválido o inactivo." }, { status: 422 });
      }
    }

    const duplicate = await prisma.clientIdentifier.findFirst({
      where: {
        clientId,
        id: { not: identifierId },
        documentTypeId: nextDocumentTypeId,
        valueNormalized: nextValueNormalized,
        isActive: true
      },
      select: { id: true }
    });
    if (duplicate) {
      return NextResponse.json({ ok: false, error: "Documento duplicado para este cliente." }, { status: 409 });
    }

    const payload = await prisma.$transaction(async (tx) => {
      const updated = await tx.clientIdentifier.update({
        where: { id: identifierId },
        data: {
          countryId: nextCountryId,
          documentTypeId: nextDocumentTypeId,
          value: nextValue,
          valueNormalized: nextValueNormalized,
          isActive: nextIsActive,
          isPrimary: nextIsPrimary
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

      if (updated.isPrimary) {
        await tx.clientIdentifier.updateMany({
          where: { clientId, id: { not: updated.id } },
          data: { isPrimary: false }
        });
      }

      return tx.clientIdentifier.findFirst({
        where: { id: identifierId, clientId },
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
    });

    return NextResponse.json({ ok: true, data: payload });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Documento duplicado para este cliente." }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : "No se pudo actualizar el identificador.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; identifierId: string } } | { params: Promise<{ id: string; identifierId: string }> }
) {
  const auth = hasManageAccess(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id: clientId, identifierId } = await resolveParams(params);
  const existing = await prisma.clientIdentifier.findFirst({
    where: { id: identifierId, clientId },
    select: { id: true }
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "Identificador no encontrado." }, { status: 404 });
  }

  await prisma.clientIdentifier.update({
    where: { id: identifierId },
    data: { isActive: false, isPrimary: false }
  });

  return NextResponse.json({ ok: true });
}
