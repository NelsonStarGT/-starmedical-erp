import { NextRequest, NextResponse } from "next/server";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toUiEntity(row: {
  id: string;
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
    tenantId: null,
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
  const auth = requireConfigCentralCapability(req, "CONFIG_SAT_READ");
  if (auth.response) return auth.response;

  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "1";

  try {
    const rows = await prisma.legalEntity.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
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
  const auth = requireConfigCentralCapability(req, "CONFIG_SAT_WRITE");
  if (auth.response) return auth.response;

  try {
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

    const created = await prisma.legalEntity.create({
      data: {
        name: parsed.data.legalName,
        comercialName: parsed.data.tradeName,
        nit: parsed.data.nit,
        fiscalAddress: parsed.data.address,
        isActive: parsed.data.isActive
      },
      select: {
        id: true,
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
