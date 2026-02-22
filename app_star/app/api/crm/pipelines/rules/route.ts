import { NextRequest, NextResponse } from "next/server";
import { PipelineRuleScope, PipelineRuleType, RuleSeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureCrmAdmin } from "@/lib/api/crm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = ensureCrmAdmin(req);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const pipelineId = String(body.pipelineId || "");
    const scope = String(body.scope || "").toUpperCase() as PipelineRuleScope;
    const name = String(body.name || "").trim();
    if (!pipelineId || !name || !Object.values(PipelineRuleScope).includes(scope)) {
      return NextResponse.json({ error: "pipelineId, scope y name requeridos" }, { status: 400 });
    }
    const ruleType = String(body.type || "").toUpperCase() as PipelineRuleType;
    if (!Object.values(PipelineRuleType).includes(ruleType)) {
      return NextResponse.json({ error: "type de regla inválido" }, { status: 400 });
    }
    const severity = (String(body.severity || "BLOCK").toUpperCase() as RuleSeverity) || RuleSeverity.BLOCK;

    const ruleSet = await prisma.pipelineRuleSet.create({
      data: {
        pipelineId,
        scope,
        stageKey: body.stageKey || null,
        fromStageKey: body.fromStageKey || null,
        toStageKey: body.toStageKey || null,
        name,
        description: body.description || null,
        priority: Number(body.priority || 100),
        isActive: body.isActive !== false
      }
    });

    const rule = await prisma.pipelineRule.create({
      data: {
        ruleSetId: ruleSet.id,
        type: ruleType,
        severity,
        message: body.message || "Regla de pipeline",
        params: body.params || {},
        isActive: true,
        order: Number(body.order || 0)
      }
    });

    return NextResponse.json({ data: { ruleSet, rule } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudo crear regla" }, { status: 400 });
  }
}
