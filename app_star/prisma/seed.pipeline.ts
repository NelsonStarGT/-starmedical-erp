import { PrismaClient, PipelineRuleScope, PipelineRuleType, RuleSeverity, CrmPipelineType } from "@prisma/client";

const prisma = new PrismaClient();

async function createPipeline(type: CrmPipelineType, name: string) {
  const pipeline = await prisma.pipelineConfig.upsert({
    where: { name_type: { name, type } as any },
    update: {},
    create: { name, type }
  });

  const stagesBase = [
    { key: "NUEVO", name: "Nuevo", order: 1 },
    { key: "CONTACTADO", name: "Contactado", order: 2 },
    { key: "DIAGNOSTICO", name: "Diagnóstico", order: 3 },
    { key: "COTIZACION", name: "Cotización", order: 4 },
    { key: "NEGOCIACION", name: "Negociación", order: 5 },
    { key: "GANADO", name: "Ganado", order: 6, isTerminal: true },
    { key: "PERDIDO", name: "Perdido", order: 7, isTerminal: true }
  ];

  for (const st of stagesBase) {
    await prisma.pipelineStage.upsert({
      where: { pipelineId_key: { pipelineId: pipeline.id, key: st.key } as any },
      update: { name: st.name, order: st.order, isTerminal: st.isTerminal || false },
      create: {
        pipelineId: pipeline.id,
        key: st.key,
        name: st.name,
        order: st.order,
        slaDays: st.isTerminal ? 0 : st.key === "NUEVO" ? 1 : 2,
        probability: st.key === "GANADO" ? 100 : st.key === "PERDIDO" ? 0 : st.order * 10,
        isTerminal: st.isTerminal || false
      }
    });
  }

  const ruleSets: Array<{
    scope: PipelineRuleScope;
    stageKey?: string;
    fromStageKey?: string;
    toStageKey?: string;
    name: string;
    rules: Array<{ type: PipelineRuleType; severity: RuleSeverity; message: string; params?: any }>;
  }> = [];

  // Requerir próxima acción en etapas intermedias
  ["CONTACTADO", "DIAGNOSTICO", "COTIZACION", "NEGOCIACION"].forEach((stageKey) => {
    ruleSets.push({
      scope: PipelineRuleScope.STAGE,
      stageKey,
      name: `Next action en ${stageKey}`,
      rules: [
        {
          type: PipelineRuleType.REQUIRED_NEXT_ACTION,
          severity: RuleSeverity.BLOCK,
          message: "Define la próxima acción antes de avanzar",
          params: { required: true, minHoursFromNow: 1 }
        }
      ]
    });
  });

  // B2C sin diagnóstico/negociación
  if (type === CrmPipelineType.B2C) {
    ruleSets.push({
      scope: PipelineRuleScope.STAGE,
      stageKey: "DIAGNOSTICO",
      name: "B2C sin diagnóstico",
      rules: [
        {
          type: PipelineRuleType.DISALLOW_STAGE_FOR_PIPELINE,
          severity: RuleSeverity.BLOCK,
          message: "B2C no usa diagnóstico",
          params: { disallowedStageKeys: ["DIAGNOSTICO"] }
        }
      ]
    });
    ruleSets.push({
      scope: PipelineRuleScope.STAGE,
      stageKey: "NEGOCIACION",
      name: "B2C sin negociación",
      rules: [
        {
          type: PipelineRuleType.DISALLOW_STAGE_FOR_PIPELINE,
          severity: RuleSeverity.BLOCK,
          message: "B2C no usa negociación",
          params: { disallowedStageKeys: ["NEGOCIACION"] }
        }
      ]
    });
  }

  // WON requiere cotización aprobada
  ruleSets.push({
    scope: PipelineRuleScope.STAGE,
    stageKey: "GANADO",
    name: "WON requiere cotización aprobada",
    rules: [
      {
        type: PipelineRuleType.REQUIRE_QUOTE_STATUS,
        severity: RuleSeverity.BLOCK,
        message: "Necesitas una cotización aprobada",
        params: { mustExist: true, statuses: ["APPROVED"] }
      }
    ]
  });

  // WON B2B contrato/plan cobro
  if (type === CrmPipelineType.B2B) {
    ruleSets.push({
      scope: PipelineRuleScope.STAGE,
      stageKey: "GANADO",
      name: "Contrato o plan de cobro",
      rules: [
        {
          type: PipelineRuleType.REQUIRE_CONTRACT_OR_COLLECTION_PLAN,
          severity: RuleSeverity.BLOCK,
          message: "Adjunta contrato o primer cobro programado"
        }
      ]
    });
  }

  // LOST requiere motivo
  ruleSets.push({
    scope: PipelineRuleScope.STAGE,
    stageKey: "PERDIDO",
    name: "Motivo de pérdida",
    rules: [
      {
        type: PipelineRuleType.REQUIRE_REASON_ON_LOST,
        severity: RuleSeverity.BLOCK,
        message: "Motivo obligatorio al perder",
        params: { reasonField: "deal.lostReason" }
      }
    ]
  });

  for (const rs of ruleSets) {
    const ruleSet = await prisma.pipelineRuleSet.create({
      data: {
        pipelineId: pipeline.id,
        scope: rs.scope,
        stageKey: rs.stageKey,
        fromStageKey: rs.fromStageKey,
        toStageKey: rs.toStageKey,
        name: rs.name,
        priority: 100
      }
    });
    for (const r of rs.rules) {
      await prisma.pipelineRule.create({
        data: {
          ruleSetId: ruleSet.id,
          type: r.type,
          severity: r.severity,
          message: r.message,
          params: r.params || {},
          order: 0
        }
      });
    }
  }

  return pipeline;
}

async function main() {
  await createPipeline(CrmPipelineType.B2B, "B2B Empresas");
  await createPipeline(CrmPipelineType.B2C, "B2C Pacientes");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed pipeline listo");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
