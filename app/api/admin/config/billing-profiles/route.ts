import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import {
  billingProfileCreateSchema,
  conflict409,
  isCentralConfigCompatError,
  requireConfigCentralCapability,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BillingProfileRow = {
  id: string;
  tenantId: string | null;
  branchId: string;
  legalEntityId: string;
  establishmentId: string | null;
  priority: number;
  isActive: boolean;
  rulesJson: unknown;
  createdAt: Date;
  updatedAt: Date;
  branch: { id: string; name: string; code: string | null; isActive: boolean };
  legalEntity: { id: string; name: string; comercialName: string | null; nit: string | null; isActive: boolean };
  establishment: {
    id: string;
    satEstablishmentCode: string;
    legalName: string;
    tradeName: string | null;
    isActive: boolean;
  } | null;
};

function getBranchBillingDelegate() {
  return (prisma as unknown as {
    branchBillingProfile?: {
      findMany?: (args: unknown) => Promise<BillingProfileRow[]>;
      findFirst?: (args: unknown) => Promise<{ id: string } | null>;
      create?: (args: unknown) => Promise<BillingProfileRow>;
    };
  }).branchBillingProfile;
}

function dbNotReadyResponse() {
  return service503("DB_NOT_READY", "Perfiles fiscales no disponibles. Ejecuta migraciones y prisma generate.");
}

function serializeRow(row: BillingProfileRow) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    branchId: row.branchId,
    legalEntityId: row.legalEntityId,
    establishmentId: row.establishmentId,
    priority: row.priority,
    isActive: row.isActive,
    rulesJson: row.rulesJson ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    branch: row.branch,
    legalEntity: {
      id: row.legalEntity.id,
      legalName: row.legalEntity.name,
      tradeName: row.legalEntity.comercialName,
      nit: row.legalEntity.nit,
      isActive: row.legalEntity.isActive
    },
    establishment: row.establishment
      ? {
          id: row.establishment.id,
          satEstablishmentCode: row.establishment.satEstablishmentCode,
          legalName: row.establishment.legalName,
          tradeName: row.establishment.tradeName,
          isActive: row.establishment.isActive
        }
      : null
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_SAT_READ");
  if (auth.response) return auth.response;
  const tenantId = auth.user?.tenantId || "global";

  const delegate = getBranchBillingDelegate();
  if (!delegate?.findMany) {
    warnDevCentralCompat("config.billingProfiles.list", new Error("Prisma delegate missing: branchBillingProfile"));
    return dbNotReadyResponse();
  }

  const branchId = req.nextUrl.searchParams.get("branchId")?.trim() || null;
  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "1";

  try {
    const rows = await delegate.findMany({
      where: {
        tenantId,
        ...(branchId ? { branchId } : {}),
        ...(includeInactive ? {} : { isActive: true })
      },
      orderBy: [{ isActive: "desc" }, { priority: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        legalEntityId: true,
        establishmentId: true,
        priority: true,
        isActive: true,
        rulesJson: true,
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
        },
        establishment: {
          select: {
            id: true,
            satEstablishmentCode: true,
            legalName: true,
            tradeName: true,
            isActive: true
          }
        }
      }
    });

    return NextResponse.json({ ok: true, data: rows.map(serializeRow) });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.billingProfiles.list", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudieron listar perfiles fiscales.";
    return server500(message);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireConfigCentralCapability(req, "CONFIG_SAT_WRITE");
  if (auth.response) return auth.response;
  const tenantId = auth.user?.tenantId || "global";

  const delegate = getBranchBillingDelegate();
  if (!delegate?.create || !delegate?.findFirst) {
    warnDevCentralCompat("config.billingProfiles.create", new Error("Prisma delegate missing: branchBillingProfile"));
    return dbNotReadyResponse();
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = billingProfileCreateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return validation422(
        "Datos inválidos para perfil fiscal.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    const [branch, legalEntity] = await Promise.all([
      prisma.branch.findUnique({
        where: { id: parsed.data.branchId },
        select: { id: true, isActive: true, tenantId: true }
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

    const establishmentId = parsed.data.establishmentId?.trim() || null;
    if (establishmentId) {
      const establishment = await prisma.branchSatEstablishment.findUnique({
        where: { id: establishmentId },
        select: {
          id: true,
          branchId: true,
          legalEntityId: true,
          isActive: true
        }
      });

      if (!establishment || establishment.branchId !== branch.id) {
        return validation422("El establecimiento SAT no pertenece a la sucursal seleccionada.", [
          { path: "establishmentId", message: "Selecciona un establecimiento válido para esta sucursal." }
        ]);
      }

      if (establishment.legalEntityId && establishment.legalEntityId !== legalEntity.id) {
        return validation422("La entidad legal no coincide con el establecimiento seleccionado.", [
          { path: "legalEntityId", message: "Debe coincidir con la entidad del establecimiento SAT." }
        ]);
      }

      if (parsed.data.isActive && !establishment.isActive) {
        return validation422("No puedes activar un perfil con establecimiento SAT inactivo.", [
          { path: "isActive", message: "Activa el establecimiento o guarda el perfil como inactivo." }
        ]);
      }
    }

    if (parsed.data.isActive && !branch.isActive) {
      return validation422("No puedes activar un perfil fiscal en una sucursal inactiva.", [
        { path: "isActive", message: "Activa la sucursal o guarda el perfil inactivo." }
      ]);
    }

    const duplicated = await delegate.findFirst({
      where: {
        tenantId,
        branchId: branch.id,
        legalEntityId: legalEntity.id,
        establishmentId
      },
      select: { id: true }
    });

    if (duplicated) {
      return conflict409("Ya existe un perfil fiscal para esta combinación de sucursal, entidad y establecimiento.");
    }

    const created = await delegate.create({
      data: {
        tenantId,
        branchId: branch.id,
        legalEntityId: legalEntity.id,
        establishmentId,
        priority: parsed.data.priority,
        isActive: parsed.data.isActive,
        rulesJson: parsed.data.rulesJson ?? null
      },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        legalEntityId: true,
        establishmentId: true,
        priority: true,
        isActive: true,
        rulesJson: true,
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
        },
        establishment: {
          select: {
            id: true,
            satEstablishmentCode: true,
            legalName: true,
            tradeName: true,
            isActive: true
          }
        }
      }
    });

    await auditLog({
      action: "BILLING_PROFILE_CREATED",
      entityType: "BranchBillingProfile",
      entityId: created.id,
      user: auth.user,
      req,
      after: created,
      metadata: {
        branchId: created.branchId,
        legalEntityId: created.legalEntityId,
        establishmentId: created.establishmentId
      }
    });

    return NextResponse.json({ ok: true, data: serializeRow(created) }, { status: 201 });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.billingProfiles.create", error);
      return dbNotReadyResponse();
    }

    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      return conflict409("Perfil fiscal duplicado.");
    }

    const message = error instanceof Error ? error.message : "No se pudo crear el perfil fiscal.";
    return server500(message);
  }
}
