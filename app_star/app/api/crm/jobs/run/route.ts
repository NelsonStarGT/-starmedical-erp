import { NextRequest, NextResponse } from "next/server";
import { CrmDealStage, CrmPipelineType, CrmSlaStatus, CrmTaskPriority, CrmTaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/api/auth";
import { computeSlaStatus } from "@/lib/crmConfig";

export const dynamic = "force-dynamic";

const DAY_MS = 1000 * 60 * 60 * 24;

function computeSlaStatusFromStage(stage: CrmDealStage, stageEnteredAt: Date): CrmSlaStatus {
  const status = computeSlaStatus(stage, stageEnteredAt);
  return status as CrmSlaStatus;
}

export async function POST(req: NextRequest) {
  const cronToken = req.headers.get("x-cron-token");
  const expectedToken = process.env.CRM_CRON_TOKEN;
  if (!expectedToken || cronToken !== expectedToken) {
    const auth = requireRoles(req, ["Administrador"]);
    if (auth.errorResponse) return auth.errorResponse;
  }

  const summary = { dealsChecked: 0, slaUpdated: 0, tasksCreated: 0, renewalsCreated: 0, errors: [] as string[] };

  try {
    const deals = await prisma.crmDeal.findMany({
      where: { status: "OPEN", pipelineType: { not: CrmPipelineType.B2C } },
      select: {
        id: true,
        pipelineId: true,
        pipelineType: true,
        stage: true,
        stageEnteredAt: true,
        slaStatus: true,
        ownerId: true,
        accountId: true,
        contactId: true,
        source: true,
        expectedCloseDate: true,
        services: true
      }
    });

    const now = new Date();
    for (const deal of deals) {
      summary.dealsChecked += 1;
      const nextStatus = computeSlaStatusFromStage(deal.stage, deal.stageEnteredAt);
      if (nextStatus !== deal.slaStatus) {
        await prisma.crmDeal.update({ where: { id: deal.id }, data: { slaStatus: nextStatus } });
        summary.slaUpdated += 1;
      }

      if (nextStatus === CrmSlaStatus.RED) {
        const existing = await prisma.crmTask.findFirst({
          where: { dealId: deal.id, status: { in: [CrmTaskStatus.OPEN, CrmTaskStatus.IN_PROGRESS] }, title: { contains: "SLA" } }
        });
        if (!existing) {
          await prisma.crmTask.create({
            data: {
              ownerId: deal.ownerId || "ventas",
              dealId: deal.id,
              dueDate: now,
              title: "SLA vencido - dar seguimiento",
              status: CrmTaskStatus.OPEN,
              priority: CrmTaskPriority.HIGH,
              notes: "Generado automáticamente por SLA"
            }
          });
          summary.tasksCreated += 1;
        }
      }
    }

    const renewalSource = "RENOVACION_AUTO";
    const pipelinesByType = await prisma.crmPipeline.findMany({ select: { id: true, type: true } });
    const pipelineByType = new Map<CrmPipelineType, string>();
    pipelinesByType.forEach((p) => pipelineByType.set(p.type, p.id));

    const renewals = await prisma.crmDeal.findMany({
      where: { stage: CrmDealStage.GANADO, expectedCloseDate: { not: null }, pipelineType: CrmPipelineType.B2B },
      select: { id: true, pipelineId: true, pipelineType: true, accountId: true, contactId: true, ownerId: true, expectedCloseDate: true, services: true }
    });

    for (const deal of renewals) {
      if (!deal.expectedCloseDate) continue;
      const daysToRenewal = Math.floor((deal.expectedCloseDate.getTime() - now.getTime()) / DAY_MS);
      if (daysToRenewal < 0 || daysToRenewal > 30) continue;

      const existingRenewal = await prisma.crmDeal.findFirst({
        where: { accountId: deal.accountId, source: renewalSource, status: "OPEN" }
      });
      if (existingRenewal) continue;

      const pipelineId = deal.pipelineId || pipelineByType.get(deal.pipelineType) || null;
      const created = await prisma.crmDeal.create({
        data: {
          pipelineType: deal.pipelineType,
          pipelineId,
          stage: CrmDealStage.NUEVO,
          stageEnteredAt: now,
          slaStatus: CrmSlaStatus.GREEN,
          probabilityPct: 10,
          expectedCloseDate: deal.expectedCloseDate,
          ownerId: deal.ownerId,
          accountId: deal.accountId,
          contactId: deal.contactId,
          source: renewalSource,
          notes: `Renovación automática del deal ${deal.id}`,
          createdById: "cron",
          services: deal.services.length
            ? {
                createMany: { data: deal.services.map((s) => ({ serviceType: s.serviceType })) }
              }
            : undefined,
          stageHistory: {
            create: { fromStage: null, toStage: CrmDealStage.NUEVO, changedById: "cron", comment: "Renovación automática" }
          }
        }
      });
      if (created) summary.renewalsCreated += 1;
    }

    return NextResponse.json(summary);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo ejecutar el job CRM" }, { status: 500 });
  }
}
