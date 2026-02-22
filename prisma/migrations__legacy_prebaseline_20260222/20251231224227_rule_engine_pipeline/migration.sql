-- CreateEnum
CREATE TYPE "PipelineRuleScope" AS ENUM ('PIPELINE', 'STAGE', 'TRANSITION');

-- CreateEnum
CREATE TYPE "PipelineRuleType" AS ENUM ('REQUIRED_FIELDS', 'REQUIRED_NEXT_ACTION', 'REQUIRE_QUOTE_STATUS', 'DISALLOW_STAGE_FOR_PIPELINE', 'REQUIRE_CONTRACT_OR_COLLECTION_PLAN', 'REQUIRE_REASON_ON_LOST', 'AMOUNT_APPROVAL_THRESHOLD');

-- CreateEnum
CREATE TYPE "RuleSeverity" AS ENUM ('BLOCK', 'WARN');

-- CreateTable
CREATE TABLE "PipelineConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CrmPipelineType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "slaDays" INTEGER NOT NULL DEFAULT 0,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineTransition" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "fromStageKey" TEXT NOT NULL,
    "toStageKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineRuleSet" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "scope" "PipelineRuleScope" NOT NULL,
    "stageKey" TEXT,
    "fromStageKey" TEXT,
    "toStageKey" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineRule" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "type" "PipelineRuleType" NOT NULL,
    "severity" "RuleSeverity" NOT NULL DEFAULT 'BLOCK',
    "message" TEXT NOT NULL,
    "params" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleEvaluationLog" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fromStageKey" TEXT,
    "toStageKey" TEXT,
    "allowed" BOOLEAN NOT NULL,
    "errors" JSONB,
    "warnings" JSONB,
    "evaluatedRules" JSONB,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RuleEvaluationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PipelineConfig_name_type_key" ON "PipelineConfig"("name", "type");

-- CreateIndex
CREATE INDEX "PipelineStage_pipelineId_order_idx" ON "PipelineStage"("pipelineId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_pipelineId_key_key" ON "PipelineStage"("pipelineId", "key");

-- CreateIndex
CREATE INDEX "PipelineTransition_pipelineId_fromStageKey_toStageKey_idx" ON "PipelineTransition"("pipelineId", "fromStageKey", "toStageKey");

-- CreateIndex
CREATE INDEX "PipelineRuleSet_pipelineId_scope_idx" ON "PipelineRuleSet"("pipelineId", "scope");

-- CreateIndex
CREATE INDEX "PipelineRuleSet_pipelineId_scope_stageKey_idx" ON "PipelineRuleSet"("pipelineId", "scope", "stageKey");

-- CreateIndex
CREATE INDEX "PipelineRuleSet_pipelineId_scope_fromStageKey_toStageKey_idx" ON "PipelineRuleSet"("pipelineId", "scope", "fromStageKey", "toStageKey");

-- CreateIndex
CREATE INDEX "PipelineRule_ruleSetId_order_idx" ON "PipelineRule"("ruleSetId", "order");

-- CreateIndex
CREATE INDEX "RuleEvaluationLog_dealId_createdAt_idx" ON "RuleEvaluationLog"("dealId", "createdAt");

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "PipelineConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineTransition" ADD CONSTRAINT "PipelineTransition_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "PipelineConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineRuleSet" ADD CONSTRAINT "PipelineRuleSet_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "PipelineConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineRule" ADD CONSTRAINT "PipelineRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "PipelineRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleEvaluationLog" ADD CONSTRAINT "RuleEvaluationLog_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "PipelineConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleEvaluationLog" ADD CONSTRAINT "RuleEvaluationLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
