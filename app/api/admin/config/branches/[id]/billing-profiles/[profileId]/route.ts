import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import {
  branchBillingProfileUpdateSchema,
  isCentralConfigCompatError,
  notFound404,
  requireConfigCentralCapability,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveParams(
  params:
    | { id: string; profileId: string }
    | Promise<{ id: string; profileId: string }>
): Promise<{ id: string; profileId: string }> {
  if ("then" in params) return params;
  return params;
}

export async function PATCH(
  req: NextRequest,
  {
    params
  }:
    | { params: { id: string; profileId: string } }
    | { params: Promise<{ id: string; profileId: string }> }
) {
  const auth = requireConfigCentralCapability(req, "CONFIG_SAT_WRITE");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);

  try {
    const body = await req.json().catch(() => null);
    const parsed = branchBillingProfileUpdateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return validation422(
        "Datos inválidos para perfil fiscal.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    const prismaClient = prisma as unknown as {
      branchBillingProfile?: {
        findUnique: (args: unknown) => Promise<{
          id: string;
          tenantId: string | null;
          branchId: string;
          legalEntityId: string;
          establishmentId: string | null;
          isActive: boolean;
          priority: number;
          rulesJson: unknown;
        } | null>;
        update: (args: unknown) => Promise<{
          id: string;
          tenantId: string | null;
          branchId: string;
          legalEntityId: string;
          establishmentId: string | null;
          priority: number;
          isActive: boolean;
          rulesJson: unknown;
          updatedAt: Date;
        }>;
      };
    };

    if (!prismaClient.branchBillingProfile?.findUnique || !prismaClient.branchBillingProfile?.update) {
      return service503("DB_NOT_READY", "Perfiles fiscales no disponibles. Ejecuta migraciones y prisma generate.");
    }

    const before = await prismaClient.branchBillingProfile.findUnique({
      where: { id: resolved.profileId },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        legalEntityId: true,
        establishmentId: true,
        isActive: true,
        priority: true,
        rulesJson: true
      }
    });

    if (!before || before.branchId !== resolved.id) {
      return notFound404("Perfil fiscal no encontrado.");
    }

    const nextLegalEntityId = parsed.data.legalEntityId ?? before.legalEntityId;
    const nextEstablishmentId =
      typeof parsed.data.establishmentId === "undefined"
        ? before.establishmentId
        : parsed.data.establishmentId?.trim() || null;

    const legalEntity = await prisma.legalEntity.findUnique({
      where: { id: nextLegalEntityId },
      select: { id: true, isActive: true }
    });
    if (!legalEntity || !legalEntity.isActive) {
      return validation422("Entidad legal no encontrada o inactiva.", [
        { path: "legalEntityId", message: "Selecciona una entidad legal activa." }
      ]);
    }

    if (nextEstablishmentId) {
      const establishment = await prisma.branchSatEstablishment.findUnique({
        where: { id: nextEstablishmentId },
        select: {
          id: true,
          branchId: true,
          legalEntityId: true
        }
      });
      if (!establishment || establishment.branchId !== resolved.id) {
        return validation422("El establecimiento SAT no pertenece a esta sucursal.", [
          { path: "establishmentId", message: "Selecciona un establecimiento válido." }
        ]);
      }
      if (establishment.legalEntityId && establishment.legalEntityId !== legalEntity.id) {
        return validation422("La entidad legal no coincide con el establecimiento seleccionado.", [
          { path: "legalEntityId", message: "Debe coincidir con la entidad del establecimiento." }
        ]);
      }
    }

    const updated = await prismaClient.branchBillingProfile.update({
      where: { id: resolved.profileId },
      data: {
        legalEntityId: nextLegalEntityId,
        establishmentId: nextEstablishmentId,
        priority: parsed.data.priority,
        isActive: parsed.data.isActive,
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
        updatedAt: true
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

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.branches.billingProfiles.patch", error);
      return service503("DB_NOT_READY", "Perfiles fiscales no disponibles. Ejecuta migraciones y prisma generate.");
    }

    const message = error instanceof Error ? error.message : "No se pudo actualizar el perfil fiscal.";
    return server500(message);
  }
}
