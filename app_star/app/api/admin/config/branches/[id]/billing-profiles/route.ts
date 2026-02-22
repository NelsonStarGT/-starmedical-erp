import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import {
  branchBillingProfileCreateSchema,
  conflict409,
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

async function resolveParams(params: { id: string } | Promise<{ id: string }>): Promise<{ id: string }> {
  if ("then" in params) return params;
  return params;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = requireConfigCentralCapability(req, "CONFIG_SAT_READ");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);

  try {
    const branch = await prisma.branch.findUnique({
      where: { id: resolved.id },
      select: { id: true, name: true, code: true, isActive: true }
    });

    if (!branch) {
      return notFound404("Sucursal no encontrada.");
    }

    const prismaClient = prisma as unknown as {
      branchBillingProfile?: {
        findMany: (args: unknown) => Promise<Array<{
          id: string;
          branchId: string;
          legalEntityId: string;
          establishmentId: string | null;
          priority: number;
          isActive: boolean;
          rulesJson: unknown;
          createdAt: Date;
          updatedAt: Date;
          legalEntity: { id: string; name: string; comercialName: string | null };
          establishment: {
            id: string;
            satEstablishmentCode: string;
            legalName: string;
            tradeName: string | null;
            isActive: boolean;
          } | null;
        }>>;
      };
    };

    if (!prismaClient.branchBillingProfile?.findMany) {
      return NextResponse.json({ ok: true, data: { branch, items: [] } });
    }

    const items = await prismaClient.branchBillingProfile.findMany({
      where: { branchId: resolved.id },
      orderBy: [{ isActive: "desc" }, { priority: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        branchId: true,
        legalEntityId: true,
        establishmentId: true,
        priority: true,
        isActive: true,
        rulesJson: true,
        createdAt: true,
        updatedAt: true,
        legalEntity: {
          select: {
            id: true,
            name: true,
            comercialName: true
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

    return NextResponse.json({ ok: true, data: { branch, items } });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.branches.billingProfiles.list", error);
      return service503("DB_NOT_READY", "Perfiles fiscales no disponibles. Ejecuta migraciones y prisma generate.");
    }

    const message = error instanceof Error ? error.message : "No se pudieron listar perfiles fiscales.";
    return server500(message);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const auth = requireConfigCentralCapability(req, "CONFIG_SAT_WRITE");
  if (auth.response) return auth.response;

  const resolved = await resolveParams(params);

  try {
    const body = await req.json().catch(() => null);
    const parsed = branchBillingProfileCreateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return validation422(
        "Datos inválidos para perfil fiscal.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    const branch = await prisma.branch.findUnique({
      where: { id: resolved.id },
      select: { id: true, isActive: true, tenantId: true }
    });
    if (!branch) {
      return notFound404("Sucursal no encontrada.");
    }

    const legalEntity = await prisma.legalEntity.findUnique({
      where: { id: parsed.data.legalEntityId },
      select: { id: true, isActive: true }
    });
    if (!legalEntity || !legalEntity.isActive) {
      return validation422("Entidad legal no encontrada o inactiva.", [
        { path: "legalEntityId", message: "Selecciona una entidad legal activa." }
      ]);
    }

    const requestedEstablishmentId = parsed.data.establishmentId?.trim() || null;
    let establishment: {
      id: string;
      branchId: string;
      isActive: boolean;
      legalEntityId: string | null;
    } | null = null;
    if (requestedEstablishmentId) {
      establishment = await prisma.branchSatEstablishment.findUnique({
        where: { id: requestedEstablishmentId },
        select: {
          id: true,
          branchId: true,
          isActive: true,
          legalEntityId: true
        }
      });

      if (!establishment || establishment.branchId !== resolved.id) {
        return validation422("El establecimiento SAT no pertenece a la sucursal seleccionada.", [
          { path: "establishmentId", message: "Selecciona un establecimiento de esta sucursal." }
        ]);
      }

      if (establishment.legalEntityId && establishment.legalEntityId !== legalEntity.id) {
        return validation422("La entidad legal no coincide con el establecimiento seleccionado.", [
          { path: "legalEntityId", message: "Debe coincidir con la entidad del establecimiento." }
        ]);
      }
    }

    const prismaClient = prisma as unknown as {
      branchBillingProfile?: {
        create: (args: unknown) => Promise<{
          id: string;
          branchId: string;
          legalEntityId: string;
          establishmentId: string | null;
          priority: number;
          isActive: boolean;
          rulesJson: unknown;
          createdAt: Date;
          updatedAt: Date;
        }>;
      };
    };

    if (!prismaClient.branchBillingProfile?.create) {
      return service503("DB_NOT_READY", "Perfiles fiscales no disponibles. Ejecuta migraciones y prisma generate.");
    }

    const created = await prismaClient.branchBillingProfile.create({
      data: {
        tenantId: branch.tenantId ?? auth.user?.tenantId ?? "global",
        branchId: resolved.id,
        legalEntityId: legalEntity.id,
        establishmentId: establishment?.id ?? null,
        priority: parsed.data.priority,
        isActive: parsed.data.isActive,
        rulesJson: parsed.data.rulesJson ?? null
      },
      select: {
        id: true,
        branchId: true,
        legalEntityId: true,
        establishmentId: true,
        priority: true,
        isActive: true,
        rulesJson: true,
        createdAt: true,
        updatedAt: true
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

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.branches.billingProfiles.create", error);
      return service503("DB_NOT_READY", "Perfiles fiscales no disponibles. Ejecuta migraciones y prisma generate.");
    }

    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      return conflict409("Perfil fiscal duplicado para la misma sucursal/entidad/establecimiento.");
    }

    const message = error instanceof Error ? error.message : "No se pudo crear el perfil fiscal.";
    return server500(message);
  }
}
