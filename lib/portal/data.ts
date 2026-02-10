import { DocStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { getPortalPersonDisplayName, type PortalPersonIdentity } from "@/lib/portal/identity";
import type { PortalSessionClient } from "@/lib/portal/session";

export type PortalDashboardSummary = {
  nextAppointment: {
    id: string;
    date: Date;
    status: string;
    typeName: string | null;
  } | null;
  upcomingAppointments: number;
  pendingInvoices: number;
  recentResults: number;
  invoiceWarning: string | null;
};

export type PortalAppointmentItem = {
  id: string;
  date: Date;
  durationMin: number;
  status: string;
  paymentStatus: string;
  notes: string | null;
  typeName: string | null;
  siteName: string | null;
  source: "APPOINTMENT" | "VISIT";
};

export type PortalInvoiceAttachment = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type PortalInvoiceItem = {
  id: string;
  date: Date;
  dueDate: Date | null;
  amount: number;
  paidAmount: number;
  status: string;
  reference: string | null;
  partyName: string;
  attachments: PortalInvoiceAttachment[];
};

export type PortalInvoiceLookup = {
  items: PortalInvoiceItem[];
  warning: string | null;
  source: "partyId" | "heuristic_single" | "heuristic_none" | "heuristic_multiple";
};

export function resolvePortalInvoiceLookupSource(input: {
  partyId: string | null;
  heuristicPartyIds: string[];
}): PortalInvoiceLookup["source"] {
  if (input.partyId) return "partyId";
  if (input.heuristicPartyIds.length === 1) return "heuristic_single";
  if (input.heuristicPartyIds.length > 1) return "heuristic_multiple";
  return "heuristic_none";
}

export type PortalResultItem = {
  id: string;
  kind: "LAB" | "RX_US";
  title: string;
  status: string;
  createdAt: Date;
  detail: string | null;
  fileAssetId: string | null;
};

function decimalToNumber(value: Prisma.Decimal | number) {
  return typeof value === "number" ? value : Number(value);
}

function fallbackOnMissingTable<T>(context: string, fallback: T) {
  return (error: unknown): T => {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable(context, error);
      return fallback;
    }
    throw error;
  };
}

function normalizeNullable(value?: string | null) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function getPersonDisplayNameFromSession(client: PortalSessionClient) {
  return getPortalPersonDisplayName({
    firstName: client.firstName,
    middleName: client.middleName,
    lastName: client.lastName,
    secondLastName: client.secondLastName
  });
}

async function findPortalPartyIdsByHeuristic(client: PortalSessionClient) {
  const conditions: Prisma.PartyWhereInput[] = [];
  const normalizedNit = normalizeNullable(client.nit);
  const normalizedEmail = normalizeNullable(client.email)?.toLowerCase();
  const normalizedPhone = normalizeNullable(client.phone)?.replace(/[^\d]/g, "");
  const personName = getPersonDisplayNameFromSession(client);

  if (normalizedNit) conditions.push({ nit: normalizedNit });
  if (normalizedEmail) conditions.push({ email: { equals: normalizedEmail, mode: "insensitive" } });
  if (normalizedPhone) conditions.push({ phone: { contains: normalizedPhone } });
  if (personName) conditions.push({ name: { contains: personName, mode: "insensitive" } });

  if (!conditions.length) return [];

  const parties = await prisma.party.findMany({
    where: { OR: conditions },
    select: { id: true },
    take: 30
  });
  return parties.map((party) => party.id);
}

async function safeLoadInvoicesByPartyIds(partyIds: string[]): Promise<PortalInvoiceItem[]> {
  if (!partyIds.length) return [];

  try {
    const rows = await prisma.receivable.findMany({
      where: { partyId: { in: partyIds } },
      orderBy: { date: "desc" },
      include: {
        party: { select: { name: true } },
        attachments: {
          select: {
            fileUrl: true,
            fileName: true,
            mimeType: true,
            sizeBytes: true
          }
        }
      },
      take: 50
    });

    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      dueDate: row.dueDate ?? null,
      amount: decimalToNumber(row.amount),
      paidAmount: decimalToNumber(row.paidAmount),
      status: row.status,
      reference: row.reference ?? null,
      partyName: row.party.name,
      attachments: row.attachments.map((attachment) => ({
        fileUrl: attachment.fileUrl,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes
      }))
    }));
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("portal.data.receivable.findMany", error);
      return [];
    }
    throw error;
  }
}

