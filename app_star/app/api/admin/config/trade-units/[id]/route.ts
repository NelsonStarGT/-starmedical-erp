import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import {
  isCentralConfigCompatError,
  notFound404,
  requireConfigCentralCapability,
  server500,
  service503,
  tradeUnitUpdateSchema,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TradeUnitBefore = {
  id: string;
  tenantId: string | null;
  name: string;
  registrationNumber: string | null;
  address: string | null;
  branchId: string;
  legalEntityId: string;
  pdfAssetId: string | null;
  isActive: boolean;
};

type TradeUnitRow = TradeUnitBefore & {
  createdAt: Date;
  updatedAt: Date;
};

function getTradeUnitDelegate() {
  return (prisma as unknown as {
    tradeUnit?: {
      findUnique?: (args: unknown) => Promise<TradeUnitBefore | null>;
      update?: (args: unknown) => Promise<TradeUnitRow>;
      delete?: (args: unknown) => Promise<{ id: string }>;
    };
  }).tradeUnit;
}

function dbNotReadyResponse() {
  return service503("DB_NOT_READY", "Unidades comerciales no disponibles. Ejecuta migraciones y prisma generate.");
}

async function resolveParams(params: { id: string } | Promise<{ id: string }>): Promise<{ id: string }> {
  if ("then" in params) return params;
  return params;
}

function toUiTradeUnit(row: TradeUnitRow) {
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
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = requireConfigCentralCapability(req, "CONFIG_SAT_WRITE");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);
  const delegate = getTradeUnitDelegate();
  if (!delegate?.findUnique || !delegate?.update) {
    warnDevCentralCompat("config.tradeUnits.update", new Error("Prisma delegate missing: tradeUnit"));
    return dbNotReadyResponse();
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = tradeUnitUpdateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return validation422(
        "Datos inválidos para unidad comercial.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    const before = await delegate.findUnique({
      where: { id: resolved.id },
      select: {
        id: true,
        tenantId: true,
        name: true,
        registrationNumber: true,
        address: true,
        branchId: true,
        legalEntityId: true,
        pdfAssetId: true,
        isActive: true
      }
    });

    if (!before) {
      return notFound404("Unidad comercial no encontrada.");
    }

    const nextBranchId = parsed.data.branchId ?? before.branchId;
    const nextLegalEntityId = parsed.data.legalEntityId ?? before.legalEntityId;
    const nextPdfAssetId =
      typeof parsed.data.pdfAssetId === "undefined"
        ? before.pdfAssetId
        : parsed.data.pdfAssetId?.trim() || null;
    const nextIsActive = typeof parsed.data.isActive === "boolean" ? parsed.data.isActive : before.isActive;

    const [branch, legalEntity] = await Promise.all([
      prisma.branch.findUnique({
        where: { id: nextBranchId },
        select: { id: true, isActive: true, tenantId: true }
      }),
      prisma.legalEntity.findUnique({
        where: { id: nextLegalEntityId },
        select: { id: true, isActive: true }
      })
    ]);

    if (!branch) {
      return validation422("Sucursal no encontrada.", [{ path: "branchId", message: "Selecciona una sucursal válida." }]);
    }

    if (!legalEntity || !legalEntity.isActive) {
      return validation422("Entidad legal no encontrada o inactiva.", [
        { path: "legalEntityId", message: "Selecciona una entidad legal activa." }
      ]);
    }

    if (nextIsActive && !branch.isActive) {
      return validation422("No puedes activar una unidad comercial en una sucursal inactiva.", [
        { path: "isActive", message: "Activa la sucursal o desactiva esta unidad." }
      ]);
    }

    if (nextPdfAssetId) {
      const asset = await prisma.fileAsset.findUnique({
        where: { id: nextPdfAssetId },
        select: { id: true }
      });
      if (!asset) {
        return validation422("Archivo de respaldo no encontrado.", [
          { path: "pdfAssetId", message: "Selecciona un archivo válido." }
        ]);
      }
    }

    const updated = await delegate.update({
      where: { id: resolved.id },
      data: {
        tenantId: branch.tenantId ?? before.tenantId ?? auth.user?.tenantId ?? "global",
        name: parsed.data.name,
        registrationNumber:
          typeof parsed.data.registrationNumber === "undefined" ? undefined : parsed.data.registrationNumber,
        address: typeof parsed.data.address === "undefined" ? undefined : parsed.data.address,
        branchId: nextBranchId,
        legalEntityId: nextLegalEntityId,
        pdfAssetId: nextPdfAssetId,
        isActive: nextIsActive
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
        updatedAt: true
      }
    });

    await auditLog({
      action: "TRADE_UNIT_UPDATED",
      entityType: "TradeUnit",
      entityId: updated.id,
      user: auth.user,
      req,
      before,
      after: updated
    });

    return NextResponse.json({ ok: true, data: toUiTradeUnit(updated) });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.tradeUnits.update", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo actualizar la unidad comercial.";
    return server500(message);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = requireConfigCentralCapability(req, "CONFIG_SAT_WRITE");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);
  const delegate = getTradeUnitDelegate();
  if (!delegate?.findUnique || !delegate?.update) {
    warnDevCentralCompat("config.tradeUnits.toggle", new Error("Prisma delegate missing: tradeUnit"));
    return dbNotReadyResponse();
  }

  try {
    const before = await delegate.findUnique({
      where: { id: resolved.id },
      select: {
        id: true,
        tenantId: true,
        name: true,
        registrationNumber: true,
        address: true,
        branchId: true,
        legalEntityId: true,
        pdfAssetId: true,
        isActive: true
      }
    });

    if (!before) {
      return notFound404("Unidad comercial no encontrada.");
    }

    const body = await req.json().catch(() => null);
    const explicitState = body && typeof body === "object" && "isActive" in body ? Boolean((body as { isActive?: unknown }).isActive) : null;
    const nextState = explicitState === null ? !before.isActive : explicitState;

    if (nextState) {
      const branch = await prisma.branch.findUnique({
        where: { id: before.branchId },
        select: { id: true, isActive: true }
      });
      if (!branch?.isActive) {
        return validation422("No puedes activar una unidad comercial en una sucursal inactiva.", [
          { path: "isActive", message: "Activa la sucursal antes de activar la unidad comercial." }
        ]);
      }
    }

    const updated = await delegate.update({
      where: { id: before.id },
      data: {
        isActive: nextState
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
        updatedAt: true
      }
    });

    await auditLog({
      action: nextState ? "TRADE_UNIT_ACTIVATED" : "TRADE_UNIT_DEACTIVATED",
      entityType: "TradeUnit",
      entityId: updated.id,
      user: auth.user,
      req,
      before,
      after: updated
    });

    return NextResponse.json({ ok: true, data: toUiTradeUnit(updated) });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.tradeUnits.toggle", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo cambiar estado de la unidad comercial.";
    return server500(message);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = requireConfigCentralCapability(req, "CONFIG_SAT_WRITE");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);
  const delegate = getTradeUnitDelegate();
  if (!delegate?.findUnique || !delegate?.delete) {
    warnDevCentralCompat("config.tradeUnits.delete", new Error("Prisma delegate missing: tradeUnit"));
    return dbNotReadyResponse();
  }

  try {
    const before = await delegate.findUnique({
      where: { id: resolved.id },
      select: {
        id: true,
        tenantId: true,
        name: true,
        registrationNumber: true,
        address: true,
        branchId: true,
        legalEntityId: true,
        pdfAssetId: true,
        isActive: true
      }
    });

    if (!before) {
      return notFound404("Unidad comercial no encontrada.");
    }

    await delegate.delete({ where: { id: before.id } });

    await auditLog({
      action: "TRADE_UNIT_DELETED",
      entityType: "TradeUnit",
      entityId: before.id,
      user: auth.user,
      req,
      before
    });

    return NextResponse.json({ ok: true, data: { id: before.id } });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.tradeUnits.delete", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo eliminar la unidad comercial.";
    return server500(message);
  }
}
