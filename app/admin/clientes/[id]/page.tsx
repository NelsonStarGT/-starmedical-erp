import Link from "next/link";
import { cookies } from "next/headers";
import { ClientCatalogType, ClientProfileType, Prisma } from "@prisma/client";
import { Building2, Landmark, Shield, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { getSessionUserFromCookies } from "@/lib/auth";
import { CLIENT_TYPE_LABELS } from "@/lib/clients/constants";
import { formatDateForClients } from "@/lib/clients/dateFormat";
import { getClientsDateFormat } from "@/lib/clients/dateFormatConfig";
import { safeGetClientRulesConfig } from "@/lib/clients/rulesConfig";
import {
  buildClientProfileSelect,
  readClientProfilePhotoFields,
  safeSupportsClientProfilePhotoColumns
} from "@/lib/clients/clientProfileSchema";
import { resolveClientIdFromRef } from "@/lib/clients/detailResolver";
import { getClientDocumentPermissions } from "@/lib/clients/permissions";
import {
  getClientCompletenessScore,
  getClientMissingRequiredFields,
  type ClientCompletenessSnapshot
} from "@/lib/clients/completeness";
import { buildRequiredDocumentsChecklist, warnDevMissingRequiredDocsDelegate } from "@/lib/clients/requiredDocuments";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import ClientBasicsEditor from "@/components/clients/portal/ClientBasicsEditor";
import ClientAffiliationsPanel from "@/components/clients/portal/ClientAffiliationsPanel";
import ClientDocumentsPanel from "@/components/clients/portal/ClientDocumentsPanel";
import ClientLocationsPanel from "@/components/clients/portal/ClientLocationsPanel";
import ClientContactsPanel from "@/components/clients/portal/ClientContactsPanel";
import ClientNotesPanel from "@/components/clients/portal/ClientNotesPanel";
import ClientActivityTimelinePanel from "@/components/clients/portal/ClientActivityTimelinePanel";
import { ClientArchiveAction } from "@/components/clients/ClientArchiveAction";
import ClientIdentityCard from "@/components/clients/ClientIdentityCard";
import { tenantIdFromUser } from "@/lib/tenant";

type SearchParams = { tab?: string | string[] };

const TABS: Array<{ key: string; label: string; show?: (type: ClientProfileType) => boolean }> = [
  { key: "resumen", label: "Resumen" },
  { key: "afiliaciones", label: "Afiliaciones", show: (type) => type === ClientProfileType.PERSON },
  { key: "documentos", label: "Documentos" },
  { key: "ubicaciones", label: "Ubicaciones" },
  { key: "contactos", label: "Contactos" },
  { key: "relaciones", label: "Relaciones / Convenios" },
  { key: "empleados", label: "Empleados asociados", show: (type) => type !== ClientProfileType.PERSON },
  { key: "notas", label: "Notas / Historial" },
  { key: "actividad", label: "Actividad" }
];

type RequiredDocRuleRow = Prisma.ClientRequiredDocumentRuleGetPayload<{
  select: {
    id: true;
    clientType: true;
    documentTypeId: true;
    isRequired: true;
    requiresApproval: true;
    requiresExpiry: true;
    weight: true;
    isActive: true;
    documentType: { select: { name: true } };
  };
}>;

type RequiredDocRulesDelegate = {
  findMany?: (args: Prisma.ClientRequiredDocumentRuleFindManyArgs) => Promise<RequiredDocRuleRow[]>;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function tabHref(clientId: string, tabKey: string) {
  const params = new URLSearchParams();
  params.set("tab", tabKey);
  return `/admin/clientes/${clientId}?${params.toString()}`;
}

function getDisplayName(client: {
  type: ClientProfileType;
  firstName: string | null;
  middleName: string | null;
  thirdName?: string | null;
  lastName: string | null;
  secondLastName: string | null;
  thirdLastName?: string | null;
  companyName: string | null;
  tradeName: string | null;
}) {
  if (client.type === ClientProfileType.PERSON) {
    return (
      [client.firstName, client.middleName, client.thirdName, client.lastName, client.secondLastName, client.thirdLastName]
        .filter(Boolean)
        .join(" ") || "Persona"
    );
  }
  return client.companyName || client.tradeName || "Cliente";
}

function getEntityLabel(client: {
  type: ClientProfileType;
  companyName: string | null;
  tradeName: string | null;
  nit: string | null;
  firstName?: string | null;
  middleName?: string | null;
  thirdName?: string | null;
  lastName?: string | null;
  secondLastName?: string | null;
  thirdLastName?: string | null;
  dpi?: string | null;
}) {
  if (client.type === ClientProfileType.PERSON) {
    const fullName = [client.firstName, client.middleName, client.thirdName, client.lastName, client.secondLastName, client.thirdLastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (fullName) return `Interno · ${fullName}`;
    return client.dpi ? `Interno · DPI ${client.dpi}` : "Interno";
  }

  const name = client.companyName || client.tradeName || "Cliente";
  return client.nit ? `${name} · NIT ${client.nit}` : name;
}

function firstValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isPrismaSchemaMismatchError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (code === "P2022") return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("unknown field") ||
    message.includes("unknown argument") ||
    message.includes("unknown arg") ||
    (message.includes("column") && message.includes("does not exist"))
  );
}

function warnDevClientsCompat(context: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  const message = error instanceof Error ? error.message : String(error);
  console.warn(
    `[DEV][clients] ${context}: fallback por schema mismatch. ` +
      "Ejecuta `npm run db:migrate:deploy` y `npm run db:generate`. " +
      `Details: ${message}`
  );
}

async function safeSupportsClientContactExtendedColumns(context = "clients.detail.contacts.columns"): Promise<boolean> {
  try {
    await prisma.clientContact.findFirst({
      select: {
        id: true,
        relationType: true,
        linkedPersonClientId: true,
        isEmergencyContact: true
      }
    });
    return true;
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable(`${context}.clientContact.findFirst`, error);
      return false;
    }
    if (isPrismaSchemaMismatchError(error)) {
      warnDevClientsCompat(`${context}.clientContact.findFirst`, error);
      return false;
    }
    throw error;
  }
}