export async function getPortalDashboardSummary(client: PortalSessionClient): Promise<PortalDashboardSummary> {
  const now = new Date();
  const invoicesLookup = await getPortalInvoices(client);

  const [nextAppointment, upcomingAppointments, invoices, labRecentCount, diagnosticRecentCount] = await Promise.all([
    prisma.appointment.findFirst({
      where: { patientId: client.id, date: { gte: now } },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        status: true,
        type: { select: { name: true } }
      }
    }).catch(
      fallbackOnMissingTable<{
        id: string;
        date: Date;
        status: string;
        type: { name: string };
      } | null>("portal.data.appointment.findFirst", null)
    ),
    prisma.appointment.count({ where: { patientId: client.id, date: { gte: now } } }).catch(
      fallbackOnMissingTable<number>("portal.data.appointment.count", 0)
    ),
    Promise.resolve(invoicesLookup.items),
    prisma.labTestOrder.count({
      where: {
        patientId: client.id,
        createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
      }
    }).catch(fallbackOnMissingTable<number>("portal.data.labTestOrder.count", 0)),
    prisma.diagnosticOrder.count({
      where: {
        patientId: client.id,
        orderedAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
      }
    }).catch(fallbackOnMissingTable<number>("portal.data.diagnosticOrder.count", 0))
  ]);

  const pendingInvoices = invoices.filter((invoice) =>
    invoice.status === DocStatus.OPEN || invoice.status === DocStatus.PARTIAL
  ).length;

  return {
    nextAppointment: nextAppointment
      ? {
          id: nextAppointment.id,
          date: nextAppointment.date,
          status: nextAppointment.status,
          typeName: nextAppointment.type.name
        }
      : null,
    upcomingAppointments,
    pendingInvoices,
    recentResults: labRecentCount + diagnosticRecentCount,
    invoiceWarning: invoicesLookup.warning
  };
}

export async function getPortalAppointments(clientId: string): Promise<{
  upcoming: PortalAppointmentItem[];
  history: PortalAppointmentItem[];
}> {
  const now = new Date();

  const [upcomingRows, historyRows, visitRows] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId: clientId, date: { gte: now } },
      orderBy: { date: "asc" },
      take: 12,
      select: {
        id: true,
        date: true,
        durationMin: true,
        status: true,
        paymentStatus: true,
        notes: true,
        type: { select: { name: true } }
      }
    }).catch(
      fallbackOnMissingTable<
        Array<{
          id: string;
          date: Date;
          durationMin: number;
          status: string;
          paymentStatus: string;
          notes: string | null;
          type: { name: string };
        }>
      >("portal.data.appointment.upcoming.findMany", [])
    ),
    prisma.appointment.findMany({
      where: { patientId: clientId, date: { lt: now } },
      orderBy: { date: "desc" },
      take: 20,
      select: {
        id: true,
        date: true,
        durationMin: true,
        status: true,
        paymentStatus: true,
        notes: true,
        type: { select: { name: true } }
      }
    }).catch(
      fallbackOnMissingTable<
        Array<{
          id: string;
          date: Date;
          durationMin: number;
          status: string;
          paymentStatus: string;
          notes: string | null;
          type: { name: string };
        }>
      >("portal.data.appointment.history.findMany", [])
    ),
    prisma.visit.findMany({
      where: { patientId: clientId },
      orderBy: { arrivedAt: "desc" },
      take: 10,
      select: {
        id: true,
        arrivedAt: true,
        status: true,
        notes: true,
        currentArea: true,
        site: { select: { name: true } }
      }
    }).catch(
      fallbackOnMissingTable<
        Array<{
          id: string;
          arrivedAt: Date;
          status: string;
          notes: string | null;
          currentArea: string;
          site: { name: string };
        }>
      >("portal.data.visit.findMany", [])
    )
  ]);

  const upcoming = upcomingRows.map((row) => ({
    id: row.id,
    date: row.date,
    durationMin: row.durationMin,
    status: row.status,
    paymentStatus: row.paymentStatus,
    notes: row.notes ?? null,
    typeName: row.type.name,
    siteName: null,
    source: "APPOINTMENT" as const
  }));

  const historyAppointments = historyRows.map((row) => ({
    id: row.id,
    date: row.date,
    durationMin: row.durationMin,
    status: row.status,
    paymentStatus: row.paymentStatus,
    notes: row.notes ?? null,
    typeName: row.type.name,
    siteName: null,
    source: "APPOINTMENT" as const
  }));

  const historyVisits = visitRows.map((row) => ({
    id: row.id,
    date: row.arrivedAt,
    durationMin: 0,
    status: row.status,
    paymentStatus: "N/A",
    notes: row.notes ?? null,
    typeName: row.currentArea,
    siteName: row.site.name,
    source: "VISIT" as const
  }));

  const history = [...historyAppointments, ...historyVisits]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 24);

  return { upcoming, history };
}

