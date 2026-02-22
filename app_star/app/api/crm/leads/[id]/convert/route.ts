import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";
import { ClientProfileType, CrmDealStage, CrmLeadStatus, CrmPipelineType, CrmSlaStatus, Prisma } from "@prisma/client";
import { linkOrCreateClientProfile } from "@/lib/api/crmLink";
import { computeSlaStatus } from "@/lib/crmConfig";
import { PERMISSIONS } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = ensureCrmAccess(req, PERMISSIONS.LEAD_WRITE);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const leadId = params.id;
    const lead = await prisma.crmLead.findUnique({ where: { id: leadId } });
    if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

    const body = await req.json();
    const accountName = String(body.accountName || lead.companyName || lead.personName || "Lead");
    const contactFull = String(body.contactName || lead.personName || lead.companyName || "");
    const [firstName, ...lastParts] = contactFull.split(" ");
    const lastName = lastParts.join(" ").trim() || null;
    const dealStage = body.dealStage && Object.values(CrmDealStage).includes(String(body.dealStage) as CrmDealStage)
      ? (String(body.dealStage) as CrmDealStage)
      : CrmDealStage.NUEVO;
    const pipelineType = body.pipelineType === "B2B" ? CrmPipelineType.B2B : CrmPipelineType.B2C;
    const ownerId = body.ownerId ? String(body.ownerId) : auth.role || "Ventas";
    const now = new Date();
    const slaStatus = computeSlaStatus(dealStage, now) as CrmSlaStatus;

    const result = await prisma.$transaction(async (tx) => {
      const client = await linkOrCreateClientProfile({
        type: ClientProfileType.COMPANY,
        companyName: accountName,
        nit: body.nit || null,
        email: lead.email || null,
        phone: lead.phone || null
      });

      const account = await tx.crmAccount.create({
        data: {
          clientId: client.id,
          name: accountName,
          nit: body.nit || null,
          address: body.address || null,
          creditTerm: body.creditTerm || null,
          sector: body.sector || null,
          ownerId,
          createdById: ownerId
        }
      });

      const contact = await tx.crmContact.create({
        data: {
          accountId: account.id,
          clientId: client.id,
          type: "COMPANY_CONTACT",
          firstName: firstName || accountName,
          lastName,
          position: body.contactTitle || null,
          email: lead.email,
          phone: lead.phone,
          createdById: ownerId
        }
      });

      const deal = await tx.crmDeal.create({
        data: {
          pipelineType: pipelineType as any,
          stage: dealStage,
          stageEnteredAt: now,
          slaStatus,
          amount: new Prisma.Decimal(0),
          amountEstimated: new Prisma.Decimal(0),
          probabilityPct: body.probability ? Number(body.probability) : 10,
          expectedCloseDate: body.closeDate ? new Date(body.closeDate) : null,
          ownerId,
          accountId: account.id,
          contactId: contact.id,
          capturedById: auth.role || ownerId,
          capturedAt: now,
          notes: body.notes || null,
          createdById: ownerId,
          stageHistory: {
            create: {
              fromStage: null,
              toStage: dealStage,
              changedAt: now,
              changedById: ownerId,
              comment: "Conversión de lead"
            }
          }
        }
      });

      await tx.crmLead.update({
        where: { id: leadId },
        data: { status: CrmLeadStatus.WON, notes: lead.notes }
      });

      return { account, contact, deal };
    });

    await auditLog({
      action: "LEAD_CONVERTED",
      entityType: "LEAD",
      entityId: leadId,
      after: { dealId: result.deal.id, accountId: result.account.id },
      user: auth.user,
      req
    });

    return NextResponse.json({ data: result });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo convertir el lead" }, { status: 400 });
  }
}
