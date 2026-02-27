"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClientProfileType } from "@prisma/client";
import { Calendar, CheckCircle2, History, PencilLine, PlusCircle, RefreshCw, XCircle } from "lucide-react";
import UploadField from "@/components/ui/UploadField";
import DateField from "@/components/ui/DateField";
import SearchableMultiSelect from "@/components/ui/SearchableMultiSelect";
import {
  actionAddClientDocument,
  actionApproveClientDocument,
  actionCreateDocumentVersion,
  actionRejectClientDocument,
  actionUpdateClientDocument
} from "@/app/admin/clientes/actions";
import { mapCompanyDocumentTypeLabel } from "@/lib/clients/companyDocumentTypes";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };

type ClientDocumentRow = {
  id: string;
  title: string;
  documentTypeId: string | null;
  documentTypeName: string | null;
  expiresAt: string | null;
  fileUrl: string | null;
  fileAssetId: string | null;
  originalName: string | null;
  createdAt: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  version: number;
  supersededAt: string | null;
  supersededByDocumentId: string | null;
};

type DocumentHistoryEntry = {
  id: string;
  action: string;
  timestamp: string;
  actorLabel: string | null;
  metadata: unknown;
};

type RequiredChecklistItem = {
  ruleId: string;
  documentTypeId: string;
  documentTypeName: string;
  status: "APPROVED_VALID" | "PENDING" | "REJECTED" | "EXPIRED" | "MISSING";
  weight: number;
  requiresApproval: boolean;
  requiresExpiry: boolean;
  matchedDocumentId: string | null;
  matchedDocumentTitle: string | null;
  matchedApprovalStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  matchedExpiresAt: string | null;
  matchedRejectionReason: string | null;
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

function toDateInputValue(isoDate: string | null) {
  if (!isoDate) return "";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function formatHistoryAction(action: string) {
  const map: Record<string, string> = {
    CLIENT_DOCUMENT_APPROVED: "Aprobado",
    CLIENT_DOCUMENT_REJECTED: "Rechazado",
    CLIENT_DOCUMENT_UPDATED: "Editado",
    CLIENT_DOCUMENT_ADDED: "Creado",
    CLIENT_DOCUMENT_VERSION_CREATED: "Versión creada",
    CLIENT_DOCUMENT_SUPERSEDED: "Versión reemplazada"
  };
  return map[action] ?? action;
}

function expirationTone(status: "Vencido" | "Vence pronto" | "Vigente" | "Faltante" | "Sin vencimiento") {
  if (status === "Vencido") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "Vence pronto") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "Vigente") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function approvalTone(status: ClientDocumentRow["approvalStatus"]) {
  if (status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function approvalLabel(status: ClientDocumentRow["approvalStatus"]) {
  if (status === "APPROVED") return "Aprobado";
  if (status === "REJECTED") return "Rechazado";
  return "Pendiente";
}

function requiredTone(status: RequiredChecklistItem["status"]) {
  if (status === "APPROVED_VALID") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "EXPIRED") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "MISSING") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-sky-200 bg-sky-50 text-sky-800";
}

function requiredLabel(status: RequiredChecklistItem["status"]) {
  if (status === "APPROVED_VALID") return "Cumple";
  if (status === "REJECTED") return "Rechazado";
  if (status === "EXPIRED") return "Vencido";
  if (status === "MISSING") return "Faltante";
  return "Pendiente";
}

type ExpiryFilterValue = "all" | "valid" | "expiring" | "expired" | "no_expiry";

function getExpiryStatus(params: { expiresAt: string | null; today: Date; expiringUntil: Date }) {
  if (!params.expiresAt) return "no_expiry" as const;
  const expiresAt = new Date(params.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) return "no_expiry" as const;
  if (expiresAt < params.today) return "expired" as const;
  if (expiresAt <= params.expiringUntil) return "expiring" as const;
  return "valid" as const;
}

function getExpiryLabel(status: ReturnType<typeof getExpiryStatus>) {
  if (status === "expired") return "Vencido";
  if (status === "expiring") return "Vence pronto";
  if (status === "valid") return "Vigente";
  return "Sin vencimiento";
}

function summarizeHistoryMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const meta = value as Record<string, unknown>;
  const tokens: string[] = [];

  if (typeof meta.version === "number") tokens.push(`v${meta.version}`);
  if (typeof meta.fromVersion === "number" && typeof meta.toVersion === "number") {
    tokens.push(`v${meta.fromVersion} -> v${meta.toVersion}`);
  }
  if (typeof meta.reason === "string" && meta.reason.trim()) {
    tokens.push(`Motivo: ${meta.reason}`);
  }
  if (typeof meta.title === "string" && meta.title.trim()) {
    tokens.push(`Doc: ${meta.title}`);
  }

  return tokens.slice(0, 2).join(" · ");
}

