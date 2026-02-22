"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ToastContainer } from "@/components/ui/Toast";
import { CrmDealDrawer } from "@/components/crm/CrmDealDrawer";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import {
  CRM_LOST_REASONS,
  CRM_COMMUNICATION_OPTIONS,
  CRM_PIPELINE_TYPES,
  CRM_STAGE_LABELS,
  CRM_STAGE_ORDER,
  CRM_SERVICE_OPTIONS,
  formatNextAction,
  nextActionLabel,
  parseNextAction
} from "@/lib/crmConfig";
import { formatCurrency, formatDateTime } from "@/lib/crmFormat";
import { toDateTimeLocalValue, toISOStringFromLocal } from "@/lib/date";

type Deal = {
  id: string;
  stage: string;
  pipelineType: "B2B" | "B2C";
  amount: number;
  amountEstimated?: number;
  slaStatus: "GREEN" | "YELLOW" | "RED";
  nextAction?: string | null;
  nextActionAt?: string | null;
  ownerId?: string | null;
  capturedAt?: string | null;
  quoteCount?: number;
  quoteStatus?: string;
  latestQuoteId?: string | null;
  account?: { id: string; name: string | null } | null;
  contact?: { id: string; firstName: string | null; lastName?: string | null; phone?: string | null; email?: string | null } | null;
  services?: { serviceType: string }[];
  missingAction?: boolean;
};

const WEEK_MS = 1000 * 60 * 60 * 24 * 7;

function getClientName(deal: Deal) {
  if (deal.account?.name) return deal.account.name;
  const firstName = deal.contact?.firstName || "";
  const lastName = deal.contact?.lastName || "";
  const full = `${firstName} ${lastName}`.trim();
  return full || "Sin cliente";
}

function SlaChip({ status, label }: { status?: string; label?: string }) {
  const colors =
    status === "RED"
      ? "bg-rose-100 text-rose-700 border-rose-200"
      : status === "YELLOW"
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-emerald-100 text-emerald-700 border-emerald-200";
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold", colors)}>
      {label || status || "-"}
    </span>
  );
}

export default function CrmPipelinePage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Cargando CRM...</div>}>
      <CrmPipelinePageContent />
    </Suspense>
  );
}

