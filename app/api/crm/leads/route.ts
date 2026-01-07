import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCrmAccess } from "@/lib/api/crm";
import { ClientProfileType, CrmLeadStatus, CrmLeadType } from "@prisma/client";
import { linkOrCreateClientProfile } from "@/lib/api/crmLink";
import { PERMISSIONS } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

function normalizeLead(body: any, requireAll = true) {
  const leadType = body.leadType !== undefined ? String(body.leadType || "").toUpperCase() : undefined;
  const companyName = body.companyName !== undefined ? String(body.companyName || "").trim() : undefined;
  const nit = body.nit !== undefined ? String(body.nit || "").trim() : undefined;
  const personName = body.personName !== undefined ? String(body.personName || "").trim() : undefined;
  const personDpi = body.personDpi !== undefined ? String(body.personDpi || "").trim() : undefined;
  const email = body.email !== undefined ? String(body.email || "").trim() : undefined;
  const phone = body.phone !== undefined ? String(body.phone || "").trim() : undefined;
  const address = body.address !== undefined ? String(body.address || "").trim() : undefined;
  const source = body.source !== undefined ? String(body.source || "").trim() : undefined;
  const status = body.status !== undefined ? String(body.status || "").trim().toUpperCase() : undefined;
  const ownerId = body.ownerId !== undefined ? String(body.ownerId || "").trim() : undefined;
  const nextActionAt =
    body.nextActionAt !== undefined ? (body.nextActionAt ? new Date(body.nextActionAt) : null) : undefined;
  const notes = body.notes !== undefined ? String(body.notes || "").trim() : undefined;
  const createdById = body.createdById !== undefined ? String(body.createdById || "") : undefined;

  if (requireAll && !leadType) throw new Error("leadType requerido");
  if (leadType && !Object.values(CrmLeadType).includes(leadType as CrmLeadType)) throw new Error("leadType inválido");
  if (requireAll && leadType === "COMPANY" && !companyName) throw new Error("companyName requerido");
  if (requireAll && leadType === "PATIENT" && !personName) throw new Error("personName requerido");

  return {
    leadType,
    companyName,
    nit,
    personName,
    personDpi,
    email,
    phone,
    address,
    source,
    status,
    ownerId,
    nextActionAt,
    notes,
    createdById
  };
}

export async function GET(req: NextRequest) {
  const auth = ensureCrmAccess(req, PERMISSIONS.LEAD_READ);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const status = req.nextUrl.searchParams.get("status");
    const leadType = req.nextUrl.searchParams.get("leadType");
    const where: any = {};
    if (status && Object.values(CrmLeadStatus).includes(status as CrmLeadStatus)) where.status = status as CrmLeadStatus;
    if (leadType && Object.values(CrmLeadType).includes(leadType as CrmLeadType)) where.leadType = leadType as CrmLeadType;

    const leads = await prisma.crmLead.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: { client: true },
      orderBy: [{ createdAt: "desc" }]
    });
    return NextResponse.json({ data: leads });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "No se pudieron obtener leads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = ensureCrmAccess(req, PERMISSIONS.LEAD_WRITE);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const {
      leadType,
      companyName,
      nit,
      personName,
      personDpi,
      email,
      phone,
      address,
      source,
      status,
      ownerId,
      nextActionAt,
      notes,
      createdById
    } = normalizeLead(body, true);

    const profile =
      leadType === "COMPANY"
        ? await linkOrCreateClientProfile({
            type: ClientProfileType.COMPANY,
            companyName: companyName || undefined,
            nit: nit || undefined,
            email: email || undefined,
            phone: phone || undefined
          })
        : await linkOrCreateClientProfile({
            type: ClientProfileType.PERSON,
            firstName: personName ? personName.split(" ")[0] : undefined,
            lastName: personName ? personName.split(" ").slice(1).join(" ") || null : null,
            dpi: personDpi || undefined,
            email: email || undefined,
            phone: phone || undefined
          });

    const saved = await prisma.crmLead.create({
      data: {
        leadType: leadType as CrmLeadType,
        clientId: profile.id,
        companyName: companyName || null,
        nit: nit || null,
        personName: personName || null,
        personDpi: personDpi || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        source: source || null,
        status: (status as CrmLeadStatus) || CrmLeadStatus.NEW,
        ownerId: ownerId || auth.role || "Ventas",
        nextActionAt: nextActionAt || null,
        notes: notes || null,
        createdById: createdById || auth.user?.id || auth.role || "Ventas"
      }
    });
    await auditLog({
      action: "LEAD_CREATED",
      entityType: "LEAD",
      entityId: saved.id,
      after: { leadType: saved.leadType, ownerId: saved.ownerId },
      user: auth.user,
      req
    });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "No se pudo crear el lead" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = ensureCrmAccess(req, PERMISSIONS.LEAD_WRITE);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    const id = body.id ? String(body.id) : "";
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const {
      leadType,
      companyName,
      nit,
      personName,
      personDpi,
      email,
      phone,
      address,
      source,
      status,
      ownerId,
      nextActionAt,
      notes,
      createdById
    } = normalizeLead(body, false);

    const data: any = {};
    if (leadType !== undefined) data.leadType = leadType as CrmLeadType;
    if (companyName !== undefined) data.companyName = companyName;
    if (nit !== undefined) data.nit = nit;
    if (personName !== undefined) data.personName = personName;
    if (personDpi !== undefined) data.personDpi = personDpi;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (address !== undefined) data.address = address;
    if (source !== undefined) data.source = source;
    if (status !== undefined) data.status = status as CrmLeadStatus;
    if (ownerId !== undefined) data.ownerId = ownerId;
    if (nextActionAt !== undefined) data.nextActionAt = nextActionAt;
    if (notes !== undefined) data.notes = notes;
    if (createdById !== undefined) data.createdById = createdById;
    if (!Object.keys(data).length) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

    const saved = await prisma.crmLead.update({ where: { id }, data });
    return NextResponse.json({ data: saved });
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
    return NextResponse.json({ error: err?.message || "No se pudo actualizar el lead" }, { status: 400 });
  }
}
