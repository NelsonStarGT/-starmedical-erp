import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import {
  branchCreateSchema,
  conflict409,
  isCentralConfigCompatError,
  requireConfigCentralCapability,
  server500,
  service503,
  validation422,
  warnDevCentralCompat
} from "@/lib/config-central";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_BRANCH_READ");
  if (auth.response) return auth.response;

  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "1";
  const tenantId = auth.user?.tenantId || "global";

  try {
    const branches = await prisma.branch.findMany({
      where: {
        tenantId,
        ...(includeInactive ? {} : { isActive: true })
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        timezone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            businessHours: true,
            satEstablishments: true
          }
        }
      }
    });

    return NextResponse.json({ ok: true, data: branches });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.branches.list", error);
      return service503(
        "DB_NOT_READY",
        "Configuración de sucursales no disponible. Ejecuta migraciones y prisma generate."
      );
    }

    const message = error instanceof Error ? error.message : "No se pudieron listar sucursales.";
    return server500(message);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireConfigCentralCapability(req, "CONFIG_BRANCH_WRITE");
  if (auth.response) return auth.response;
  const tenantId = auth.user?.tenantId || "global";

  try {
    const body = await req.json().catch(() => null);
    const parsed = branchCreateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return validation422(
        "Datos inválidos para sucursal.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      );
    }

    const created = await prisma.branch.create({
      data: {
        tenantId,
        name: parsed.data.name,
        code: parsed.data.code,
        address: parsed.data.address,
        phone: parsed.data.phone,
        timezone: parsed.data.timezone,
        isActive: parsed.data.isActive,
        createdById: auth.user?.id ?? null
      },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        timezone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await auditLog({
      action: "BRANCH_CREATED",
      entityType: "Branch",
      entityId: created.id,
      user: auth.user,
      req,
      after: created,
      metadata: {
        branchId: created.id,
        branchCode: created.code
      }
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    if (isCentralConfigCompatError(error)) {
      warnDevCentralCompat("config.branches.create", error);
      return service503(
        "DB_NOT_READY",
        "Configuración de sucursales no disponible. Ejecuta migraciones y prisma generate."
      );
    }

    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      return conflict409("Código o nombre de sucursal duplicado.");
    }

    const message = error instanceof Error ? error.message : "No se pudo crear la sucursal.";
    return server500(message);
  }
}
