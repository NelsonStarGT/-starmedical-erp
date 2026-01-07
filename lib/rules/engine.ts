import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loadRuleContext, stageKeyFromDeal } from "./resolvers";
import { evaluateRule, RuleConfig } from "./types";
import { auditLog } from "@/lib/audit";

export type EvaluateInput = {
  dealId: string;
  toStageKey: string;
  fromStageKey?: string | null;
  actorUserId?: string | null;
  user?: { id: string; roles: string[]; permissions: string[] };
};

export type EvaluateResult = {
  allowed: boolean;
  errors: Array<{ code: string; message: string; ruleId: string }>;
  warnings: Array<{ code: string; message: string; ruleId: string }>;
  requiredActions: Array<{ type: string; payload?: any }>;
  evaluated: Array<{ ruleId: string; result: "PASS" | "FAIL" | "WARN" }>;
};

function normalizeRuleConfig(rule: any): RuleConfig {
  return {
    id: rule.id,
    type: rule.type,
    severity: rule.severity,
    message: rule.message,
    params: rule.params || {}
  };
}

export async function evaluateTransition(input: EvaluateInput): Promise<EvaluateResult> {
  const ctx = await loadRuleContext(input.dealId);
  if (!ctx) return { allowed: false, errors: [{ code: "DEAL_NOT_FOUND", message: "Deal no encontrado", ruleId: "none" }], warnings: [], requiredActions: [], evaluated: [] };

  const pipeline = await prisma.pipelineConfig.findFirst({
    where: { type: ctx.deal.pipelineType, isActive: true },
    include: {
      ruleSets: { include: { rules: true } }
    }
  });
  if (!pipeline) {
    return { allowed: false, errors: [{ code: "PIPELINE_NOT_CONFIGURED", message: "Pipeline no configurado", ruleId: "none" }], warnings: [], requiredActions: [], evaluated: [] };
  }

  const fromKey = input.fromStageKey || stageKeyFromDeal(ctx.deal);
  const toKey = input.toStageKey;

  const transitions = await prisma.pipelineTransition.findMany({ where: { pipelineId: pipeline.id } });
  if (transitions.length) {
    const match = transitions.find((t) => t.fromStageKey === fromKey && t.toStageKey === toKey && t.isEnabled);
    if (!match) {
      return {
        allowed: false,
        errors: [{ code: "TRANSITION_DISABLED", message: "Transición no permitida", ruleId: "transition" }],
        warnings: [],
        requiredActions: [],
        evaluated: []
      };
    }
  }

  const ruleSets = pipeline.ruleSets
    .filter((rs) => rs.isActive)
    .filter((rs) => {
      if (rs.scope === "PIPELINE") return true;
      if (rs.scope === "STAGE") return rs.stageKey === toKey;
      if (rs.scope === "TRANSITION") return rs.fromStageKey === fromKey && rs.toStageKey === toKey;
      return false;
    })
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));

  const errors: EvaluateResult["errors"] = [];
  const warnings: EvaluateResult["warnings"] = [];
  const requiredActions: EvaluateResult["requiredActions"] = [];
  const evaluated: EvaluateResult["evaluated"] = [];

  for (const rs of ruleSets) {
    const rules = (rs.rules || []).filter((r) => r.isActive).sort((a, b) => (a.order || 0) - (b.order || 0));
    for (const r of rules) {
      const config = normalizeRuleConfig(r);
      const result = evaluateRule(
        config,
        ctx,
        input.user || { id: input.actorUserId || "", roles: [], permissions: [] }
      );
      if (!result.passed) {
        if (config.severity === "WARN") {
          warnings.push({ code: result.code || config.type, message: result.message || config.message, ruleId: config.id });
          evaluated.push({ ruleId: config.id, result: "WARN" });
        } else {
          errors.push({ code: result.code || config.type, message: result.message || config.message, ruleId: config.id });
          evaluated.push({ ruleId: config.id, result: "FAIL" });
        }
        if (result.requiredActions?.length) {
          requiredActions.push({ type: "FIELDS_REQUIRED", payload: result.requiredActions });
        }
      } else {
        evaluated.push({ ruleId: config.id, result: "PASS" });
      }
    }
  }

  const allowed = errors.length === 0;
  await prisma.ruleEvaluationLog.create({
    data: {
      pipelineId: pipeline.id,
      dealId: input.dealId,
      fromStageKey: fromKey,
      toStageKey: toKey,
      allowed,
      errors,
      warnings,
      evaluatedRules: evaluated,
      actorUserId: input.actorUserId || null
    }
  });

  if (!allowed) {
    await auditLog({
      action: "RULE_DENIED",
      entityType: "DEAL",
      entityId: input.dealId,
      before: { stage: fromKey },
      after: { stage: toKey },
      metadata: { errors, warnings },
      user: ctx.deal.ownerId ? { id: ctx.deal.ownerId, email: "", roles: [], permissions: [] } : undefined
    });
  }

  return { allowed, errors, warnings, requiredActions, evaluated };
}
