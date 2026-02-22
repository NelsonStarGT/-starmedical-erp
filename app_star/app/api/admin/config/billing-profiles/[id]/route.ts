import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/audit";
import {
  billingProfileUpdateSchema,
  conflict409,
  isCentralConfigCompatError,
  notFound404,
  requireConfigCentralCapability,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BillingProfileBefore = {
  id: string;
  tenantId: string | null;
  branchId: string;
  legalEntityId: string;
  establishmentId: string | null;
  priority: number;
  isActive: boolean;
  rulesJson: unknown;
};

type BillingProfileRow = BillingProfileBefore & {
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
      findUnique?: (args: unknown) => Promise<BillingProfileBefore | null>;
      findFirst?: (args: unknown) => Promise<{ id: string } | null>;
      update?: (args: unknown) => Promise<BillingProfileRow>;
      delete?: (args: unknown) => Promise<{ id: string }>;
    };
  }).branchBillingProfile;
}

function dbNotReadyResponse() {
  return service503("DB_NOT_READY", "Perfiles fiscales no disponibles. Ejecuta migraciones y prisma generate.");
}

async function resolveParams(params: { id: string } | Promise<{ id: string }>): Promise<{ id: string }> {
  if ("then" in params) return params;
  return params;
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

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = requireConfigCentralCapability(req, "CONFIG_SAT_WRITE");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);
  const delegate = getBranchBillingDelegate();
  if (!delegate?.findUnique || !delegate?.findFirst || !delegate?.update) {
    warnDevCentralCompat("config.billingProfiles.update", new Error("Prisma delegate missing: branchBillingProfile"));
    return dbNotReadyResponse();
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = billingProfileUpdateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return validation422(
        "Datos inválidos para perfil fiscal.",
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
        branchId: true,
        legalEntityId: true,
        establishmentId: true,
        priority: true,
        isActive: true,
        rulesJson: true
      }
    });

    if (!before) {
      return notFound404("Perfil fiscal no encontrado.");
    }

    const nextBranchId = parsed.data.branchId ?? before.branchId;
    const nextLegalEntityId = parsed.data.legalEntityId ?? before.legalEntityId;
    const nextEstablishmentId =
      typeof parsed.data.establishmentId === "undefined"
        ? before.establishmentId
        : parsed.data.establishmentId?.trim() || null;
    const nextPriority = typeof parsed.data.priority === "number" ? parsed.data.priority : before.priority;
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
      return validation422("No puedes activar un perfil fiscal en una sucursal inactiva.", [
        { path: "isActive", message: "Activa la sucursal o deja el perfil inactivo." }
      ]);
    }

    if (nextEstablishmentId) {
      const establishment = await prisma.branchSatEstablishment.findUnique({
        where: { id: nextEstablishmentId },
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

      if (nextIsActive && !establishment.isActive) {
        return validation422("No puedes activar un perfil con establecimiento SAT inactivo.", [
          { path: "isActive", message: "Activa el establecimiento o deja el perfil inactivo." }
        ]);
      }
    }

    const duplicated = await delegate.findFirst({
      where: {
        branchId: nextBranchId,
        legalEntityId: nextLegalEntityId,
        establishmentId: nextEstablishmentId,
        id: { not: before.id }
      },
      select: { id: true }
    });

    if (duplicated) {
      return conflict409("Ya existe otro perfil fiscal con la misma combinación.");
    }

    const updated = await delegate.update({
      where: { id: before.id },
      data: {
        tenantId: branch.tenantId ?? before.tenantId ?? auth.user?.tenantId ?? "global",
        branchId: nextBranchId,
        legalEntityId: nextLegalEntityId,
        establishmentId: nextEstablishmentId,
        priority: nextPriority,
        isActive: nextIsActive,
        rulesJson: typeof parsed.data.rulesJson === "undefined" ? undefined : parsed.data.rulesJson
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
      action: "BILLING_PROFILE_UPDATED",
      entityType: "BranchBillingProfile",
      entityId: updated.id,
      user: auth.user,
      req,
      before,
      after: updated
    });

    return NextResponse.json({ ok: true, data: serializeRow(updated) });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.billingProfiles.update", error);
      return dbNotReadyResponse();
    }

    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      return conflict409("Perfil fiscal duplicado.");
    }

    const message = error instanceof Error ? error.message : "No se pudo actualizar el perfil fiscal.";
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
  const delegate = getBranchBillingDelegate();
  if (!delegate?.findUnique || !delegate?.update) {
    warnDevCentralCompat("config.billingProfiles.toggle", new Error("Prisma delegate missing: branchBillingProfile"));
    return dbNotReadyResponse();
  }

  try {
    const before = await delegate.findUnique({
      where: { id: resolved.id },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        legalEntityId: true,
        establishmentId: true,
        priority: true,
        isActive: true,
        rulesJson: true
      }
    });

    if (!before) {
      return notFound404("Perfil fiscal no encontrado.");
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
        return validation422("No puedes activar un perfil fiscal en una sucursal inactiva.", [
          { path: "isActive", message: "Activa la sucursal primero." }
        ]);
      }
    }

    const updated = await delegate.update({
      where: { id: before.id },
      data: { isActive: nextState },
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
      action: nextState ? "BILLING_PROFILE_ACTIVATED" : "BILLING_PROFILE_DEACTIVATED",
      entityType: "BranchBillingProfile",
      entityId: updated.id,
      user: auth.user,
      req,
      before,
      after: updated
    });

    return NextResponse.json({ ok: true, data: serializeRow(updated) });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.billingProfiles.toggle", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo cambiar estado del perfil fiscal.";
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
  const delegate = getBranchBillingDelegate();
  if (!delegate?.findUnique || !delegate?.delete) {
    warnDevCentralCompat("config.billingProfiles.delete", new Error("Prisma delegate missing: branchBillingProfile"));
    return dbNotReadyResponse();
  }

  try {
    const before = await delegate.findUnique({
      where: { id: resolved.id },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        legalEntityId: true,
        establishmentId: true,
        priority: true,
        isActive: true,
        rulesJson: true
      }
    });

    if (!before) {
      return notFound404("Perfil fiscal no encontrado.");
    }

    await delegate.delete({ where: { id: before.id } });

    await auditLog({
      action: "BILLING_PROFILE_DELETED",
      entityType: "BranchBillingProfile",
      entityId: before.id,
      user: auth.user,
      req,
      before
    });

    return NextResponse.json({ ok: true, data: { id: before.id } });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.billingProfiles.delete", error);
      return dbNotReadyResponse();
    }

    const message = error instanceof Error ? error.message : "No se pudo eliminar el perfil fiscal.";
    return server500(message);
  }
}
