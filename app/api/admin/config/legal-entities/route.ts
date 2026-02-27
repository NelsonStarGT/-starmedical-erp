import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auditLog } from "@/lib/audit";
import {
  conflict409,
  isCentralConfigCompatError,
  legalEntityCreateSchema,
  requireConfigCentralCapability,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { prisma } from "@/lib/prisma";
import { isAdmin, isOwner } from "@/lib/rbac";
import { normalizeTenantId } from "@/lib/tenant";
import { enforceRateLimit } from "@/lib/api/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function canManageLegalEntities(user: Awaited<ReturnType<typeof requireConfigCentralCapability>>["user"]) {
  if (!user) return false;
  return isAdmin(user) || isOwner(user);
}

function toUiEntity(row: {
  id: string;
  tenantId: string | null;
  name: string;
  comercialName: string | null;
  nit: string | null;
  fiscalAddress: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    satEstablishments?: number;
    branchBillingProfiles?: number;
    tradeUnits?: number;
  };
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    legalName: row.name,
    tradeName: row.comercialName,
    nit: row.nit,
    address: row.fiscalAddress,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    counts: {
      satEstablishments: row._count?.satEstablishments ?? 0,
      billingProfiles: row._count?.branchBillingProfiles ?? 0,
      tradeUnits: row._count?.tradeUnits ?? 0
    }
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_SAT_READ");
  if (auth.response) return auth.response;

  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "1";
  const tenantId = normalizeTenantId(auth.user?.tenantId);

  try {
    const rows = await prisma.legalEntity.findMany({
      where: {
        tenantId,
        ...(includeInactive ? {} : { isActive: true })
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        tenantId: true,
        name: true,
        comercialName: true,
        nit: true,
        fiscalAddress: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            satEstablishments: true,
            branchBillingProfiles: true,
            tradeUnits: true
          }
        }
      }
    });

    return NextResponse.json({ ok: true, data: rows.map(toUiEntity) });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.legalEntities.list", error);
      return service503("DB_NOT_READY", "Entidades legales no disponibles. Ejecuta migraciones y prisma generate.");
    }

    const message = error instanceof Error ? error.message : "No se pudieron listar entidades legales.";
    return server500(message);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_SAT_WRITE");
  if (auth.response) return auth.response;
  if (!canManageLegalEntities(auth.user)) {
    return NextResponse.json(
      { ok: false, code: "FORBIDDEN", error: "Solo roles owner/admin pueden gestionar patentes." },
      { status: 403 }
    );
  }

  const tenantId = normalizeTenantId(auth.user?.tenantId);

  try {
    enforceRateLimit(req, { limit: 25, windowMs: 60_000 });
    const body = await req.json().catch(() => null);
    const parsed = legalEntityCreateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return validation422(
        "Datos inválidos para entidad legal.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    const duplicateFilters: Prisma.LegalEntityWhereInput[] = [
      { name: { equals: parsed.data.legalName, mode: "insensitive" } }
    ];
    if (parsed.data.nit) {
      duplicateFilters.push({ nit: { equals: parsed.data.nit, mode: "insensitive" } });
    }

    const duplicated = await prisma.legalEntity.findFirst({
      where: {
        tenantId,
        OR: duplicateFilters
      },
      select: {
        id: true,
        name: true,
        nit: true
      }
    });

    if (duplicated) {
      return conflict409("Entidad legal duplicada dentro del tenant (NIT o razón social).", {
        resource: "LegalEntity",
        duplicatedField:
          parsed.data.nit && duplicated.nit && duplicated.nit.toUpperCase() === parsed.data.nit.toUpperCase()
            ? "nit"
            : "legalName"
      });
    }

    const created = await prisma.legalEntity.create({
      data: {
        tenantId,
        name: parsed.data.legalName,
        comercialName: parsed.data.tradeName,
        nit: parsed.data.nit,
        fiscalAddress: parsed.data.address,
        isActive: parsed.data.isActive
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        comercialName: true,
        nit: true,
        fiscalAddress: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await auditLog({
      action: "LEGAL_ENTITY_CREATED",
      entityType: "LegalEntity",
      entityId: created.id,
      user: auth.user,
      req,
      after: created
    });

    return NextResponse.json({ ok: true, data: toUiEntity(created) }, { status: 201 });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status?: unknown }).status === 429
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "RATE_LIMIT",
          error: "Demasiadas solicitudes. Espera un momento para reintentar."
        },
        { status: 429 }
      );
    }

    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.legalEntities.create", error);
      return service503("DB_NOT_READY", "Entidades legales no disponibles. Ejecuta migraciones y prisma generate.");
    }

    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      return conflict409("Entidad legal duplicada (NIT o nombre).", {
        resource: "LegalEntity"
      });
    }

    const message = error instanceof Error ? error.message : "No se pudo crear la entidad legal.";
    return server500(message);
  }
}
