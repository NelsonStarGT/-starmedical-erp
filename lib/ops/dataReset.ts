import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError } from "@/lib/prisma/errors";
import type {
  OpsDataResetModule,
  OpsDataResetModuleSummary,
  OpsDataResetResult,
  OpsDataResetScope
} from "@/lib/ops/types";

const MODULE_SUMMARIES: Record<OpsDataResetModule, OpsDataResetModuleSummary> = {
  inventory_runtime: {
    module: "inventory_runtime",
    title: "Inventario runtime",
    description: "Limpia movimientos y reinicia stock operativo a 0 sin tocar catálogo base.",
    warning: "No elimina productos, categorías ni usuarios.",
    tables: ["InventoryMovement", "ProductStock"]
  },
  ops_health: {
    module: "ops_health",
    title: "Historial OPS",
    description: "Borra snapshots históricos de health para reinicio operativo.",
    warning: "No impacta usuarios ni configuración funcional.",
    tables: ["OpsHealthCheck", "OpsHealthCheckService"]
  },
  processing_jobs: {
    module: "processing_jobs",
    title: "Jobs de procesamiento",
    description: "Limpia cola/historial de jobs y artefactos de procesamiento.",
    warning: "No borra archivos en MinIO; solo metadatos de DB.",
    tables: ["ProcessingJob", "ProcessingArtifact"]
  },
  portal_runtime: {
    module: "portal_runtime",
    title: "Portal runtime",
    description: "Resetea sesiones y OTP del portal para cerrar estado temporal.",
    warning: "No borra perfiles de pacientes/clientes.",
    tables: ["PortalSession", "PortalSessionRotationLog", "PortalOtpChallenge"]
  }
};

const TENANT_AWARE_MODULES = new Set<OpsDataResetModule>(["ops_health", "processing_jobs"]);

export function getOpsDataResetModules() {
  return Object.values(MODULE_SUMMARIES);
}

export function normalizeOpsDataResetModule(value: string | null | undefined): OpsDataResetModule | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "inventory_runtime") return "inventory_runtime";
  if (normalized === "ops_health") return "ops_health";
  if (normalized === "processing_jobs") return "processing_jobs";
  if (normalized === "portal_runtime") return "portal_runtime";
  return null;
}

export function isOpsDataResetModuleTenantAware(moduleKey: OpsDataResetModule) {
  return TENANT_AWARE_MODULES.has(moduleKey);
}

function isTenantScopedModuleReset(input: { scope: OpsDataResetScope; tenantId?: string | null }) {
  if (input.scope !== "module") return false;
  return Boolean(String(input.tenantId || "").trim());
}

function markSkippedNoTenant(summary: Record<string, number>, moduleKey: OpsDataResetModule, tableCount: number) {
  summary.skipped_no_tenant = Number(summary.skipped_no_tenant || 0) + tableCount;
  summary[`skipped_no_tenant_${moduleKey}`] = tableCount;
}

async function safeDeleteMany(delegateName: string, args?: unknown) {
  const delegate = (prisma as any)[delegateName] as { deleteMany?: (args?: unknown) => Promise<{ count: number }> } | undefined;
  if (!delegate?.deleteMany) {
    return { count: 0, supported: false };
  }

  try {
    const result = await delegate.deleteMany(args || {});
    return { count: Number(result?.count || 0), supported: true };
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      return { count: 0, supported: false };
    }
    throw error;
  }
}

async function resetInventoryRuntime(input: { summary: Record<string, number>; touched: Set<string>; tenantScoped: boolean }) {
  if (input.tenantScoped) {
    markSkippedNoTenant(input.summary, "inventory_runtime", MODULE_SUMMARIES.inventory_runtime.tables.length);
    return;
  }

  const deletedMovements = await safeDeleteMany("inventoryMovement");
  if (deletedMovements.supported) input.touched.add("InventoryMovement");
  input.summary.deletedInventoryMovements = deletedMovements.count;

  const productStockDelegate = (prisma as any).productStock as
    | { updateMany?: (args: { data: { stock: number } }) => Promise<{ count: number }> }
    | undefined;

  if (!productStockDelegate?.updateMany) {
    input.summary.resetStocks = 0;
    return;
  }

  try {
    const result = await productStockDelegate.updateMany({ data: { stock: 0 } });
    input.touched.add("ProductStock");
    input.summary.resetStocks = Number(result?.count || 0);
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      input.summary.resetStocks = 0;
      return;
    }
    throw error;
  }
}

async function resetOpsHealth(input: {
  summary: Record<string, number>;
  touched: Set<string>;
  tenantId: string | null;
  scope: OpsDataResetScope;
}) {
  const where = input.scope === "module" && input.tenantId ? { tenantId: input.tenantId } : undefined;
  const deleted = await safeDeleteMany("opsHealthCheck", where ? { where } : undefined);
  if (deleted.supported) input.touched.add("OpsHealthCheck");
  input.summary.deletedOpsHealthChecks = deleted.count;
}