export default function ClientDocumentsPanel({
  clientId,
  clientType,
  documents,
  historyByDocument,
  requiredChecklist = [],
  documentTypeOptions,
  canViewDocs = true,
  canEditDocs = false,
  canApproveDocs = false
}: {
  clientId: string;
  clientType: ClientProfileType;
  documents: ClientDocumentRow[];
  historyByDocument?: Record<string, DocumentHistoryEntry[]>;
  requiredChecklist?: RequiredChecklistItem[];
  documentTypeOptions: Option[];
  canViewDocs?: boolean;
  canEditDocs?: boolean;
  canApproveDocs?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", documentTypeId: "", expiresAt: "" });

  const [versioningDocId, setVersioningDocId] = useState<string | null>(null);
  const [versionForm, setVersionForm] = useState({
    title: "",
    documentTypeId: "",
    expiresAt: "",
    newFileUrl: "",
    newFileAssetId: "",
    newOriginalName: ""
  });

  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [form, setForm] = useState(() => ({
    title: "",
    documentTypeId: "",
    expiresAt: "",
    fileUrl: "",
    fileAssetId: "",
    originalName: ""
  }));
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilters, setSelectedTypeFilters] = useState<string[]>([]);
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilterValue>("all");

  const today = useMemo(() => startOfDay(new Date()), []);
  const expiringUntil = useMemo(() => addDays(today, 30), [today]);
  const versionByDocumentId = useMemo(() => {
    return new Map(documents.map((doc) => [doc.id, doc.version] as const));
  }, [documents]);
  const effectiveDocumentTypeOptions = useMemo(() => {
    if (clientType !== ClientProfileType.COMPANY) return documentTypeOptions;
    const grouped = new Map<string, Option>();
    for (const option of documentTypeOptions) {
      const mapped = mapCompanyDocumentTypeLabel(option.name);
      if (!grouped.has(mapped)) {
        grouped.set(mapped, { id: option.id, name: mapped });
      }
    }
    return Array.from(grouped.values());
  }, [clientType, documentTypeOptions]);
  const filterTypeOptions = useMemo(() => {
    if (clientType !== ClientProfileType.COMPANY) {
      return effectiveDocumentTypeOptions.map((option) => ({ id: option.id, label: option.name }));
    }
    return effectiveDocumentTypeOptions.map((option) => ({ id: option.name, label: option.name }));
  }, [clientType, effectiveDocumentTypeOptions]);
  const documentTypeNameById = useMemo(
    () => new Map(effectiveDocumentTypeOptions.map((option) => [option.id, option.name] as const)),
    [effectiveDocumentTypeOptions]
  );
  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return documents.filter((doc) => {
      const displayTypeName = clientType === ClientProfileType.COMPANY
        ? mapCompanyDocumentTypeLabel(doc.documentTypeName ?? "")
        : (doc.documentTypeName ?? "Sin tipo");
      const matchesQuery =
        !query ||
        doc.title.toLowerCase().includes(query) ||
        displayTypeName.toLowerCase().includes(query);
      if (!matchesQuery) return false;
      if (selectedTypeFilters.length > 0) {
        if (clientType === ClientProfileType.COMPANY) {
          const canonicalLabel = mapCompanyDocumentTypeLabel(doc.documentTypeName ?? "");
          if (!selectedTypeFilters.includes(canonicalLabel)) return false;
        } else if (!doc.documentTypeId || !selectedTypeFilters.includes(doc.documentTypeId)) {
          return false;
        }
      }
      const status = getExpiryStatus({ expiresAt: doc.expiresAt, today, expiringUntil });
      if (expiryFilter !== "all" && status !== expiryFilter) return false;
      return true;
    });
  }, [clientType, documents, expiringUntil, expiryFilter, searchQuery, selectedTypeFilters, today]);
  const requiredSummary = useMemo(() => {
    return {
      total: requiredChecklist.length,
      pending: requiredChecklist.filter((item) => item.status === "PENDING").length,
      rejected: requiredChecklist.filter((item) => item.status === "REJECTED").length,
      expired: requiredChecklist.filter((item) => item.status === "EXPIRED").length,
      missing: requiredChecklist.filter((item) => item.status === "MISSING").length
    };
  }, [requiredChecklist]);

  const canSubmit = canEditDocs && Boolean(form.title.trim());

  function submitNewDocument() {
    if (!canEditDocs || !canSubmit) return;

    startTransition(async () => {
      try {
        await actionAddClientDocument({
          clientId,
          title: form.title,
          documentTypeId: form.documentTypeId || undefined,
          expiresAt: form.expiresAt || undefined,
          fileUrl: form.fileUrl || undefined,
          fileAssetId: form.fileAssetId || undefined,
          originalName: form.originalName || undefined
        });

        setForm({ title: "", documentTypeId: "", expiresAt: "", fileUrl: "", fileAssetId: "", originalName: "" });
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo agregar el documento.");
      }
    });
  }

  function beginEdit(doc: ClientDocumentRow) {
    const normalizedTypeId =
      doc.documentTypeId && documentTypeNameById.has(doc.documentTypeId)
        ? doc.documentTypeId
        : effectiveDocumentTypeOptions.find(
            (option) =>
              option.name ===
              (clientType === ClientProfileType.COMPANY
                ? mapCompanyDocumentTypeLabel(doc.documentTypeName ?? "")
                : (doc.documentTypeName ?? "Sin tipo"))
          )?.id ?? "";
    setEditingDocId(doc.id);
    setEditForm({
      title: doc.title,
      documentTypeId: normalizedTypeId,
      expiresAt: toDateInputValue(doc.expiresAt)
    });
    setVersioningDocId(null);
    setRejectingDocId(null);
    setError(null);
  }

  function saveEdit(doc: ClientDocumentRow) {
    if (!canEditDocs || !editingDocId || !editForm.title.trim()) return;

    startTransition(async () => {
      try {
        await actionUpdateClientDocument({
          documentId: editingDocId,
          title: editForm.title,
          documentTypeId: doc.approvalStatus === "APPROVED" ? undefined : editForm.documentTypeId,
          expiresAt: doc.approvalStatus === "APPROVED" ? undefined : editForm.expiresAt
        });

        setEditingDocId(null);
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo actualizar el documento.");
      }
    });
  }

  function beginVersion(doc: ClientDocumentRow) {
    const normalizedTypeId =
      doc.documentTypeId && documentTypeNameById.has(doc.documentTypeId)
        ? doc.documentTypeId
        : effectiveDocumentTypeOptions.find(
            (option) =>
              option.name ===
              (clientType === ClientProfileType.COMPANY
                ? mapCompanyDocumentTypeLabel(doc.documentTypeName ?? "")
                : (doc.documentTypeName ?? "Sin tipo"))
          )?.id ?? "";
    setVersioningDocId(doc.id);
    setVersionForm({
      title: doc.title,
      documentTypeId: normalizedTypeId,
      expiresAt: toDateInputValue(doc.expiresAt),
      newFileUrl: "",
      newFileAssetId: "",
      newOriginalName: ""
    });
    setEditingDocId(null);
    setRejectingDocId(null);
    setError(null);
  }

  function saveVersion() {
    if (!canEditDocs || !versioningDocId) return;
    if (!versionForm.newFileUrl && !versionForm.newFileAssetId) {
      setError("Adjunta el nuevo archivo para crear versión.");
      return;
    }

    startTransition(async () => {
      try {
        await actionCreateDocumentVersion({
          documentId: versioningDocId,
          title: versionForm.title,
          documentTypeId: versionForm.documentTypeId || undefined,
          expiresAt: versionForm.expiresAt || undefined,
          newFileUrl: versionForm.newFileUrl || undefined,
          newFileAssetId: versionForm.newFileAssetId || undefined,
          newOriginalName: versionForm.newOriginalName || undefined
        });

        setVersioningDocId(null);
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo crear la nueva versión.");
      }
    });
  }

  function approveDocument(documentId: string) {
    if (!canApproveDocs) return;

    startTransition(async () => {
      try {
        await actionApproveClientDocument({ documentId });
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo aprobar el documento.");
      }
    });
  }

  function beginReject(documentId: string) {
    setRejectingDocId(documentId);
    setRejectReason("");
    setEditingDocId(null);
    setVersioningDocId(null);
    setError(null);
  }

  function rejectDocument() {
    if (!canApproveDocs || !rejectingDocId) return;

    startTransition(async () => {
      try {
        await actionRejectClientDocument({ documentId: rejectingDocId, reason: rejectReason });
        setRejectingDocId(null);
        setRejectReason("");
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo rechazar el documento.");
      }
    });
  }

  function createMissingDocument(item: RequiredChecklistItem) {
    if (!canEditDocs) return;
    const normalizedTypeId =
      item.documentTypeId && documentTypeNameById.has(item.documentTypeId)
        ? item.documentTypeId
        : effectiveDocumentTypeOptions.find(
            (option) =>
              option.name ===
              (clientType === ClientProfileType.COMPANY
                ? mapCompanyDocumentTypeLabel(item.documentTypeName)
                : item.documentTypeName)
          )?.id ?? "";
    setForm((prev) => ({
      ...prev,
      title:
        prev.title.trim() ||
        (clientType === ClientProfileType.COMPANY ? mapCompanyDocumentTypeLabel(item.documentTypeName) : item.documentTypeName),
      documentTypeId: normalizedTypeId
    }));
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Documentos</p>

        {!canViewDocs && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Tu rol no tiene permiso para ver documentos.
          </div>
        )}

        {canViewDocs && requiredChecklist.length > 0 && (
          <section className="mt-4 rounded-xl border border-[#dce7f5] bg-[#f8fafc] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Checklist requeridos</p>
              <div className="flex flex-wrap items-center gap-2">
                {requiredSummary.pending > 0 && (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
                    Pendientes: {requiredSummary.pending}
                  </span>
                )}
                {requiredSummary.rejected > 0 && (
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                    Rechazados: {requiredSummary.rejected}
                  </span>
                )}
                {requiredSummary.expired > 0 && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    Vencidos: {requiredSummary.expired}
                  </span>
                )}
                {requiredSummary.missing > 0 && (
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                    Faltantes: {requiredSummary.missing}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {requiredChecklist.map((item) => (
                <article key={item.ruleId} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {clientType === ClientProfileType.COMPANY ? mapCompanyDocumentTypeLabel(item.documentTypeName) : item.documentTypeName}
                      </p>
                      <p className="text-xs text-slate-500">
                        Peso {item.weight} · Aprobación {item.requiresApproval ? "sí" : "no"} · Vencimiento {item.requiresExpiry ? "sí" : "no"}
                      </p>
                      {item.matchedDocumentTitle && <p className="mt-1 text-xs text-slate-500">Documento: {item.matchedDocumentTitle}</p>}
                      {item.status === "REJECTED" && item.matchedRejectionReason && (
                        <p className="mt-1 text-xs text-rose-700">Motivo: {item.matchedRejectionReason}</p>
                      )}
                    </div>
                    <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", requiredTone(item.status))}>
                      {requiredLabel(item.status)}
                    </span>
                  </div>

                  {canEditDocs && (item.status === "MISSING" || item.status === "REJECTED" || item.status === "EXPIRED") && (
                    <button
                      type="button"
                      onClick={() => createMissingDocument(item)}
                      className="mt-2 rounded-full border border-[#4aadf5] bg-[#f1f8ff] px-3 py-1.5 text-xs font-semibold text-[#2e75ba] hover:bg-[#e3f1ff]"
                    >
                      Crear documento faltante
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {canViewDocs && (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 md:grid-cols-2 lg:grid-cols-12">
              <div className="space-y-1 lg:col-span-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Buscar</p>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar por título o tipo..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
                />
              </div>
              <div className="space-y-1 lg:col-span-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tipo de documento</p>
                <SearchableMultiSelect
                  value={selectedTypeFilters}
                  onChange={setSelectedTypeFilters}
                  options={filterTypeOptions}
                  placeholder="Filtrar por tipo"
                />
              </div>
              <div className="space-y-1 lg:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Estado</p>
                <select
                  value={expiryFilter}
                  onChange={(event) => setExpiryFilter(event.target.value as ExpiryFilterValue)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
                >
                  <option value="all">Todos</option>
                  <option value="valid">Vigente</option>
                  <option value="expiring">Vence pronto</option>
                  <option value="expired">Vencido</option>
                  <option value="no_expiry">Sin vencimiento</option>
                </select>
              </div>
            </div>

            {filteredDocuments.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[#F8FAFC] text-xs uppercase tracking-[0.2em] text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Título</th>
                        <th className="px-3 py-2 text-left">Tipo</th>
                        <th className="px-3 py-2 text-left">Vencimiento</th>
                        <th className="px-3 py-2 text-left">Estado</th>
                        <th className="px-3 py-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.map((doc) => {
                        const expiresAt = doc.expiresAt ? new Date(doc.expiresAt) : null;
                        const expiryStatus = getExpiryStatus({ expiresAt: doc.expiresAt, today, expiringUntil });
                        const hasFile = Boolean(doc.fileUrl || doc.fileAssetId);
                        const displayTypeName =
                          clientType === ClientProfileType.COMPANY
                            ? mapCompanyDocumentTypeLabel(doc.documentTypeName ?? "")
                            : (doc.documentTypeName ?? "Sin tipo");
                        const history = (historyByDocument?.[doc.id] ?? []).slice(0, 5);
                        const isEditing = editingDocId === doc.id;
                        const isVersioning = versioningDocId === doc.id;
                        const isRejecting = rejectingDocId === doc.id;

                        return (
                          <Fragment key={doc.id}>
                            <tr className="border-t border-slate-100">
                              <td className="px-3 py-3 align-top">
                                <p className="font-semibold text-slate-900">
                                  {doc.title} <span className="text-xs font-medium text-slate-500">v{doc.version}</span>
                                </p>
                                {doc.supersededAt ? (
                                  <p className="text-xs text-slate-500">
                                    Reemplazado el {new Date(doc.supersededAt).toLocaleDateString()}
                                  </p>
                                ) : null}
                              </td>
                              <td className="px-3 py-3 align-top">
                                <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                                  {displayTypeName}
                                </span>
                              </td>
                              <td className="px-3 py-3 align-top text-slate-700">
                                {expiresAt ? expiresAt.toLocaleDateString() : "Sin vencimiento"}
                              </td>
                              <td className="px-3 py-3 align-top">
                                <div className="flex flex-wrap gap-1">
                                  <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", expirationTone(hasFile ? getExpiryLabel(expiryStatus) : "Faltante"))}>
                                    {hasFile ? getExpiryLabel(expiryStatus) : "Faltante"}
                                  </span>
                                  <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", approvalTone(doc.approvalStatus))}>
                                    {approvalLabel(doc.approvalStatus)}
                                  </span>
                                </div>
                                {doc.approvalStatus === "REJECTED" && doc.rejectionReason ? (
                                  <p className="mt-1 text-xs text-rose-700">Motivo: {doc.rejectionReason}</p>
                                ) : null}
                              </td>
                              <td className="px-3 py-3 align-top">
                                <div className="flex flex-wrap justify-end gap-1">
                                  {doc.fileUrl ? (
                                    <Link
                                      href={doc.fileUrl}
                                      target="_blank"
                                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                                    >
                                      Ver
                                    </Link>
                                  ) : (
                                    <span className="px-2 text-xs text-slate-500">Sin archivo</span>
                                  )}

                                  {canEditDocs && !doc.supersededAt ? (
                                    <button
                                      type="button"
                                      onClick={() => beginEdit(doc)}
                                      disabled={isPending}
                                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                                    >
                                      <PencilLine size={13} />
                                      Editar
                                    </button>
                                  ) : null}
                                  {canEditDocs && !doc.supersededAt ? (
                                    <button
                                      type="button"
                                      onClick={() => beginVersion(doc)}
                                      disabled={isPending}
                                      className="inline-flex items-center gap-1 rounded-full border border-[#4aadf5] bg-[#f1f8ff] px-3 py-1 text-xs font-semibold text-[#2e75ba] hover:bg-[#e3f1ff]"
                                    >
                                      <RefreshCw size={13} />
                                      Versión
                                    </button>
                                  ) : null}
                                  {canApproveDocs && !doc.supersededAt && doc.approvalStatus !== "APPROVED" ? (
                                    <button
                                      type="button"
                                      onClick={() => approveDocument(doc.id)}
                                      disabled={isPending}
                                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                    >
                                      <CheckCircle2 size={13} />
                                      Aprobar
                                    </button>
                                  ) : null}
                                  {canApproveDocs && !doc.supersededAt && doc.approvalStatus !== "REJECTED" ? (
                                    <button
                                      type="button"
                                      onClick={() => beginReject(doc.id)}
                                      disabled={isPending}
                                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                                    >
                                      <XCircle size={13} />
                                      Rechazar
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>

                            {(isEditing || isVersioning || isRejecting || history.length > 0) && (
                              <tr className="border-t border-slate-100 bg-[#F8FAFC]">
                                <td colSpan={5} className="px-3 py-3">
                                  {isEditing && canEditDocs ? (
                                    <div className="space-y-3 rounded-lg border border-[#dce7f5] bg-white p-3">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Editar metadata</p>
                                      <input
                                        value={editForm.title}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                                        placeholder="Título *"
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                                      />

                                      <div className="grid gap-3 md:grid-cols-2">
                                        <select
                                          value={editForm.documentTypeId}
                                          onChange={(e) => setEditForm((prev) => ({ ...prev, documentTypeId: e.target.value }))}
                                          disabled={doc.approvalStatus === "APPROVED"}
                                          className={cn(
                                            "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700",
                                            doc.approvalStatus === "APPROVED" && "cursor-not-allowed bg-slate-100 text-slate-500"
                                          )}
                                        >
                                          <option value="">Sin tipo</option>
                                          {effectiveDocumentTypeOptions.map((opt) => (
                                            <option key={opt.id} value={opt.id}>
                                              {opt.name}
                                            </option>
                                          ))}
                                        </select>

                                        <DateField
                                          value={editForm.expiresAt}
                                          onChange={(value) => setEditForm((prev) => ({ ...prev, expiresAt: value }))}
                                          disabled={doc.approvalStatus === "APPROVED"}
                                          inputClassName={cn(
                                            "h-11",
                                            doc.approvalStatus === "APPROVED" && "cursor-not-allowed bg-slate-100 text-slate-500"
                                          )}
                                        />
                                      </div>

                                      {doc.approvalStatus === "APPROVED" ? (
                                        <p className="text-xs text-[#2e75ba]">
                                          Documento aprobado: para cambiar archivo/tipo/vencimiento usa &quot;Reemplazar versión&quot;.
                                        </p>
                                      ) : null}

                                      <div className="flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={() => saveEdit(doc)}
                                          disabled={!editForm.title.trim() || isPending}
                                          className={cn(
                                            "rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white",
                                            (!editForm.title.trim() || isPending) && "cursor-not-allowed opacity-60"
                                          )}
                                        >
                                          Guardar cambios
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingDocId(null)}
                                          disabled={isPending}
                                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : null}

                                  {isVersioning && canEditDocs ? (
                                    <div className="space-y-3 rounded-lg border border-[#4aadf5]/40 bg-white p-3">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Nueva versión (trazable)</p>

                                      <div className="grid gap-3 md:grid-cols-2">
                                        <input
                                          value={versionForm.title}
                                          onChange={(e) => setVersionForm((prev) => ({ ...prev, title: e.target.value }))}
                                          placeholder="Título"
                                          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                                        />
                                        <select
                                          value={versionForm.documentTypeId}
                                          onChange={(e) => setVersionForm((prev) => ({ ...prev, documentTypeId: e.target.value }))}
                                          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                                        >
                                          <option value="">Sin tipo</option>
                                          {effectiveDocumentTypeOptions.map((opt) => (
                                            <option key={opt.id} value={opt.id}>
                                              {opt.name}
                                            </option>
                                          ))}
                                        </select>
                                        <DateField
                                          value={versionForm.expiresAt}
                                          onChange={(value) => setVersionForm((prev) => ({ ...prev, expiresAt: value }))}
                                          inputClassName="h-11"
                                        />
                                      </div>

                                      <UploadField
                                        value={versionForm.newFileUrl || undefined}
                                        onChange={(url, info) => {
                                          setVersionForm((prev) => ({
                                            ...prev,
                                            newFileUrl: url,
                                            newFileAssetId: info?.assetId ?? "",
                                            newOriginalName: info?.name ?? ""
                                          }));
                                        }}
                                        helperText="Adjunta el archivo de la nueva versión (obligatorio)."
                                        disabled={isPending}
                                      />

                                      <div className="flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={saveVersion}
                                          disabled={isPending || (!versionForm.newFileUrl && !versionForm.newFileAssetId)}
                                          className={cn(
                                            "rounded-full bg-[#2e75ba] px-4 py-2 text-sm font-semibold text-white",
                                            (isPending || (!versionForm.newFileUrl && !versionForm.newFileAssetId)) && "cursor-not-allowed opacity-60"
                                          )}
                                        >
                                          Crear versión
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setVersioningDocId(null)}
                                          disabled={isPending}
                                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : null}

                                  {isRejecting && canApproveDocs ? (
                                    <div className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Motivo de rechazo (obligatorio)</p>
                                      <textarea
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        placeholder="Escribe el motivo (mínimo 5 caracteres)..."
                                        className="min-h-[88px] w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-slate-700"
                                      />

                                      <div className="flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={rejectDocument}
                                          disabled={isPending || rejectReason.trim().length < 5}
                                          className={cn(
                                            "rounded-full border border-rose-300 bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700",
                                            (isPending || rejectReason.trim().length < 5) && "cursor-not-allowed opacity-60"
                                          )}
                                        >
                                          Confirmar rechazo
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setRejectingDocId(null)}
                                          disabled={isPending}
                                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : null}

                                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                                    <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                      <History size={12} />
                                      Historial
                                    </p>
                                    {history.length ? (
                                      <div className="mt-1 space-y-1">
                                        {history.map((entry) => {
                                          const details = summarizeHistoryMetadata(entry.metadata);
                                          return (
                                            <p key={entry.id} className="text-xs text-slate-600">
                                              <span className="font-semibold text-slate-800">{formatHistoryAction(entry.action)}</span> · {" "}
                                              {entry.actorLabel ?? "Sistema"} · {new Date(entry.timestamp).toLocaleString()}
                                              {details ? ` · ${details}` : ""}
                                            </p>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="mt-1 text-xs text-slate-500">Sin movimientos auditados para este documento.</p>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-diagnostics-background px-4 py-3 text-sm text-slate-700">
                {documents.length === 0 ? "No hay documentos cargados todavía." : "No hay documentos que coincidan con los filtros seleccionados."}
              </div>
            )}
          </div>
        )}

      </section>

      {!canEditDocs && canViewDocs && (
        <section className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-6 shadow-sm">
          <p className="text-sm text-slate-600">Tu rol tiene acceso de lectura. Solicita permisos para agregar o editar documentos.</p>
        </section>
      )}

      {canEditDocs && (
        <section className="space-y-4 rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm" id="add-document-form">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Agregar documento</p>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Título del documento (ej. Patente de comercio, RTU, Licencia sanitaria)"
              className="h-11 md:col-span-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
            />

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">Tipo de documento (opcional)</p>
              <select
                value={form.documentTypeId}
                onChange={(e) => setForm((prev) => ({ ...prev, documentTypeId: e.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
              >
                <option value="">Sin tipo</option>
                {effectiveDocumentTypeOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Los tipos se administran desde Configuración de Clientes.</p>
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Calendar size={14} className="text-diagnostics-secondary" />
                Vencimiento (opcional)
              </p>
              <DateField
                value={form.expiresAt}
                onChange={(value) => setForm((prev) => ({ ...prev, expiresAt: value }))}
                inputClassName="h-11"
              />
            </div>
          </div>

          <UploadField
            value={form.fileUrl || undefined}
            onChange={(url, info) => {
              setForm((prev) => ({
                ...prev,
                fileUrl: url,
                fileAssetId: info?.assetId ?? "",
                originalName: info?.name ?? ""
              }));
            }}
            helperText="PDF/Imagen (opcional). Si no adjuntas archivo, quedará pendiente/faltante."
            disabled={isPending}
          />

          <button
            type="button"
            onClick={submitNewDocument}
            disabled={!canSubmit || isPending}
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-diagnostics-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-diagnostics-primary/90",
              (!canSubmit || isPending) && "cursor-not-allowed opacity-60 hover:bg-diagnostics-primary"
            )}
          >
            <PlusCircle size={16} />
            Agregar documento
          </button>

          {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        </section>
      )}

      {!canEditDocs && canApproveDocs && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
          Tu rol puede aprobar/rechazar documentos, pero no editar metadatos.
        </section>
      )}
    </div>
  );
}
