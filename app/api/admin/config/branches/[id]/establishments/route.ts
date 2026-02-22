import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import {
  branchSatEstablishmentCreateSchema,
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

async function resolveParams(
  params: { id: string } | Promise<{ id: string }>
): Promise<{ id: string }> {
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
    const [branch, rows] = await Promise.all([
      prisma.branch.findUnique({
        where: { id: resolved.id },
        select: { id: true, name: true, code: true, isActive: true }
      }),
      prisma.branchSatEstablishment.findMany({
        where: { branchId: resolved.id },
        orderBy: [{ isActive: "desc" }, { satEstablishmentCode: "asc" }],
        select: {
          id: true,
          branchId: true,
          satEstablishmentCode: true,
          legalName: true,
          tradeName: true,
          address: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { series: true }
          }
        }
      })
    ]);

    if (!branch) {
      return notFound404("Sucursal no encontrada.");
    }

    return NextResponse.json({
      ok: true,
      data: {
        branch,
        items: rows
      }
    });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.sat.establishments.list", error);
      return service503(
        "DB_NOT_READY",
        "Establecimientos SAT no disponibles. Ejecuta migraciones y prisma generate."
      );
    }

    const message = error instanceof Error ? error.message : "No se pudieron listar establecimientos SAT.";
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
    const parsed = branchSatEstablishmentCreateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return validation422(
        "Datos inválidos para establecimiento SAT.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    const branch = await prisma.branch.findUnique({
      where: { id: resolved.id },
      select: { id: true, name: true, isActive: true }
    });
    if (!branch) {
      return notFound404("Sucursal no encontrada.");
    }
    if (!branch.isActive) {
      return validation422("No puedes crear establecimientos SAT en una sucursal inactiva.");
    }

    const created = await prisma.branchSatEstablishment.create({
      data: {
        branchId: resolved.id,
        satEstablishmentCode: parsed.data.satEstablishmentCode,
        legalName: parsed.data.legalName,
        tradeName: parsed.data.tradeName,
        address: parsed.data.address,
        isActive: parsed.data.isActive
      },
      select: {
        id: true,
        branchId: true,
        satEstablishmentCode: true,
        legalName: true,
        tradeName: true,
        address: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await auditLog({
      action: "SAT_ESTABLISHMENT_CREATED",
      entityType: "BranchSatEstablishment",
      entityId: created.id,
      user: auth.user,
      req,
      after: created,
      metadata: {
        branchId: resolved.id,
        satEstablishmentCode: created.satEstablishmentCode
      }
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.sat.establishments.create", error);
      return service503(
        "DB_NOT_READY",
        "Establecimientos SAT no disponibles. Ejecuta migraciones y prisma generate."
      );
    }

    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      return conflict409("Código SAT duplicado.");
    }

    const message = error instanceof Error ? error.message : "No se pudo crear establecimiento SAT.";
    return server500(message);
  }
}
