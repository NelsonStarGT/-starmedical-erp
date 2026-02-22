import { NextRequest, NextResponse } from "next/server";
import {
  forbidden403,
  isCentralConfigCompatError,
  warnDevCentralCompat
} from "@/lib/config-central";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, isAdmin } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SmokeCheckResult = {
  key: string;
  label: string;
  ok: boolean;
  count: number | null;
  error?: string;
};

type InternalSmokeCheckResult = SmokeCheckResult & {
  rawError?: unknown;
};

const isProd = process.env.NODE_ENV === "production";

function warnDelegateMissingDev(context: string) {
  if (process.env.NODE_ENV === "production") return;
  console.warn(
    `[DEV][config.smoke] Prisma delegate missing for ${context}. ` +
      "Usando fallback SQL para validación de tabla."
  );
}

async function countViaRawTable(tableName: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(
    `SELECT COUNT(*)::bigint AS count FROM "${tableName}"`
  );
  const rawValue = rows[0]?.count ?? 0;
  if (typeof rawValue === "bigint") return Number(rawValue);
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function runCountCheck(params: {
  key: string;
  label: string;
  tableName: string;
  countFn: () => Promise<number>;
}): Promise<InternalSmokeCheckResult> {
  try {
    const count = await params.countFn().catch(async (error) => {
      if (error instanceof Error && error.message.toLowerCase().includes("delegate missing")) {
        warnDelegateMissingDev(params.key);
        return countViaRawTable(params.tableName);
      }
      throw error;
    });
    return {
      key: params.key,
      label: params.label,
      ok: true,
      count
    };
  } catch (error) {
    return {
      key: params.key,
      label: params.label,
      ok: false,
      count: null,
      error: error instanceof Error ? error.message : String(error),
      rawError: error
    };
  }
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const user = auth.user!;
  const canRunSmoke =
    isAdmin(user) ||
    hasPermission(user, "SYSTEM:ADMIN") ||
    hasPermission(user, "CONFIG_BRANCH_READ") ||
    hasPermission(user, "CONFIG_SAT_READ") ||
    hasPermission(user, "CONFIG_THEME_READ");

  if (!canRunSmoke) {
    return forbidden403();
  }

  const prismaClient = prisma as unknown as {
    branch?: { count?: () => Promise<number> };
    branchBusinessHours?: { count?: () => Promise<number> };
    branchSatEstablishment?: { count?: () => Promise<number> };
    tenantThemeConfig?: { count?: () => Promise<number> };
    systemFeatureConfig?: { count?: () => Promise<number> };
  };

  const checks = await Promise.all([
    runCountCheck({
      key: "branch",
      label: "Branch",
      tableName: "Branch",
      countFn: async () => {
        const delegate = prismaClient.branch;
        if (!delegate?.count) throw new Error("Prisma delegate missing: branch");
        return delegate.count();
      }
    }),
    runCountCheck({
      key: "branchBusinessHours",
      label: "BranchBusinessHours",
      tableName: "BranchBusinessHours",
      countFn: async () => {
        const delegate = prismaClient.branchBusinessHours;
        if (!delegate?.count) throw new Error("Prisma delegate missing: branchBusinessHours");
        return delegate.count();
      }
    }),
    runCountCheck({
      key: "branchSatEstablishment",
      label: "BranchSatEstablishment",
      tableName: "BranchSatEstablishment",
      countFn: async () => {
        const delegate = prismaClient.branchSatEstablishment;
        if (!delegate?.count) throw new Error("Prisma delegate missing: branchSatEstablishment");
        return delegate.count();
      }
    }),
    runCountCheck({
      key: "tenantThemeConfig",
      label: "TenantThemeConfig",
      tableName: "TenantThemeConfig",
      countFn: async () => {
        const delegate = prismaClient.tenantThemeConfig;
        if (!delegate?.count) throw new Error("Prisma delegate missing: tenantThemeConfig");
        return delegate.count();
      }
    }),
    runCountCheck({
      key: "systemFeatureConfig",
      label: "SystemFeatureConfig",
      tableName: "SystemFeatureConfig",
      countFn: async () => {
        const delegate = prismaClient.systemFeatureConfig;
        if (!delegate?.count) throw new Error("Prisma delegate missing: systemFeatureConfig");
        return delegate.count();
      }
    })
  ]);

  const hasFailure = checks.some((check) => !check.ok);
  const compatFailure = checks.find((check) => check.rawError && isCentralConfigCompatError(check.rawError));
  if (compatFailure?.rawError) {
    warnDevCentralCompat("config.smoke", compatFailure.rawError);
  }

  const payloadChecks: SmokeCheckResult[] = checks.map((check) => ({
    key: check.key,
    label: check.label,
    ok: check.ok,
    count: check.count,
    ...(check.ok ? {} : { error: isProd ? "db_not_ready" : check.error })
  }));

  if (hasFailure) {
    return NextResponse.json(
      {
        ok: false,
        code: "DB_NOT_READY",
        error: isProd
          ? "Configuración central no disponible en este entorno."
          : "DB/config no lista para Configuración Central. Revisa migraciones y prisma generate.",
        checkedAt: new Date().toISOString(),
        checks: payloadChecks
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    checks: payloadChecks
  });
}