async function safeSupportsClientNoteExtendedColumns(context = "clients.detail.notes.columns"): Promise<boolean> {
  try {
    await prisma.clientNote.findFirst({
      select: {
        id: true,
        title: true,
        noteType: true,
        visibility: true
      }
    });
    return true;
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable(`${context}.clientNote.findFirst`, error);
      return false;
    }
    if (isPrismaSchemaMismatchError(error)) {
      warnDevClientsCompat(`${context}.clientNote.findFirst`, error);
      return false;
    }
    throw error;
  }
}

async function safeRequiredDocRulesFindMany(args: Prisma.ClientRequiredDocumentRuleFindManyArgs): Promise<RequiredDocRuleRow[]> {
  const delegate = (prisma as unknown as { clientRequiredDocumentRule?: RequiredDocRulesDelegate }).clientRequiredDocumentRule;
  if (!delegate?.findMany) {
    warnDevMissingRequiredDocsDelegate("clients.detail.requiredDocs.rules.findMany");
    return [];
  }

  try {
    return await delegate.findMany(args);
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      warnDevMissingTable("clients.detail.requiredDocs.rules.findMany", error);
      return [];
    }
    throw error;
  }
}

function translateTimelineAction(action: string) {
  const map: Record<string, string> = {
    CLIENT_PROFILE_SOFT_DELETED: "Cliente archivado",
    CLIENT_PROFILE_RESTORED: "Cliente restaurado",
    CLIENT_PROFILE_SOFT_DELETED_BULK: "Cliente archivado (masivo)",
    CLIENT_PROFILE_RESTORED_BULK: "Cliente restaurado (masivo)",
    CLIENT_STATUS_UPDATED_BULK: "Estado actualizado (masivo)",
    CLIENT_DOCUMENT_ADDED: "Documento agregado",
    CLIENT_DOCUMENT_UPDATED: "Documento actualizado",
    CLIENT_DOCUMENT_APPROVED: "Documento aprobado",
    CLIENT_DOCUMENT_REJECTED: "Documento rechazado",
    CLIENT_DOCUMENT_VERSION_CREATED: "Nueva versión de documento",
    CLIENT_DOCUMENT_SUPERSEDED: "Documento reemplazado",
    CLIENT_AFFILIATION_CREATED: "Afiliación creada",
    CLIENT_AFFILIATION_UPDATED: "Afiliación actualizada",
    CLIENT_AFFILIATION_DELETED: "Afiliación eliminada",
    CLIENT_CONTACT_ADDED: "Contacto agregado",
    CLIENT_NOTE_ADDED: "Nota agregada",
    CLIENT_LOCATION_ADDED: "Ubicación agregada"
  };
  return map[action] ?? action;
}