function CrmPipelinePageContent() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") || "b2b";
  const normalizedType = typeParam.toLowerCase() === "b2c" ? "b2c" : "b2b";
  const pipelineTypeLabel = normalizedType === "b2c" ? CRM_PIPELINE_TYPES.b2c.label : CRM_PIPELINE_TYPES.b2b.label;
  const roleParam = searchParams.get("role");
  const userRole = (roleParam || "Administrador").trim();
  const isAdmin = userRole.toLowerCase() === "administrador";
  const baseHeaders = useMemo(() => ({ "x-role": userRole, "Content-Type": "application/json" }), [userRole]);
  const { toasts, showToast, dismiss } = useToast();

  const fetchJson = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), ...baseHeaders } });
      const json = await res.json();
      if (!res.ok) {
        const error = new Error(json.error || "Error");
        (error as any).status = res.status;
        throw error;
      }
      return json;
    },
    [baseHeaders]
  );

  const normalizeError = useCallback(
    (err: any, fallback: string) => {
      const status = err?.status;
      const message =
        status === 403 ? "Acción solo para administrador." : status && status >= 500 ? "Error inesperado. Reintenta." : err?.message || fallback;
      showToast(message, "error");
      return message;
    },
    [showToast]
  );

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageModal, setStageModal] = useState<{ deal: Deal; stage: string } | null>(null);
  const [stageForm, setStageForm] = useState({
    stage: "CONTACTADO",
    nextActionType: "CALL",
    nextActionAt: "",
    nextActionNotes: "",
    lostReason: "",
    lostNotes: ""
  });
  const [stageError, setStageError] = useState<string | null>(null);
  const [actionDeal, setActionDeal] = useState<Deal | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [infoNote, setInfoNote] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({ services: [] as string[], description: "" });
  const [requestLinks, setRequestLinks] = useState<Record<string, string>>({});
  const [noResponseDate, setNoResponseDate] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");

  const loadDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    setInfoNote(null);
    try {
      const json = await fetchJson(`/api/crm/deals?pipelineType=${normalizedType.toUpperCase()}&status=OPEN`);
      const normalized = (json.data || []).map((deal: any) => ({
        ...deal,
        amount: deal.amount ?? deal.amountEstimated ?? 0
      }));
      setDeals(normalized);
      setInfoNote(json.note || null);
    } catch (err: any) {
      const message = normalizeError(err, "No se pudo cargar pipeline");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [normalizedType, fetchJson, normalizeError]);

  const loadActionData = useCallback(
    async (dealId: string) => {
      setQuotesLoading(true);
      setRequestsLoading(true);
      setActionError(null);
      try {
        const [quotesRes, requestsRes] = await Promise.all([
          fetchJson(`/api/crm/quotes-v2?dealId=${dealId}`),
          fetchJson(`/api/crm/requests?dealId=${dealId}`)
        ]);
        setQuotes(quotesRes.data || []);
        setRequests(requestsRes.data || []);
      } catch (err: any) {
        const message = normalizeError(err, "No se pudieron cargar acciones");
        setActionError(message);
      } finally {
        setQuotesLoading(false);
        setRequestsLoading(false);
      }
    },
    [fetchJson, normalizeError]
  );

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const serviceOptions = useMemo(
    () => (normalizedType === "b2c" ? CRM_SERVICE_OPTIONS.B2C : CRM_SERVICE_OPTIONS.B2B),
    [normalizedType]
  );

  const tableRows = useMemo(() => {
    return [...deals].sort((a, b) => {
      const ad = a.capturedAt ? new Date(a.capturedAt).getTime() : 0;
      const bd = b.capturedAt ? new Date(b.capturedAt).getTime() : 0;
      return bd - ad;
    });
  }, [deals]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return tableRows.filter((deal) => {
      const stageOk = stageFilter === "ALL" || deal.stage === stageFilter;
      if (!stageOk) return false;
      if (!normalizedSearch) return true;
      const services = deal.services?.map((service) => service.serviceType).join(" ").toLowerCase() || "";
      const owner = (deal.ownerId || "").toLowerCase();
      return `${getClientName(deal).toLowerCase()} ${services} ${owner}`.includes(normalizedSearch);
    });
  }, [tableRows, searchTerm, stageFilter]);

  const kanbanColumns = useMemo(
    () =>
      CRM_STAGE_ORDER.map((stage) => ({
        stage,
        label: CRM_STAGE_LABELS[stage],
        deals: filteredRows.filter((deal) => deal.stage === stage)
      })),
    [filteredRows]
  );

  const openStageModal = (deal: Deal, stage: string) => {
    const parsed = parseNextAction(deal.nextAction);
    setStageForm({
      stage,
      nextActionType: parsed.type || "CALL",
      nextActionAt: toDateTimeLocalValue(deal.nextActionAt),
      nextActionNotes: parsed.notes || "",
      lostReason: "",
      lostNotes: ""
    });
    setStageError(null);
    setStageModal({ deal, stage });
  };

  const openActions = (deal: Deal) => {
    setActionDeal(deal);
    setRejectReason("");
    setActionError(null);
    setRequestError(null);
    setRequestForm({ services: [], description: "" });
    setNoResponseDate("");
    setRequestLinks({});
    loadActionData(deal.id);
  };

  const handleStageSave = async () => {
    if (!stageModal) return;
    setStageError(null);
    const payload: any = { id: stageModal.deal.id, stage: stageForm.stage };
    if (stageForm.stage === "GANADO" && !isAdmin) {
      setStageError("Acción solo para administrador.");
      return;
    }
    if (["DIAGNOSTICO", "NEGOCIACION"].includes(stageForm.stage) && stageModal.deal.pipelineType === "B2C") {
      setStageError("B2C usa cierre directo; no permite Diagnostico ni Negociacion.");
      return;
    }
    if (stageForm.stage === "COTIZACION" && !stageModal.deal.quoteCount) {
      setStageError("Crea una cotizacion antes de pasar a COTIZACION.");
      return;
    }
    if (stageForm.stage === "NEGOCIACION" && stageModal.deal.quoteStatus !== "APPROVED") {
      setStageError("Se requiere cotizacion aprobada para Negociacion.");
      return;
    }
    if (stageForm.stage === "GANADO" && stageModal.deal.quoteStatus !== "APPROVED") {
      setStageError("Solo se puede cerrar GANADO con cotizacion aprobada por ADMIN.");
      return;
    }
    const requiresNextAction = !["GANADO", "PERDIDO", "NUEVO"].includes(stageForm.stage);
    const allowsNextAction = !["GANADO", "PERDIDO"].includes(stageForm.stage);
    const dueAtIso = toISOStringFromLocal(stageForm.nextActionAt);
    if (requiresNextAction && !dueAtIso) {
      setStageError("Fecha y hora requerida para la proxima accion.");
      return;
    }
    if (allowsNextAction && dueAtIso) {
      payload.nextAction = formatNextAction(stageForm.nextActionType, stageForm.nextActionNotes);
      payload.nextActionAt = dueAtIso;
    }
    if (stageForm.stage === "PERDIDO") {
      if (!stageForm.lostReason) {
        setStageError("Selecciona motivo de perdida.");
        return;
      }
      payload.lostReason = stageForm.lostReason;
      payload.stageComment = stageForm.lostNotes || undefined;
    }
    try {
      await fetchJson("/api/crm/deals", { method: "PATCH", body: JSON.stringify(payload) });
      setStageModal(null);
      await loadDeals();
    } catch (err: any) {
      const message = normalizeError(err, "No se pudo mover la etapa");
      setStageError(message);
    }
  };

  const handleApproveQuote = async (quoteId: string) => {
    if (!actionDeal) return;
    try {
      setActionError(null);
      await fetchJson(`/api/crm/quotes-v2/${quoteId}/approve`, { method: "POST" });
      showToast("Cotización aprobada", "success");
      await loadActionData(actionDeal.id);
      await loadDeals();
    } catch (err: any) {
      const message = normalizeError(err, "No se pudo aprobar la cotizacion");
      setActionError(message);
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
    if (!actionDeal) return;
    const reason = rejectReason.trim() || prompt("Motivo de rechazo") || "";
    if (!reason.trim()) {
      setActionError("Motivo obligatorio para rechazar");
      return;
    }
    try {
      setActionError(null);
      await fetchJson(`/api/crm/quotes-v2/${quoteId}/reject`, {
        method: "POST",
        body: JSON.stringify({ rejectionReason: reason })
      });
      setRejectReason("");
      await loadActionData(actionDeal.id);
      showToast("Cotización rechazada", "success");
      await loadDeals();
    } catch (err: any) {
      const message = normalizeError(err, "No se pudo rechazar la cotizacion");
      setActionError(message);
    }
  };

  const handleCloneQuote = async (quoteId: string) => {
    if (!actionDeal) return;
    try {
      setActionError(null);
      const quoteDetail = await fetchJson(`/api/crm/quotes-v2/${quoteId}`);
      const items = (quoteDetail.data?.items || []).map((it: any) => ({
        category: it.category,
        productName: it.productName,
        enlace: it.enlace || null,
        refCode: it.refCode || null,
        description: it.description || null,
        qty: Number(it.qty),
        unitPrice: Number(it.unitPrice),
        discountPct: it.discountPct ? Number(it.discountPct) : null
      }));
      await fetchJson("/api/crm/quotes-v2", {
        method: "POST",
        body: JSON.stringify({
          dealId: actionDeal.id,
          type: actionDeal.pipelineType === "B2C" ? "B2C" : "B2B",
          status: "DRAFT",
          items
        })
      });
      showToast("Cotización clonada como borrador", "success");
      await loadActionData(actionDeal.id);
    } catch (err: any) {
      const message = normalizeError(err, "No se pudo clonar la cotizacion");
      setActionError(message);
    }
  };

  const handleCreateRequest = async () => {
    if (!actionDeal) return;
    if (!requestForm.services.length) {
      setRequestError("Selecciona servicios solicitados");
      return;
    }
    if (!requestForm.description.trim()) {
      setRequestError("Descripcion obligatoria");
      return;
    }
    try {
      setRequestError(null);
      await fetchJson("/api/crm/requests", {
        method: "POST",
        body: JSON.stringify({
          dealId: actionDeal.id,
          services: requestForm.services,
          description: requestForm.description
        })
      });
      setRequestForm({ services: [], description: "" });
      await loadActionData(actionDeal.id);
      showToast("Solicitud registrada", "success");
    } catch (err: any) {
      const message = normalizeError(err, "No se pudo crear la solicitud");
      setRequestError(message);
    }
  };

  const handleLinkRequest = async (requestId: string) => {
    if (!actionDeal) return;
    const quoteId = requestLinks[requestId];
    if (!quoteId) {
      setRequestError("Selecciona una cotizacion para vincular");
      return;
    }
    try {
      setRequestError(null);
      await fetchJson("/api/crm/requests", {
        method: "PATCH",
        body: JSON.stringify({ id: requestId, quoteId })
      });
      await loadActionData(actionDeal.id);
      showToast("Solicitud vinculada", "success");
    } catch (err: any) {
      const message = normalizeError(err, "No se pudo vincular la solicitud");
      setRequestError(message);
    }
  };

  const handleNoResponse = async () => {
    if (!actionDeal) return;
    const lastContactIso = toISOStringFromLocal(noResponseDate);
    if (!lastContactIso) {
      setActionError("Fecha de ultimo contacto requerida");
      return;
    }
    const autoCloseAt = new Date(Date.now() + WEEK_MS).toISOString();
    try {
      setActionError(null);
      await fetchJson("/api/crm/activities", {
        method: "POST",
        body: JSON.stringify({
          dealId: actionDeal.id,
          type: "SYSTEM",
          dateTime: new Date().toISOString(),
          summary: "No responde el cliente",
          notes: `Ultimo contacto: ${lastContactIso}`
        })
      });
      await fetchJson("/api/crm/deals", {
        method: "PATCH",
        body: JSON.stringify({
          id: actionDeal.id,
          nextAction: `NO_RESPONDE - ultimo contacto ${lastContactIso}`,
          nextActionAt: null,
          stageComment: "No responde"
        })
      });
      await fetchJson("/api/crm/tasks", {
        method: "POST",
        body: JSON.stringify({
          dealId: actionDeal.id,
          dueDate: autoCloseAt,
          title: "Auto-cierre no responde",
          priority: "HIGH",
          notes: "Cerrar como perdido en 7 dias si no responde"
        })
      });
      await loadDeals();
      await loadActionData(actionDeal.id);
      showToast("Marcado como no responde", "success");
    } catch (err: any) {
      const message = normalizeError(err, "No se pudo marcar como no responde");
      setActionError(message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 shadow-sm">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2rem] text-[#2e75ba]">CRM - Pipeline</p>
          <h1 className="text-xl font-semibold text-slate-900">{pipelineTypeLabel}</h1>
          <p className="text-xs text-slate-500">Vista operativa con toggle Tabla/Kanban y acciones unificadas.</p>
          <p className="text-xs text-slate-500">Este monto se calcula automáticamente desde cotizaciones aprobadas.</p>
        </div>
        <Link
          href={`/admin/crm/new?type=${normalizedType}`}
          className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg bg-[#4aa59c] px-4 text-sm font-semibold text-white transition hover:bg-[#4aadf5]"
        >
          Nueva negociacion
        </Link>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {infoNote && <p className="text-sm text-amber-700">{infoNote}</p>}

      <Card className="rounded-xl">
        <CardHeader className="flex flex-col gap-2 py-3">
          <CardTitle className="text-sm text-[#2e75ba]">Timeline de deals</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold">Semaforo:</span>
            <SlaChip status="GREEN" label="En tiempo" />
            <SlaChip status="YELLOW" label="Sin respuesta / cerca SLA" />
            <SlaChip status="RED" label="Vencido o sin accion" />
          </div>
          <div className="sticky top-2 z-10 grid gap-2 rounded-lg border border-slate-200 bg-white/95 p-2 backdrop-blur md:grid-cols-[1fr_auto_auto_auto]">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar cliente, servicio o responsable"
              className="h-[var(--crm-control-h)] rounded-lg border border-slate-200 px-3 text-sm"
            />
            <select
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
              className="h-[var(--crm-control-h)] rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="ALL">Todas las etapas</option>
              {CRM_STAGE_ORDER.map((stage) => (
                <option key={stage} value={stage}>
                  {CRM_STAGE_LABELS[stage]}
                </option>
              ))}
            </select>
            <button
              className={cn(
                "inline-flex h-[var(--crm-control-h)] items-center rounded-lg px-3 text-sm font-semibold",
                viewMode === "table"
                  ? "bg-[#2e75ba] text-white"
                  : "border border-slate-200 text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
              )}
              onClick={() => setViewMode("table")}
            >
              Tabla
            </button>
            <button
              className={cn(
                "inline-flex h-[var(--crm-control-h)] items-center rounded-lg px-3 text-sm font-semibold",
                viewMode === "kanban"
                  ? "bg-[#2e75ba] text-white"
                  : "border border-slate-200 text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
              )}
              onClick={() => setViewMode("kanban")}
            >
              Kanban
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {viewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs uppercase tracking-[0.08em] text-[#2e75ba]">
                  <tr>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Servicios</th>
                    <th className="px-3 py-2">Ingreso</th>
                    <th className="px-3 py-2">Etapa</th>
                    <th className="px-3 py-2"># Cotizaciones</th>
                    <th className="px-3 py-2">Estado cotización</th>
                    <th className="px-3 py-2">Semáforo</th>
                    <th className="px-3 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white [&>tr:nth-child(even)]:bg-slate-50/30">
                  {loading && (
                    <tr>
                      <td className="px-3 py-3 text-slate-500" colSpan={9}>
                        Cargando deals...
                      </td>
                    </tr>
                  )}
                  {!loading && filteredRows.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-slate-500" colSpan={9}>
                        Sin deals activos.
                      </td>
                    </tr>
                  )}
                  {filteredRows.map((deal) => {
                    const parsed = parseNextAction(deal.nextAction);
                    const nextLabel = parsed.type ? nextActionLabel(parsed.type) : parsed.notes || "Sin accion";
                    const semaforo =
                      !deal.nextAction || !deal.nextActionAt ? "RED" : deal.slaStatus === "YELLOW" ? "YELLOW" : deal.slaStatus;
                    const services = deal.services?.map((service) => service.serviceType).join(", ") || "-";
                    return (
                      <tr key={deal.id} className="h-[var(--crm-row-h)] cursor-pointer" onClick={() => openActions(deal)}>
                        <td className="px-3 py-2 font-semibold text-slate-900">{getClientName(deal)}</td>
                        <td className="px-3 py-2 text-slate-600">{deal.pipelineType === "B2B" ? "Empresa" : "Paciente"}</td>
                        <td className="px-3 py-2 text-slate-600">{services}</td>
                        <td className="px-3 py-2 text-slate-600">{deal.capturedAt ? formatDateTime(deal.capturedAt) : "-"}</td>
                        <td className="px-3 py-2 text-slate-600">{CRM_STAGE_LABELS[deal.stage as keyof typeof CRM_STAGE_LABELS]}</td>
                        <td className="px-3 py-2 text-slate-600">{deal.quoteCount ?? 0}</td>
                        <td className="px-3 py-2 text-slate-600">{deal.quoteStatus || "SIN_COTIZAR"}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <SlaChip status={semaforo} label={semaforo === "RED" && (!deal.nextAction || !deal.nextActionAt) ? "Sin accion" : semaforo} />
                            <span className="text-[11px] text-slate-500">{nextLabel}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                            onClick={(event) => {
                              event.stopPropagation();
                              openActions(deal);
                            }}
                          >
                            Abrir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto p-3">
              <div className="grid min-w-[980px] grid-cols-8 gap-3">
                {kanbanColumns.map((column) => (
                  <div key={column.stage} className="space-y-2 rounded-xl border border-slate-200 bg-[#F8FAFC] p-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#2e75ba]">{column.label}</p>
                      <span className="text-[11px] text-slate-500">{column.deals.length}</span>
                    </div>
                    <div className="space-y-2">
                      {column.deals.map((deal) => {
                        const semaforo =
                          !deal.nextAction || !deal.nextActionAt ? "RED" : deal.slaStatus === "YELLOW" ? "YELLOW" : deal.slaStatus;
                        return (
                          <button
                            key={deal.id}
                            onClick={() => openActions(deal)}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-left shadow-sm hover:border-[#4aadf5]"
                          >
                            <p className="text-xs font-semibold text-slate-900">{getClientName(deal)}</p>
                            <p className="text-[11px] text-slate-500">{formatCurrency(deal.amount ?? deal.amountEstimated ?? 0)}</p>
                            <div className="mt-2">
                              <SlaChip status={semaforo} label={semaforo === "RED" ? "Sin accion" : semaforo} />
                            </div>
                          </button>
                        );
                      })}
                      {column.deals.length === 0 && <p className="text-[11px] text-slate-400">Sin deals</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={!!stageModal}
        onClose={() => setStageModal(null)}
        title="Mover etapa"
        subtitle={stageModal ? getClientName(stageModal.deal) : undefined}
        className="max-w-2xl"
        footer={
          <div className="flex items-center justify-between">
            {stageError && <p className="text-sm text-rose-600">{stageError}</p>}
            <div className="flex gap-2">
              <button
                className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-white"
                onClick={() => setStageModal(null)}
              >
                Cancelar
              </button>
              <button
                className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg bg-[#4aa59c] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#4aadf5]"
                onClick={handleStageSave}
              >
                Guardar
              </button>
            </div>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Etapa
            <select
              className="mt-2 h-[var(--crm-control-h)] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={stageForm.stage}
              onChange={(event) => setStageForm((prev) => ({ ...prev, stage: event.target.value }))}
            >
              {CRM_STAGE_ORDER.map((stageOption) => (
                <option key={stageOption} value={stageOption}>
                  {CRM_STAGE_LABELS[stageOption]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Tipo de accion
            <select
              className="mt-2 h-[var(--crm-control-h)] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={stageForm.nextActionType}
              onChange={(event) => setStageForm((prev) => ({ ...prev, nextActionType: event.target.value }))}
              disabled={["GANADO", "PERDIDO"].includes(stageForm.stage)}
            >
              {CRM_COMMUNICATION_OPTIONS.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Fecha y hora
            <input
              type="datetime-local"
              className="mt-2 h-[var(--crm-control-h)] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={stageForm.nextActionAt}
              onChange={(event) => setStageForm((prev) => ({ ...prev, nextActionAt: event.target.value }))}
              disabled={["GANADO", "PERDIDO"].includes(stageForm.stage)}
            />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Notas
            <input
              type="text"
              className="mt-2 h-[var(--crm-control-h)] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={stageForm.nextActionNotes}
              onChange={(event) => setStageForm((prev) => ({ ...prev, nextActionNotes: event.target.value }))}
              disabled={["GANADO", "PERDIDO"].includes(stageForm.stage)}
            />
          </label>
        </div>

        {stageForm.stage === "PERDIDO" && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Motivo de perdida
              <select
                className="mt-2 h-[var(--crm-control-h)] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={stageForm.lostReason}
                onChange={(event) => setStageForm((prev) => ({ ...prev, lostReason: event.target.value }))}
              >
                <option value="">Selecciona</option>
                {CRM_LOST_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">Motivo obligatorio para control comercial</p>
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Nota (opcional)
              <input
                type="text"
                className="mt-2 h-[var(--crm-control-h)] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={stageForm.lostNotes}
                onChange={(event) => setStageForm((prev) => ({ ...prev, lostNotes: event.target.value }))}
              />
            </label>
          </div>
        )}
      </Modal>

      <CrmDealDrawer
        open={!!actionDeal}
        onClose={() => setActionDeal(null)}
        deal={actionDeal}
        normalizedType={normalizedType}
        actionError={actionError}
        activityContent={
          actionDeal ? (
            <div className="space-y-1 text-xs text-slate-600">
              <p>
                Etapa actual:{" "}
                <span className="font-semibold text-slate-800">
                  {CRM_STAGE_LABELS[actionDeal.stage as keyof typeof CRM_STAGE_LABELS] || actionDeal.stage}
                </span>
              </p>
              <p>
                Próxima acción:{" "}
                {actionDeal.nextActionAt ? `${actionDeal.nextAction || "Acción"} · ${formatDateTime(actionDeal.nextActionAt)}` : "Sin acción programada"}
              </p>
            </div>
          ) : undefined
        }
        tasksContent={
          actionDeal ? (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500">Requiere fecha de último contacto. Programa cierre en 7 días y semáforo rojo.</p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="datetime-local"
                  className="h-[var(--crm-control-h)] flex-1 min-w-[180px] rounded-lg border border-slate-200 px-3 text-xs"
                  value={noResponseDate}
                  onChange={(event) => setNoResponseDate(event.target.value)}
                />
                <button
                  className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                  onClick={handleNoResponse}
                >
                  Marcar no responde
                </button>
              </div>
            </div>
          ) : undefined
        }
        quotesContent={
          actionDeal ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-600">Sin PDFs manuales. Usa flujo interno y monto bloqueado.</p>
                <Link
                  href={`/admin/crm/deal/${actionDeal.id}?type=${normalizedType}#cotizaciones`}
                  className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg bg-[#4aa59c] px-3 text-xs font-semibold text-white hover:bg-[#4aadf5]"
                >
                  Crear cotización
                </Link>
              </div>
              {quotesLoading && <p className="text-xs text-slate-500">Cargando cotizaciones...</p>}
              {!quotesLoading && quotes.length === 0 && <p className="text-xs text-slate-500">Sin cotizaciones registradas.</p>}
              {!quotesLoading &&
                quotes.map((quote) => {
                  const linkedServices =
                    quote.requests?.flatMap((quoteRequest: any) => quoteRequest.services || []) ||
                    actionDeal.services?.map((service) => service.serviceType) ||
                    [];
                  const labelServices =
                    linkedServices.length > 0 ? Array.from(new Set(linkedServices)).join(", ") : "Sin servicios vinculados";
                  return (
                    <div key={quote.id} className="rounded-lg border border-slate-200 p-2">
                      <p className="text-xs font-semibold text-slate-800">
                        #{quote.number} · {quote.status}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Estado: {quote.status} · Total: {formatCurrency(quote.total)} · Servicios: {labelServices}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg bg-[#4aa59c] px-3 text-[11px] font-semibold text-white hover:bg-[#4aadf5] disabled:opacity-50"
                          onClick={() => handleApproveQuote(quote.id)}
                          disabled={quote.status === "APPROVED" || !isAdmin}
                          title={!isAdmin ? "Acción solo para administrador." : quote.status === "APPROVED" ? "Ya aprobada" : undefined}
                        >
                          Aprobar
                        </button>
                        <button
                          className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                          onClick={() => handleRejectQuote(quote.id)}
                          disabled={!isAdmin}
                          title={!isAdmin ? "Acción solo para administrador." : undefined}
                        >
                          Rechazar
                        </button>
                        <button
                          className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                          onClick={() => handleCloneQuote(quote.id)}
                        >
                          Clonar
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : undefined
        }
        closingContent={
          actionDeal ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba] disabled:opacity-60"
                  onClick={() => openStageModal(actionDeal, "NEGOCIACION")}
                  disabled={!actionDeal.quoteCount || actionDeal.quoteStatus !== "APPROVED"}
                >
                  Pasar a negociacion
                </button>
                <button
                  className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg bg-[#4aa59c] px-3 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-60"
                  onClick={() => openStageModal(actionDeal, "GANADO")}
                  disabled={!isAdmin || actionDeal.quoteStatus !== "APPROVED"}
                  title={
                    !isAdmin
                      ? "Acción solo para administrador."
                      : actionDeal.quoteStatus !== "APPROVED"
                        ? "Requiere cotización aprobada y activa"
                        : undefined
                  }
                >
                  Cerrar como ganado
                </button>
                <button
                  className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                  onClick={() => openStageModal(actionDeal, "PERDIDO")}
                >
                  Cerrar como perdido
                </button>
              </div>
              <p className="text-[11px] text-slate-500">GANADO requiere cotización aprobada por ADMIN. PERDIDO requiere motivo obligatorio.</p>
            </div>
          ) : undefined
        }
        extraContent={
          actionDeal ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-[#2e75ba]">Solicitudes del cliente</p>
                  <p className="text-[11px] text-slate-500">Describe necesidades y vincula cotizaciones.</p>
                </div>
                <p className="text-[11px] text-slate-500">Estado: pendiente / cotizada</p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700">Servicios solicitados</p>
                  <div className="flex flex-wrap gap-2">
                    {serviceOptions.map((service) => {
                      const active = requestForm.services.includes(service.value);
                      return (
                        <button
                          key={service.value}
                          className={cn(
                            "inline-flex h-[var(--crm-control-h)] items-center rounded-lg border px-3 text-[11px] font-semibold",
                            active ? "border-[#2e75ba] bg-[#2e75ba] text-white" : "border-slate-200 text-slate-700"
                          )}
                          onClick={() =>
                            setRequestForm((prev) => ({
                              ...prev,
                              services: active ? prev.services.filter((value) => value !== service.value) : [...prev.services, service.value]
                            }))
                          }
                        >
                          {service.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="text-xs font-semibold text-slate-700">
                  Descripción
                  <textarea
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    rows={3}
                    value={requestForm.description}
                    onChange={(event) => setRequestForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </label>
              </div>
              {requestError && <p className="text-xs text-rose-600">{requestError}</p>}
              <div className="flex justify-end">
                <button
                  className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg bg-[#4aa59c] px-3 text-xs font-semibold text-white hover:bg-[#4aadf5]"
                  onClick={handleCreateRequest}
                >
                  Registrar solicitud
                </button>
              </div>
              <div className="space-y-2">
                {requestsLoading && <p className="text-xs text-slate-500">Cargando solicitudes...</p>}
                {!requestsLoading && requests.length === 0 && <p className="text-xs text-slate-500">Sin solicitudes registradas.</p>}
                {!requestsLoading &&
                  requests.map((request: any) => (
                    <div key={request.id} className="rounded-lg border border-slate-200 p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{request.description}</p>
                          <p className="text-[11px] text-slate-500">
                            Servicios: {(request.services || []).join(", ")} · Estado: {request.status}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            className="h-[var(--crm-control-h)] rounded-lg border border-slate-200 px-3 text-[11px]"
                            value={requestLinks[request.id] || ""}
                            onChange={(event) => setRequestLinks((prev) => ({ ...prev, [request.id]: event.target.value }))}
                          >
                            <option value="">Vincular a cotización</option>
                            {quotes.map((quote) => (
                              <option key={quote.id} value={quote.id}>
                                #{quote.number} · {quote.status}
                              </option>
                            ))}
                          </select>
                          <button
                            className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                            onClick={() => handleLinkRequest(request.id)}
                          >
                            Vincular
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : undefined
        }
      />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