async function resetProcessingJobs(input: {
  summary: Record<string, number>;
  touched: Set<string>;
  tenantId: string | null;
  scope: OpsDataResetScope;
}) {
  const isTenantScoped = input.scope === "module" && Boolean(input.tenantId);
  const artifactWhere = isTenantScoped && input.tenantId ? { job: { tenantId: input.tenantId } } : undefined;
  const deletedArtifacts = await safeDeleteMany("processingArtifact", artifactWhere ? { where: artifactWhere } : undefined);
  if (deletedArtifacts.supported) input.touched.add("ProcessingArtifact");
  input.summary.deletedProcessingArtifacts = deletedArtifacts.count;

  const jobWhere = isTenantScoped && input.tenantId ? { tenantId: input.tenantId } : undefined;
  const deletedJobs = await safeDeleteMany("processingJob", jobWhere ? { where: jobWhere } : undefined);
  if (deletedJobs.supported) input.touched.add("ProcessingJob");
  input.summary.deletedProcessingJobs = deletedJobs.count;
}

async function resetPortalRuntime(input: { summary: Record<string, number>; touched: Set<string>; tenantScoped: boolean }) {
  if (input.tenantScoped) {
    markSkippedNoTenant(input.summary, "portal_runtime", MODULE_SUMMARIES.portal_runtime.tables.length);
    return;
  }

  const deletedRotations = await safeDeleteMany("portalSessionRotationLog");
  if (deletedRotations.supported) input.touched.add("PortalSessionRotationLog");
  input.summary.deletedPortalSessionRotations = deletedRotations.count;

  const deletedSessions = await safeDeleteMany("portalSession");
  if (deletedSessions.supported) input.touched.add("PortalSession");
  input.summary.deletedPortalSessions = deletedSessions.count;

  const deletedOtp = await safeDeleteMany("portalOtpChallenge");
  if (deletedOtp.supported) input.touched.add("PortalOtpChallenge");
  input.summary.deletedPortalOtpChallenges = deletedOtp.count;
}

async function runModuleReset(input: {
  moduleKey: OpsDataResetModule;
  summary: Record<string, number>;
  touched: Set<string>;
  tenantId: string | null;
  scope: OpsDataResetScope;
}) {
  const tenantScoped = isTenantScopedModuleReset({
    scope: input.scope,
    tenantId: input.tenantId
  });
  if (tenantScoped && isOpsDataResetModuleTenantAware(input.moduleKey) && !input.tenantId) {
    throw new Error("tenant_id_required");
  }

  const moduleRequiresTenantFilter = tenantScoped && isOpsDataResetModuleTenantAware(input.moduleKey);
  if (input.moduleKey === "inventory_runtime") {
    await resetInventoryRuntime({ summary: input.summary, touched: input.touched, tenantScoped });
    return;
  }
  if (input.moduleKey === "ops_health") {
    await resetOpsHealth({
      summary: input.summary,
      touched: input.touched,
      tenantId: moduleRequiresTenantFilter ? input.tenantId : null,
      scope: input.scope
    });
    return;
  }
  if (input.moduleKey === "processing_jobs") {
    await resetProcessingJobs({
      summary: input.summary,
      touched: input.touched,
      tenantId: moduleRequiresTenantFilter ? input.tenantId : null,
      scope: input.scope
    });
    return;
  }
  await resetPortalRuntime({ summary: input.summary, touched: input.touched, tenantScoped });
}

export async function executeOpsDataReset(input: {
  scope: OpsDataResetScope;
  module?: OpsDataResetModule | null;
  tenantId?: string | null;
}) {
  const tenantId = String(input.tenantId || "").trim() || null;
  const summary: Record<string, number> = {};
  const touched = new Set<string>();

  const modules: OpsDataResetModule[] =
    input.scope === "global"
      ? ["inventory_runtime", "ops_health", "processing_jobs", "portal_runtime"]
      : [input.module || "inventory_runtime"];

  for (const moduleKey of modules) {
    if (input.scope === "module" && isOpsDataResetModuleTenantAware(moduleKey) && !tenantId) {
      throw new Error("tenant_id_required");
    }
    await runModuleReset({
      moduleKey,
      summary,
      touched,
      tenantId,
      scope: input.scope
    });
  }

  return {
    scope: input.scope,
    module: input.scope === "module" ? modules[0] : null,
    tenantId,
    executedAt: new Date().toISOString(),
    summary,
    touchedTables: Array.from(touched).sort()
  } satisfies OpsDataResetResult;
}