export async function getPortalInvoices(client: PortalSessionClient): Promise<PortalInvoiceLookup> {
  const heuristicPartyIds = client.partyId ? [] : await findPortalPartyIdsByHeuristic(client);
  const source = resolvePortalInvoiceLookupSource({
    partyId: client.partyId,
    heuristicPartyIds
  });

  if (source === "partyId") {
    const linkedPartyId = client.partyId as string;
    const byPartyId = await safeLoadInvoicesByPartyIds([linkedPartyId]);
    return {
      items: byPartyId,
      warning: null,
      source: "partyId"
    };
  }

  if (source === "heuristic_single") {
    const items = await safeLoadInvoicesByPartyIds(heuristicPartyIds);
    return {
      items,
      warning: "Facturas no verificadas. Solicita validación de tu perfil para confirmar vinculación financiera.",
      source: "heuristic_single"
    };
  }

  if (source === "heuristic_multiple") {
    return {
      items: [],
      warning: "Se detectaron múltiples coincidencias de facturación. Solicita validación para evitar mostrar datos de terceros.",
      source: "heuristic_multiple"
    };
  }

  return {
    items: [],
    warning: "No se encontró vinculación de facturación verificada para este perfil.",
    source: "heuristic_none"
  };
}

export async function getPortalResults(clientId: string): Promise<{
  lab: PortalResultItem[];
  imaging: PortalResultItem[];
}> {
  const [labRows, diagnosticRows] = await Promise.all([
    prisma.labTestOrder.findMany({
      where: { patientId: clientId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        code: true,
        status: true,
        createdAt: true,
        sentAt: true,
        resultFileAssetId: true,
        items: {
          select: {
            name: true
          },
          take: 3
        }
      }
    }).catch(
      fallbackOnMissingTable<
        Array<{
          id: string;
          code: string;
          status: string;
          createdAt: Date;
          sentAt: Date | null;
          resultFileAssetId: string | null;
          items: Array<{ name: string }>;
        }>
      >("portal.data.labTestOrder.findMany", [])
    ),
    prisma.diagnosticOrder.findMany({
      where: { patientId: clientId },
      orderBy: { orderedAt: "desc" },
      take: 30,
      select: {
        id: true,
        status: true,
        adminStatus: true,
        orderedAt: true,
        resultFileAssetId: true,
        items: {
          select: {
            kind: true,
            status: true,
            catalogItem: { select: { name: true } }
          },
          take: 3
        }
      }
    }).catch(
      fallbackOnMissingTable<
        Array<{
          id: string;
          status: string;
          adminStatus: string;
          orderedAt: Date;
          resultFileAssetId: string | null;
          items: Array<{ kind: string; status: string; catalogItem: { name: string } }>;
        }>
      >("portal.data.diagnosticOrder.findMany", [])
    )
  ]);

  const lab = labRows.map((row) => ({
    id: row.id,
    kind: "LAB" as const,
    title: row.code || `Orden ${row.id.slice(-6).toUpperCase()}`,
    status: row.status,
    createdAt: row.createdAt,
    detail: row.items.map((item) => item.name).join(", ") || null,
    fileAssetId: row.resultFileAssetId ?? null
  }));

  const imaging = diagnosticRows.map((row) => ({
    id: row.id,
    kind: "RX_US" as const,
    title: `Orden diagnóstica ${row.id.slice(-6).toUpperCase()}`,
    status: `${row.status} / ${row.adminStatus}`,
    createdAt: row.orderedAt,
    detail:
      row.items.map((item) => `${item.catalogItem.name} (${item.kind})`).join(", ") ||
      "Sin detalle de ítems",
    fileAssetId: row.resultFileAssetId ?? null
  }));

  return { lab, imaging };
}

export function toPortalSessionClient(client: PortalPersonIdentity): PortalSessionClient {
  return {
    id: client.id,
    type: client.type,
    firstName: client.firstName,
    middleName: client.middleName,
    lastName: client.lastName,
    secondLastName: client.secondLastName,
    companyName: null,
    dpi: client.dpi,
    nit: client.nit,
    partyId: client.partyId,
    email: client.email,
    phone: client.phone,
    address: client.address,
    city: client.city,
    department: client.department,
    country: client.country,
    photoUrl: client.photoUrl
  };
}
