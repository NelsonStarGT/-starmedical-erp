import { PipelineRuleType, RuleSeverity, QuoteStatus } from "@prisma/client";
import { RuleContext, resolveField, hasActiveApprovedQuote, hasSentQuote } from "./resolvers";
import { hasPermission } from "@/lib/rbac";

export type RuleResult = {
  passed: boolean;
  warning?: boolean;
  message?: string;
  code?: string;
  requiredActions?: any[];
};

export type RuleConfig = {
  id: string;
  type: PipelineRuleType;
  severity: RuleSeverity;
  message: string;
  params?: any;
};

function evalCondition(ctx: RuleContext, when?: any): boolean {
  if (!when) return true;
  const entries = Object.entries(when || {});
  for (const [key, value] of entries) {
    const actual = resolveField(ctx, key) as any;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if ("equals" in value && actual !== value.equals) return false;
      if ("in" in value && Array.isArray(value.in) && !value.in.includes(actual)) return false;
      if ("gt" in value && !(Number(actual) > Number(value.gt))) return false;
      if ("gte" in value && !(Number(actual) >= Number(value.gte))) return false;
      if ("lt" in value && !(Number(actual) < Number(value.lt))) return false;
      if ("lte" in value && !(Number(actual) <= Number(value.lte))) return false;
      if ("exists" in value) {
        const exists = actual !== undefined && actual !== null && String(actual).trim() !== "";
        if (value.exists && !exists) return false;
        if (!value.exists && exists) return false;
      }
    } else {
      if (actual !== value) return false;
    }
  }
  return true;
}

export function evaluateRule(rule: RuleConfig, ctx: RuleContext, user: any): RuleResult {
  const params = rule.params || {};
  if (!evalCondition(ctx, params.when)) {
    return { passed: true };
  }

  switch (rule.type) {
    case PipelineRuleType.REQUIRED_FIELDS: {
      const missing = (params.fields || []).filter((path: string) => {
        const val = resolveField(ctx, path);
        return val === undefined || val === null || String(val).trim() === "";
      });
      if (missing.length) {
        return { passed: false, message: rule.message || "Faltan campos requeridos", code: "REQUIRED_FIELDS", requiredActions: missing };
      }
      return { passed: true };
    }
    case PipelineRuleType.REQUIRED_NEXT_ACTION: {
      if (params.required === false) return { passed: true };
      const hasAction = ctx.deal.nextAction && ctx.deal.nextActionAt;
      if (!hasAction) return { passed: false, message: rule.message || "Define la próxima acción", code: "REQUIRED_NEXT_ACTION" };
      if (params.minHoursFromNow) {
        const minMs = Number(params.minHoursFromNow) * 60 * 60 * 1000;
        const target = new Date(ctx.deal.nextActionAt).getTime();
        if (target - Date.now() < minMs) {
          return { passed: false, message: rule.message || "La próxima acción debe ser posterior al mínimo", code: "REQUIRED_NEXT_ACTION" };
        }
      }
      return { passed: true };
    }
    case PipelineRuleType.REQUIRE_QUOTE_STATUS: {
      if (params.mustExist && !(ctx.quotes || []).length) {
        return { passed: false, message: rule.message || "Falta cotización", code: "REQUIRE_QUOTE_STATUS" };
      }
      if (params.statuses?.length) {
        const ok = (ctx.quotes || []).some((q) => params.statuses.includes(q.status));
        if (!ok) {
          return { passed: false, message: rule.message || "Cotización en estado inválido", code: "REQUIRE_QUOTE_STATUS" };
        }
      }
      return { passed: true };
    }
    case PipelineRuleType.DISALLOW_STAGE_FOR_PIPELINE: {
      const disallowed: string[] = params.disallowedStageKeys || [];
      if (disallowed.includes(ctx.deal.stage)) {
        return { passed: false, message: rule.message || "Etapa no permitida", code: "DISALLOW_STAGE_FOR_PIPELINE" };
      }
      return { passed: true };
    }
    case PipelineRuleType.REQUIRE_CONTRACT_OR_COLLECTION_PLAN: {
      const hasExpected = Boolean(ctx.deal.expectedCloseDate);
      const hasContractActivity = (ctx.deal.activities || []).some(
        (a: any) => a.summary?.toLowerCase().includes("contrato") || a.notes?.toLowerCase().includes("contrato")
      );
      if (!hasExpected && !hasContractActivity) {
        return { passed: false, message: rule.message || "Se requiere contrato o plan de cobro", code: "REQUIRE_CONTRACT_OR_COLLECTION_PLAN" };
      }
      return { passed: true };
    }
    case PipelineRuleType.REQUIRE_REASON_ON_LOST: {
      const reasonField = params.reasonField || "deal.lostReason";
      const reason = resolveField(ctx, reasonField);
      if (!reason) return { passed: false, message: rule.message || "Motivo obligatorio", code: "REQUIRE_REASON_ON_LOST" };
      return { passed: true };
    }
    case PipelineRuleType.AMOUNT_APPROVAL_THRESHOLD: {
      const threshold = Number(params.threshold || 0);
      const amount = Number(resolveField(ctx, params.amountField || "deal.amount") || 0);
      if (amount > threshold) {
        const perm = params.requiredPermission || "CRM:QUOTES:APPROVE";
        if (!hasPermission(user, perm)) {
          return { passed: false, message: rule.message || "Monto requiere aprobación", code: "AMOUNT_APPROVAL_THRESHOLD" };
        }
      }
      return { passed: true };
    }
    default:
      return { passed: true };
  }
}