function MissingClientState({ clientRef }: { clientRef?: string }) {
  const normalized = clientRef?.trim() || "";
  const encoded = normalized ? encodeURIComponent(normalized) : "";
  const personasHref = normalized ? `/admin/clientes/personas?error=not_found&q=${encoded}` : "/admin/clientes/personas";
  const empresasHref = normalized ? `/admin/clientes/empresas?error=not_found&q=${encoded}` : "/admin/clientes/empresas";
  const buscarHref = normalized ? `/admin/clientes/buscar?q=${encoded}` : "/admin/clientes/buscar";

  return (
    <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2e75ba]">Clientes</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
        Cliente no encontrado
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {normalized
          ? `No encontramos un perfil para “${normalized}”. Verifica el identificador o usa la búsqueda del módulo.`
          : "No se pudo resolver el identificador del cliente."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={buscarHref}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
        >
          Buscar cliente
        </Link>
        <Link
          href={personasHref}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
        >
          Ver personas
        </Link>
        <Link
          href={empresasHref}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
        >
          Ver empresas
        </Link>
      </div>
    </section>
  );
}

export default async function ClientePortalPage({
  params,
  searchParams
}: {
  // Next 16 entrega params/searchParams como Promise en App Router.
  // Mantener union permite compatibilidad con tests/composición local.
  params: Promise<{ id?: string }> | { id?: string };
  searchParams?: Promise<SearchParams | undefined> | SearchParams;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const clientRef = resolvedParams.id?.trim();
  const tab = firstValue(resolvedSearchParams?.tab) ?? "resumen";

  if (!clientRef) {
    return <MissingClientState />;
  }

  const resolvedClientId = await resolveClientIdFromRef(clientRef);
  if (!resolvedClientId) {
    return <MissingClientState clientRef={clientRef} />;
  }

  const supportsPhotoColumns = await safeSupportsClientProfilePhotoColumns("clients.detail");
  const clientSelect = buildClientProfileSelect(supportsPhotoColumns);
  const client = await prisma.clientProfile.findFirst({
    where: { id: resolvedClientId, deletedAt: null },
    select: clientSelect
  });
  if (!client) {
    return <MissingClientState clientRef={clientRef} />;
  }
  const { photoUrl, photoAssetId } = readClientProfilePhotoFields(client);
  const clientId = client.id;

  const now = new Date();
  const todayStart = startOfDay(now);
  const expiringUntil = addDays(todayStart, 30);

  const snapshot: ClientCompletenessSnapshot = {
    type: client.type,
    firstName: client.firstName,
    middleName: client.middleName,
    lastName: client.lastName,
    secondLastName: client.secondLastName,
    dpi: client.dpi,
    phone: client.phone,
    companyName: client.companyName,
    tradeName: client.tradeName,
    nit: client.nit,
    address: client.address,
    city: client.city,
    department: client.department,
    institutionTypeId: client.institutionTypeId
  };

  const displayName = getDisplayName(client);
  const missingFields = getClientMissingRequiredFields(snapshot);

  const [docsExpiredCount, docsExpiringCount, statusOptions, institutionTypeOptions, documentTypeOptions, rulesConfig, requiredRulesRows] =
    await Promise.all([
    prisma.clientDocument.count({ where: { clientId, supersededAt: null, expiresAt: { lt: todayStart } } }),
    prisma.clientDocument.count({
      where: {
        clientId,
        supersededAt: null,
        expiresAt: { gte: todayStart, lte: expiringUntil }
      }
    }),
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.CLIENT_STATUS, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    }),
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.INSTITUTION_TYPE, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    }),
    prisma.clientCatalogItem.findMany({
      where: { type: ClientCatalogType.DOCUMENT_TYPE, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    }),
    safeGetClientRulesConfig("clients.detail"),
    safeRequiredDocRulesFindMany({
      where: { clientType: client.type, isActive: true, isRequired: true },
      orderBy: { documentType: { name: "asc" } },
      select: {
        id: true,
        clientType: true,
        documentTypeId: true,
        isRequired: true,
        requiresApproval: true,
        requiresExpiry: true,
        weight: true,
        isActive: true,
        documentType: { select: { name: true } }
      }
    })
  ]);

  const requiredDocTypeIds = requiredRulesRows.map((rule) => rule.documentTypeId);
  const requiredDocsRows = requiredDocTypeIds.length
    ? await prisma.clientDocument.findMany({
        where: {
          clientId,
          supersededAt: null,
          documentTypeId: { in: requiredDocTypeIds }
        },
        select: {
          id: true,
          documentTypeId: true,
          title: true,
          fileUrl: true,
          fileAssetId: true,
          approvalStatus: true,
          expiresAt: true,
          createdAt: true,
          rejectionReason: true
        }
      })
    : [];

  const requiredChecklist = buildRequiredDocumentsChecklist({
    rules: requiredRulesRows.map((rule) => ({
      id: rule.id,
      clientType: rule.clientType,
      documentTypeId: rule.documentTypeId,
      documentTypeName: rule.documentType.name,
      isRequired: rule.isRequired,
      requiresApproval: rule.requiresApproval,
      requiresExpiry: rule.requiresExpiry,
      weight: rule.weight,
      isActive: rule.isActive
    })),
    documents: requiredDocsRows.map((doc) => ({
      id: doc.id,
      documentTypeId: doc.documentTypeId,
      title: doc.title,
      fileUrl: doc.fileUrl ?? null,
      fileAssetId: doc.fileAssetId ?? null,
      approvalStatus: doc.approvalStatus,
      expiresAt: doc.expiresAt ?? null,
      createdAt: doc.createdAt,
      rejectionReason: doc.rejectionReason ?? null
    })),
    now
  });

  const healthScore = getClientCompletenessScore(snapshot, {
    documents: {
      requiredTotal: requiredChecklist.summary.requiredTotal,
      approvedAndValid: requiredChecklist.summary.approvedAndValid,
      rejectedOrMissing: requiredChecklist.summary.rejectedOrMissing
    },
    weights: {
      profile: rulesConfig.healthProfileWeight,
      documents: rulesConfig.healthDocsWeight
    }
  });
  const isIncomplete = healthScore < 100;
  const currentUser = await getSessionUserFromCookies(cookies());
  const dateFormat = await getClientsDateFormat(tenantIdFromUser(currentUser));
  const docPermissions = getClientDocumentPermissions(currentUser);
  const referralSummary = await (async () => {
    try {
      const [referredByEdge, generatedEdges] = await Promise.all([
        prisma.clientReferral.findFirst({
          where: { referredClientId: clientId },
          orderBy: { createdAt: "asc" },
          select: {
            referrerClient: {
              select: {
                id: true,
                type: true,
                companyName: true,
                tradeName: true,
                nit: true,
                firstName: true,
                middleName: true,
                lastName: true,
                secondLastName: true,
                dpi: true,
                deletedAt: true
              }
            }
          }
        }),
        prisma.clientReferral.findMany({
          where: { referrerClientId: clientId },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            createdAt: true,
            referredClient: {
              select: {
                id: true,
                type: true,
                companyName: true,
                tradeName: true,
                nit: true,
                firstName: true,
                middleName: true,
                lastName: true,
                secondLastName: true,
                dpi: true
              }
            }
          }
        })
      ]);

      const referredBy = referredByEdge?.referrerClient
        ? {
            id: referredByEdge.referrerClient.id,
            label: getEntityLabel(referredByEdge.referrerClient),
            archived: Boolean(referredByEdge.referrerClient.deletedAt)
          }
        : null;

      return {
        source: "live" as const,
        referredBy,
        generated: generatedEdges.map((edge) => ({
          id: edge.id,
          createdAt: edge.createdAt,
          clientId: edge.referredClient.id,
          label: getEntityLabel(edge.referredClient)
        }))
      };
    } catch (error) {
      if (isPrismaMissingTableError(error)) {
        warnDevMissingTable("clients.detail.referrals", error);
        return { source: "compat" as const, referredBy: null, generated: [] as Array<{ id: string; createdAt: Date; clientId: string; label: string }> };
      }
      throw error;
    }
  })();

  const Icon =
    client.type === ClientProfileType.PERSON
      ? UserRound
      : client.type === ClientProfileType.COMPANY
        ? Building2
        : client.type === ClientProfileType.INSURER
          ? Shield
          : Landmark;

  const visibleTabs = TABS.filter((item) => {
    if (item.key === "documentos" && !docPermissions.canViewDocs) return false;
    return item.show ? item.show(client.type) : true;
  });
  const activeTab = visibleTabs.some((t) => t.key === tab) ? tab : "resumen";
  const [supportsContactExtendedColumns, supportsNoteExtendedColumns] = await Promise.all([
    activeTab === "contactos" ? safeSupportsClientContactExtendedColumns("clients.detail") : Promise.resolve(false),
    activeTab === "notas" ? safeSupportsClientNoteExtendedColumns("clients.detail") : Promise.resolve(false)
  ]);

  const documentsData =
    activeTab === "documentos"
      ? await prisma.clientDocument.findMany({
          where: { clientId },
          orderBy: { createdAt: "desc" },
          take: 80,
          select: {
            id: true,
            title: true,
            documentTypeId: true,
            fileAssetId: true,
            createdAt: true,
            expiresAt: true,
            fileUrl: true,
            originalName: true,
            approvalStatus: true,
            approvedAt: true,
            rejectedAt: true,
            rejectionReason: true,
            version: true,
            supersededAt: true,
            supersededByDocumentId: true,
            documentType: { select: { name: true } }
          }
        })
      : [];

  const documentHistoryRows =
    activeTab === "documentos" && documentsData.length
      ? await prisma.auditLog.findMany({
          where: {
            entityType: "ClientDocument",
            entityId: { in: documentsData.map((doc) => doc.id) }
          },
          orderBy: { timestamp: "desc" },
          take: 300,
          select: {
            id: true,
            entityId: true,
            action: true,
            timestamp: true,
            metadata: true,
            actorUser: { select: { name: true, email: true } }
          }
        })
      : [];

  const documentHistoryById = documentHistoryRows.reduce<
    Record<string, Array<{ id: string; action: string; timestamp: string; actorLabel: string | null; metadata: unknown }>>
  >((acc, row) => {
    const actorLabel = row.actorUser?.name ?? row.actorUser?.email ?? null;
    const current = acc[row.entityId] ?? [];
    current.push({
      id: row.id,
      action: row.action,
      timestamp: row.timestamp.toISOString(),
      actorLabel,
      metadata: row.metadata
    });
    acc[row.entityId] = current;
    return acc;
  }, {});

  const clientTimelineRows =
    activeTab === "actividad"
      ? await prisma.clientAuditEvent.findMany({
          where: { clientId },
          orderBy: { timestamp: "desc" },
          take: 60,
          select: {
            id: true,
            timestamp: true,
            action: true,
            metadata: true,
            actorRole: true,
            actorUser: { select: { name: true, email: true } }
          }
        })
      : [];

  const legacyTimelineRows =
    activeTab === "actividad" && !clientTimelineRows.length
      ? await prisma.auditLog.findMany({
          where: { entityType: "ClientProfile", entityId: clientId },
          orderBy: { timestamp: "desc" },
          take: 60,
          select: {
            id: true,
            timestamp: true,
            action: true,
            metadata: true,
            actorRole: true,
            actorUser: { select: { name: true, email: true } }
          }
        })
      : [];

  const activityTimeline = (clientTimelineRows.length
    ? clientTimelineRows.map((row) => ({
        id: row.id,
        timestamp: row.timestamp,
        action: row.action,
        metadata: row.metadata,
        actorRole: row.actorRole,
        actorLabel: row.actorUser?.name ?? row.actorUser?.email ?? "Sistema"
      }))
    : legacyTimelineRows.map((row) => ({
        id: row.id,
        timestamp: row.timestamp,
        action: row.action,
        metadata: row.metadata,
        actorRole: row.actorRole,
        actorLabel: row.actorUser?.name ?? row.actorUser?.email ?? "Sistema"
      }))).slice(0, 50);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-diagnostics-corporate">
              {CLIENT_TYPE_LABELS[client.type]}
            </p>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-diagnostics-background p-3 text-diagnostics-primary">
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
                  {displayName}
                </h1>
                <p className="text-sm text-slate-600">
                  {client.status?.name ? `Estado: ${client.status.name}` : "Sin estado"} · Creado{" "}
                  {formatDateForClients(client.createdAt, dateFormat)}
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-[260px] space-y-2">
            <div className="rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Health score</p>
                <p className="text-sm font-semibold text-slate-900">{healthScore}%</p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-[#4aa59c]" style={{ width: `${healthScore}%` }} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isIncomplete && (
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  Perfil incompleto
                </span>
              )}
              {requiredChecklist.summary.pendingCount > 0 && (
                <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
                  {requiredChecklist.summary.pendingCount} requeridos pendientes
                </span>
              )}
              {requiredChecklist.summary.rejectedCount > 0 && (
                <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  {requiredChecklist.summary.rejectedCount} requeridos rechazados
                </span>
              )}
              {requiredChecklist.summary.expiredCount > 0 && (
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  {requiredChecklist.summary.expiredCount} requeridos vencidos
                </span>
              )}
              {docsExpiredCount > 0 && (
                <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  {docsExpiredCount} docs vencidos
                </span>
              )}
              {docsExpiredCount === 0 && docsExpiringCount > 0 && (
                <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
                  {docsExpiringCount} docs por vencer (30d)
                </span>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <ClientArchiveAction clientId={client.id} redirectAfterArchive />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {visibleTabs.map((item) => (
            <Link
              key={item.key}
              href={tabHref(client.id, item.key)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                item.key === activeTab
                  ? "border-diagnostics-corporate bg-diagnostics-corporate text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-diagnostics-background hover:text-diagnostics-corporate"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {activeTab === "resumen" && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Datos del cliente</p>
            <ClientIdentityCard
              className="mt-4"
              displayName={displayName}
              firstName={client.firstName}
              middleName={client.middleName}
              lastName={client.lastName}
              secondLastName={client.secondLastName}
              dpi={client.dpi}
              nit={client.nit}
              email={client.email}
              phone={client.phone}
            />
            <div className="mt-4">
              <ClientBasicsEditor
                client={{
                  id: client.id,
                  type: client.type,
                  firstName: client.firstName,
                  middleName: client.middleName,
                  lastName: client.lastName,
                  secondLastName: client.secondLastName,
                  dpi: client.dpi,
                  companyName: client.companyName,
                  tradeName: client.tradeName,
                  institutionTypeId: client.institutionTypeId,
                  nit: client.nit,
                  phone: client.phone,
                  phoneE164: client.phoneE164,
                  email: client.email,
                  address: client.address,
                  city: client.city,
                  department: client.department,
                  country: client.country,
                  photoUrl,
                  photoAssetId,
                  statusId: client.statusId
                }}
                statusOptions={statusOptions}
                institutionTypeOptions={institutionTypeOptions}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Alertas operativas</p>

            {healthScore < 100 && (
              <div className="rounded-xl border border-[#4aadf5]/40 bg-[#f1f8ff] px-4 py-3 text-sm text-[#2e75ba]">
                Health score en <span className="font-semibold">{healthScore}%</span>. Completa campos y documentos requeridos para llegar a
                100%.
              </div>
            )}

            {missingFields.length ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">Campos faltantes</p>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {missingFields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-diagnostics-background px-4 py-3 text-sm text-slate-700">
                Información mínima completa.
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Documentos</p>
              <p className="mt-1">
                Vencidos: <span className="font-semibold">{docsExpiredCount}</span> · Por vencer (30d):{" "}
                <span className="font-semibold">{docsExpiringCount}</span>
              </p>
              {requiredChecklist.summary.requiredTotal > 0 && (
                <p className="mt-1">
                  Requeridos pendientes: <span className="font-semibold">{requiredChecklist.summary.pendingCount}</span> · Rechazados:{" "}
                  <span className="font-semibold">{requiredChecklist.summary.rejectedCount}</span> · Vencidos:{" "}
                  <span className="font-semibold">{requiredChecklist.summary.expiredCount}</span>
                </p>
              )}
              {docPermissions.canViewDocs && (
                <Link
                  href={tabHref(client.id, "documentos")}
                  className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-diagnostics-secondary hover:text-diagnostics-corporate"
                >
                  Ir a documentos
                </Link>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Referidos</p>
              {referralSummary.source === "compat" ? (
                <p className="mt-1 text-xs text-slate-500">No disponible (migración pendiente).</p>
              ) : (
                <>
                  <p className="mt-1">
                    Referido por:{" "}
                    {referralSummary.referredBy ? (
                      <Link
                        href={`/admin/clientes/${referralSummary.referredBy.id}`}
                        className="font-semibold text-[#2e75ba] hover:text-[#4aadf5]"
                      >
                        {referralSummary.referredBy.label}
                        {referralSummary.referredBy.archived ? " (archivado)" : ""}
                      </Link>
                    ) : (
                      "Sin referido"
                    )}
                  </p>
                  <p className="mt-1">Referidos generados: <span className="font-semibold">{referralSummary.generated.length}</span></p>
                  {referralSummary.generated.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {referralSummary.generated.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2 py-1">
                          <span className="truncate text-xs text-slate-700">{item.label}</span>
                          <Link
                            href={`/admin/clientes/${item.clientId}`}
                            className="text-xs font-semibold text-[#2e75ba] hover:text-[#4aadf5]"
                          >
                            Ver ficha
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === "afiliaciones" && (
        <ClientAffiliationsPanel
          clientId={client.id}
          affiliations={(await prisma.clientAffiliation.findMany({
            where: { personClientId: clientId, deletedAt: null },
            orderBy: [{ isPrimaryPayer: "desc" }, { status: "asc" }, { createdAt: "desc" }],
            select: {
              id: true,
              entityType: true,
              role: true,
              status: true,
              payerType: true,
              payerClientId: true,
              isPrimaryPayer: true,
              entity: {
                select: {
                  id: true,
                  type: true,
                  companyName: true,
                  tradeName: true,
                  nit: true,
                  firstName: true,
                  middleName: true,
                  lastName: true,
                  secondLastName: true,
                  dpi: true
                }
              },
              payerClient: {
                select: {
                  id: true,
                  type: true,
                  companyName: true,
                  tradeName: true,
                  nit: true,
                  firstName: true,
                  middleName: true,
                  lastName: true,
                  secondLastName: true,
                  dpi: true
                }
              }
            }
          })).map((aff) => ({
            id: aff.id,
            entityId: aff.entity.id,
            entityType: aff.entityType,
            entityLabel: getEntityLabel(aff.entity),
            role: aff.role,
            status: aff.status,
            payerType: aff.payerType,
            payerClientId: aff.payerClientId,
            payerLabel: aff.payerClient ? getEntityLabel(aff.payerClient) : null,
            isPrimaryPayer: aff.isPrimaryPayer
          }))}
        />
      )}

      {activeTab === "documentos" && (
        <ClientDocumentsPanel
          clientId={client.id}
          documents={documentsData.map((doc) => ({
            id: doc.id,
            title: doc.title,
            documentTypeId: doc.documentTypeId ?? null,
            documentTypeName: doc.documentType?.name ?? null,
            expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
            fileUrl: doc.fileUrl ?? null,
            fileAssetId: doc.fileAssetId ?? null,
            originalName: doc.originalName ?? null,
            createdAt: doc.createdAt.toISOString(),
            approvalStatus: doc.approvalStatus,
            approvedAt: doc.approvedAt ? doc.approvedAt.toISOString() : null,
            rejectedAt: doc.rejectedAt ? doc.rejectedAt.toISOString() : null,
            rejectionReason: doc.rejectionReason ?? null,
            version: doc.version,
            supersededAt: doc.supersededAt ? doc.supersededAt.toISOString() : null,
            supersededByDocumentId: doc.supersededByDocumentId ?? null
          }))}
          historyByDocument={documentHistoryById}
          requiredChecklist={requiredChecklist.items.map((item) => ({
            ruleId: item.ruleId,
            documentTypeId: item.documentTypeId,
            documentTypeName: item.documentTypeName,
            status: item.status,
            weight: item.weight,
            requiresApproval: item.requiresApproval,
            requiresExpiry: item.requiresExpiry,
            matchedDocumentId: item.matchedDocumentId,
            matchedDocumentTitle: item.matchedDocumentTitle,
            matchedApprovalStatus: item.matchedApprovalStatus,
            matchedExpiresAt: item.matchedExpiresAt ? item.matchedExpiresAt.toISOString() : null,
            matchedRejectionReason: item.matchedRejectionReason
          }))}
          documentTypeOptions={documentTypeOptions}
          canViewDocs={docPermissions.canViewDocs}
          canEditDocs={docPermissions.canEditDocs}
          canApproveDocs={docPermissions.canApproveDocs}
        />
      )}

      {activeTab === "ubicaciones" && (
        <ClientLocationsPanel
          clientId={client.id}
          locations={(await prisma.clientLocation.findMany({
            where: { clientId },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
            select: {
              id: true,
              type: true,
              label: true,
              address: true,
              postalCode: true,
              city: true,
              department: true,
              country: true,
              isPrimary: true
            }
          })).map((loc) => ({
            id: loc.id,
            type: loc.type,
            label: loc.label,
            address: loc.address,
            postalCode: loc.postalCode,
            city: loc.city,
            department: loc.department,
            country: loc.country,
            isPrimary: loc.isPrimary
          }))}
        />
      )}

      {activeTab === "contactos" && (
        <ClientContactsPanel
          clientId={client.id}
          contacts={
            supportsContactExtendedColumns
              ? (
                  await prisma.clientContact.findMany({
                    where: { clientId },
                    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
                    select: {
                      id: true,
                      name: true,
                      relationType: true,
                      role: true,
                      email: true,
                      phone: true,
                      isEmergencyContact: true,
                      isPrimary: true,
                      linkedPersonClientId: true,
                      linkedPerson: {
                        select: {
                          id: true,
                          type: true,
                          companyName: true,
                          tradeName: true,
                          nit: true,
                          firstName: true,
                          middleName: true,
                          lastName: true,
                          secondLastName: true,
                          dpi: true
                        }
                      }
                    }
                  })
                ).map((contact) => ({
                  id: contact.id,
                  name: contact.name,
                  relationType: contact.relationType,
                  role: contact.role,
                  email: contact.email,
                  phone: contact.phone,
                  isEmergencyContact: contact.isEmergencyContact,
                  isPrimary: contact.isPrimary,
                  linkedPersonClientId: contact.linkedPersonClientId,
                  linkedPersonLabel: contact.linkedPerson ? getEntityLabel(contact.linkedPerson) : null
                }))
              : (
                  await prisma.clientContact.findMany({
                    where: { clientId },
                    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
                    select: { id: true, name: true, role: true, email: true, phone: true, isPrimary: true }
                  })
                ).map((contact) => ({
                  id: contact.id,
                  name: contact.name,
                  relationType: "OTHER",
                  role: contact.role,
                  email: contact.email,
                  phone: contact.phone,
                  isEmergencyContact: false,
                  isPrimary: contact.isPrimary,
                  linkedPersonClientId: null,
                  linkedPersonLabel: null
                }))
          }
        />
      )}

      {activeTab === "notas" && (
        <ClientNotesPanel
          clientId={client.id}
          notes={
            supportsNoteExtendedColumns
              ? (
                  await prisma.clientNote.findMany({
                    where: { clientId },
                    orderBy: { createdAt: "desc" },
                    take: 50,
                    select: {
                      id: true,
                      title: true,
                      body: true,
                      noteType: true,
                      visibility: true,
                      createdAt: true,
                      actor: { select: { name: true, email: true } }
                    }
                  })
                ).map((note) => ({
                  id: note.id,
                  title: note.title,
                  body: note.body,
                  noteType: note.noteType,
                  visibility: note.visibility,
                  createdAt: note.createdAt.toISOString(),
                  actorLabel: note.actor?.name ?? note.actor?.email ?? null
                }))
              : (
                  await prisma.clientNote.findMany({
                    where: { clientId },
                    orderBy: { createdAt: "desc" },
                    take: 50,
                    select: {
                      id: true,
                      body: true,
                      createdAt: true,
                      actor: { select: { name: true, email: true } }
                    }
                  })
                ).map((note) => ({
                  id: note.id,
                  title: null,
                  body: note.body,
                  noteType: "ADMIN",
                  visibility: "INTERNA",
                  createdAt: note.createdAt.toISOString(),
                  actorLabel: note.actor?.name ?? note.actor?.email ?? null
                }))
          }
        />
      )}

      {activeTab === "relaciones" && (
        <EmptyState
          title="Relaciones / Convenios"
          description="Aquí se centralizarán reglas comerciales: descuentos, convenios, responsables de facturación y vigencias por cliente. Se deja el espacio listo para la siguiente iteración funcional."
        />
      )}

      {activeTab === "empleados" && (
        <EmptyState
          title="Empleados asociados"
          description="Asociación de empleados se habilita para empresas e instituciones. Aquí se listarán y gestionarán dependencias sin mezclar finanzas."
        />
      )}

      {activeTab === "actividad" && (
        <ClientActivityTimelinePanel
          entries={activityTimeline.map((entry) => ({
            id: entry.id,
            timestamp: entry.timestamp.toISOString(),
            action: entry.action,
            actionLabel: translateTimelineAction(entry.action),
            actorRole: entry.actorRole,
            actorLabel: entry.actorLabel,
            metadata:
              entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata)
                ? (entry.metadata as Record<string, unknown>)
                : null
          }))}
        />
      )}
    </div>
  );
}
