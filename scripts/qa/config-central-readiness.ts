import { PrismaClient } from "@prisma/client";

type ReadinessCheck = {
  key: string;
  ok: boolean;
  count: number | null;
  error?: string;
};

const prisma = new PrismaClient();

function toNumber(value: bigint | number | string | null | undefined): number {
  if (typeof value === "bigint") return Number(value);
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function countWithFallback(
  delegate: { count?: () => Promise<number> } | undefined,
  tableName: string
): Promise<number> {
  if (delegate?.count) {
    return delegate.count();
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(
    `SELECT COUNT(*)::bigint AS count FROM "${tableName}"`
  );
  return toNumber(rows[0]?.count);
}

async function runDbChecks(): Promise<ReadinessCheck[]> {
  const prismaClient = prisma as unknown as {
    branch?: { count?: () => Promise<number> };
    branchBusinessHours?: { count?: () => Promise<number> };
    branchSatEstablishment?: { count?: () => Promise<number> };
    tenantThemeConfig?: { count?: () => Promise<number> };
    systemFeatureConfig?: { count?: () => Promise<number> };
    legalEntity?: { count?: () => Promise<number> };
    tenantNavigationPolicy?: { count?: () => Promise<number> };
    tenantSecurityPolicy?: { count?: () => Promise<number> };
    processingServiceConfig?: { count?: () => Promise<number> };
    tenantBillingPreference?: { count?: () => Promise<number> };
    billingSeries?: { count?: () => Promise<number> };
    globalEmailConfig?: { count?: () => Promise<number> };
  };

  const checks: Array<{ key: string; tableName: string; delegate?: { count?: () => Promise<number> } }> = [
    { key: "branch", tableName: "Branch", delegate: prismaClient.branch },
    { key: "branchBusinessHours", tableName: "BranchBusinessHours", delegate: prismaClient.branchBusinessHours },
    {
      key: "branchSatEstablishment",
      tableName: "BranchSatEstablishment",
      delegate: prismaClient.branchSatEstablishment
    },
    { key: "tenantThemeConfig", tableName: "TenantThemeConfig", delegate: prismaClient.tenantThemeConfig },
    { key: "systemFeatureConfig", tableName: "SystemFeatureConfig", delegate: prismaClient.systemFeatureConfig },
    { key: "legalEntity", tableName: "LegalEntity", delegate: prismaClient.legalEntity },
    {
      key: "tenantNavigationPolicy",
      tableName: "TenantNavigationPolicy",
      delegate: prismaClient.tenantNavigationPolicy
    },
    {
      key: "tenantSecurityPolicy",
      tableName: "TenantSecurityPolicy",
      delegate: prismaClient.tenantSecurityPolicy
    },
    {
      key: "processingServiceConfig",
      tableName: "ProcessingServiceConfig",
      delegate: prismaClient.processingServiceConfig
    },
    {
      key: "tenantBillingPreference",
      tableName: "TenantBillingPreference",
      delegate: prismaClient.tenantBillingPreference
    },
    { key: "billingSeries", tableName: "BillingSeries", delegate: prismaClient.billingSeries },
    { key: "globalEmailConfig", tableName: "GlobalEmailConfig", delegate: prismaClient.globalEmailConfig }
  ];

  const results = await Promise.all(
    checks.map(async (check): Promise<ReadinessCheck> => {
      try {
        const count = await countWithFallback(check.delegate, check.tableName);
        return { key: check.key, ok: true, count };
      } catch (error) {
        return {
          key: check.key,
          ok: false,
          count: null,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    })
  );

  return results;
}

async function runSmokeCheck() {
  const smokeUrl = process.env.CONFIG_CENTRAL_SMOKE_URL?.trim();
  if (!smokeUrl) {
    console.info("[config-central:readiness] smoke URL no configurado; se omite validación HTTP.");
    return;
  }

  const headers: HeadersInit = {};
  const cookie = process.env.CONFIG_CENTRAL_SMOKE_COOKIE?.trim();
  if (cookie) {
    headers.Cookie = cookie;
  }

  const response = await fetch(smokeUrl, {
    method: "GET",
    headers
  });
  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    code?: string;
    error?: string;
  };

  if (!response.ok || !body.ok) {
    throw new Error(
      `Smoke HTTP falló (${response.status}). code=${body.code || "N/A"} error=${body.error || "Sin detalle"}`
    );
  }

  console.info("[config-central:readiness] smoke HTTP OK");
}

async function main() {
  const checks = await runDbChecks();
  const failedChecks = checks.filter((check) => !check.ok);

  for (const check of checks) {
    if (check.ok) {
      console.info(`[config-central:readiness] ${check.key}: OK (count=${check.count})`);
    } else {
      console.error(`[config-central:readiness] ${check.key}: FAIL (${check.error || "sin detalle"})`);
    }
  }

  if (failedChecks.length > 0) {
    throw new Error(`Readiness DB falló en ${failedChecks.length} checks.`);
  }

  await runSmokeCheck();
}

main()
  .catch((error) => {
    console.error("[config-central:readiness] FAIL", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
