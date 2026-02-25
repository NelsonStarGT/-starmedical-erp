import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import {
  conflict409,
  isCentralConfigCompatError,
  requireConfigCentralCapability,
  server500,
  service503,
  tradeUnitCreateSchema,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TradeUnitRow = {
  id: string;
  tenantId: string | null;
  name: string;
  registrationNumber: string | null;
  address: string | null;
  branchId: string;
  legalEntityId: string;
  pdfAssetId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  branch: { id: string; name: string; code: string | null; isActive: boolean };
  legalEntity: { id: string; name: string; comercialName: string | null; nit: string | null; isActive: boolean };
};

function getTradeUnitDelegate() {
  return (prisma as unknown as {
    tradeUnit?: {
      findMany?: (args: unknown) => Promise<TradeUnitRow[]>;
      create?: (args: unknown) => Promise<TradeUnitRow>;
    };
  }).tradeUnit;
}

function serializeTradeUnit(row: TradeUnitRow) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    registrationNumber: row.registrationNumber,
    address: row.address,
    branchId: row.branchId,
    legalEntityId: row.legalEntityId,
    pdfAssetId: row.pdfAssetId,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    branch: row.branch,
    legalEntity: {
      id: row.legalEntity.id,
      legalName: row.legalEntity.name,
      tradeName: row.legalEntity.comercialName,
      nit: row.legalEntity.nit,
      isActive: row.legalEntity.isActive
    }
  };
}

function dbNotReadyResponse() {
  return service503("DB_NOT_READY", "Unidades comerciales no disponibles. Ejecuta migraciones y prisma generate.");
}

export async function GET(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_SAT_READ");
  if (auth.response) return auth.response;
  const tenantId = auth.user?.tenantId || "global";

  const delegate = getTradeUnitDelegate();
  if (!delegate?.findMany) {
    warnDevCentralCompat("config.tradeUnits.list", new Error("Prisma delegate missing: tradeUnit"));
    return dbNotReadyResponse();
  }

  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "1";
  const branchId = req.nextUrl.searchParams.get("branchId")?.trim() || null;

  try {
    const rows = await delegate.findMany({
      where: {
        tenantId,
        ...(includeInactive ? {} : { isActive: true }),
        ...(branchId ? { branchId } : {})
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        tenantId: true,
        name: true,
        registrationNumber: true,
        address: true,
        branchId: true,
        legalEntityId: true,
        pdfAssetId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true
          }
        },
        legalEntity: {
          select: {
            id: true,
            name: true,
            comercialName: true,
            nit: true,
            isActive: true
          }
        }
      }
    });

    return NextResponse.json({ ok: true, data: rows.map(serializeTradeUnit) });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.tradeUnits.list", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudieron listar unidades comerciales.";
    return server500(message);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_SAT_WRITE");
  if (auth.response) return auth.response;
  const tenantId = auth.user?.tenantId || "global";

  const delegate = getTradeUnitDelegate();
  if (!delegate?.create) {
    warnDevCentralCompat("config.tradeUnits.create", new Error("Prisma delegate missing: tradeUnit"));
    return dbNotReadyResponse();
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = tradeUnitCreateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return validation422(
        "Datos inválidos para unidad comercial.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    const [branch, legalEntity] = await Promise.all([
      prisma.branch.findUnique({
        where: { id: parsed.data.branchId },
        select: { id: true, name: true, isActive: true, tenantId: true }
      }),
      prisma.legalEntity.findUnique({
        where: { id: parsed.data.legalEntityId },
        select: { id: true, isActive: true, tenantId: true }
      })
    ]);

    if (!branch) {
      return validation422("Sucursal no encontrada.", [{ path: "branchId", message: "Selecciona una sucursal válida." }]);
    }
    if ((branch.tenantId || "global") !== tenantId) {
      return validation422("Sucursal fuera del tenant actual.", [
        { path: "branchId", message: "La sucursal no pertenece al tenant actual." }
      ]);
    }

    if (!legalEntity || !legalEntity.isActive || (legalEntity.tenantId || "global") !== tenantId) {
      return validation422("Entidad legal no encontrada o inactiva.", [
        { path: "legalEntityId", message: "Selecciona una entidad legal activa." }
      ]);
    }

    if (parsed.data.isActive && !branch.isActive) {
      return validation422("No puedes activar una unidad comercial en una sucursal inactiva.", [
        { path: "isActive", message: "Activa la sucursal o guarda la unidad en borrador." }
      ]);
    }

    const normalizedPdfAssetId = parsed.data.pdfAssetId?.trim() || null;
    if (normalizedPdfAssetId) {
      const asset = await prisma.fileAsset.findUnique({
        where: { id: normalizedPdfAssetId },
        select: { id: true }
      });
      if (!asset) {
        return validation422("Archivo de respaldo no encontrado.", [
          { path: "pdfAssetId", message: "Selecciona un archivo válido." }
        ]);
      }
    }

    const created = await delegate.create({
      data: {
        tenantId,
        name: parsed.data.name,
        registrationNumber: parsed.data.registrationNumber,
        address: parsed.data.address,
        branchId: branch.id,
        legalEntityId: legalEntity.id,
        pdfAssetId: normalizedPdfAssetId,
        isActive: parsed.data.isActive
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        registrationNumber: true,
        address: true,
        branchId: true,
        legalEntityId: true,
        pdfAssetId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true
          }
        },
        legalEntity: {
          select: {
            id: true,
            name: true,
            comercialName: true,
            nit: true,
            isActive: true
          }
        }
      }
    });

    await auditLog({
      action: "TRADE_UNIT_CREATED",
      entityType: "TradeUnit",
      entityId: created.id,
      user: auth.user,
      req,
      after: created
    });

    return NextResponse.json({ ok: true, data: serializeTradeUnit(created) }, { status: 201 });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.tradeUnits.create", error);
      return dbNotReadyResponse();
    }

    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      return conflict409("Ya existe una unidad comercial con ese nombre para la sucursal seleccionada.");
    }

    const message = error instanceof Error ? error.message : "No se pudo crear la unidad comercial.";
    return server500(message);
  }
}
