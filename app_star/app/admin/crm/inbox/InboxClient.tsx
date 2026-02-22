"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import {
  CRM_COMMUNICATION_OPTIONS,
  CRM_PIPELINE_TYPES,
  CRM_STAGE_LABELS,
  CRM_LOST_REASONS,
  formatNextAction,
  nextActionLabel,
  parseNextAction
} from "@/lib/crmConfig";
import { formatCurrency, formatDateTime, formatShortDate } from "@/lib/crmFormat";
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
  quoteCount?: number;
  quoteStatus?: string;
  latestQuoteId?: string | null;
  missingAction?: boolean;
  account?: { id: string; name: string | null } | null;
  contact?: { id: string; firstName: string | null; lastName?: string | null } | null;
};

type Quote = {
  id: string;
  quoteNumber: string;
  number?: string;
  status: string;
  createdAt: string;
  total: number;
  deal?: Deal | null;
};

type InboxSummary = {
  pipelineActive: { total: number; count: number };
  risk: { total: number; count: number };
  nextActionsToday: number;
  wonThisMonth: { total: number; count: number };
};

type InboxData = {
  summary: InboxSummary;
  riskDeals: Deal[];
  nextActions: Deal[];
  quoteFollowups: Quote[];
};

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
    <span className={cn("rounded-full border px-2 py-1 text-[11px] font-semibold", colors)}>
      {label || status || "-"}
    </span>
  );
}

export default function CrmInboxPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Cargando CRM...</div>}>
      <CrmInboxPageContent />
    </Suspense>
  );
}

function CrmInboxPageContent() {
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

  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextActionModal, setNextActionModal] = useState<{
    deal: Deal;
    mode: "done" | "reprogram";
  } | null>(null);
  const [nextActionForm, setNextActionForm] = useState({ type: "CALL", dueAt: "", notes: "" });
  const [nextActionError, setNextActionError] = useState<string | null>(null);
  const [actionDeal, setActionDeal] = useState<Deal | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
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
  const [infoNote, setInfoNote] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setInfoNote(null);
    try {
      const json = await fetchJson(`/api/crm/deals/inbox?type=${normalizedType}`);
      const mapped: InboxData = {
        summary: json.data?.summary,
        riskDeals: (json.data?.riskDeals || []).map((deal: any) => ({
          ...deal,
          amount: deal.amount ?? deal.amountEstimated ?? 0
        })),
        nextActions: (json.data?.nextActions || []).map((deal: any) => ({
          ...deal,
          amount: deal.amount ?? deal.amountEstimated ?? 0
        })),
        quoteFollowups: json.data?.quoteFollowups || []
      };
      setData(mapped);
      setInfoNote(json.note || null);
    } catch (err: any) {
      const message = normalizeError(err, "No se pudo cargar la bandeja");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [normalizedType, fetchJson, normalizeError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = data?.summary;

  const openNextActionModal = (deal: Deal, mode: "done" | "reprogram") => {
    const parsed = parseNextAction(deal.nextAction);
    const baseDate = deal.nextActionAt ? new Date(deal.nextActionAt) : new Date();
    if (mode === "done") baseDate.setDate(baseDate.getDate() + 1);
    setNextActionForm({
      type: parsed.type || "CALL",
      dueAt: toDateTimeLocalValue(baseDate),
      notes: parsed.notes || ""
    });
    setNextActionError(null);
    setNextActionModal({ deal, mode });
  };

  const openActions = (deal: Deal) => {
    setActionDeal(deal);
    setRejectReason("");
    setActionError(null);
  };

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
      await loadData();
    } catch (err: any) {
      const message = normalizeError(err, "No se pudo mover la etapa");
      setStageError(message);
    }
  };

  const handleSaveNextAction = async () => {
    if (!nextActionModal) return;
    setNextActionError(null);
    const dueAtIso = toISOStringFromLocal(nextActionForm.dueAt);
    if (!nextActionForm.type) {
      setNextActionError("Selecciona el tipo de accion.");
      return;
    }
    if (!dueAtIso) {
      setNextActionError("Selecciona fecha y hora.");
      return;
    }
    try {
      if (nextActionModal.mode === "done") {
        const activityType = nextActionForm.type === "MEETING" ? "VISIT" : nextActionForm.type;
        await fetchJson("/api/crm/activities", {
          method: "POST",
          body: JSON.stringify({
            dealId: nextActionModal.deal.id,
            type: activityType,
            dateTime: new Date().toISOString(),
            summary: "Accion completada",
            notes: nextActionForm.notes || null
          })
        });
      }
      await fetchJson("/api/crm/deals", {
        method: "PATCH",
        body: JSON.stringify({
          id: nextActionModal.deal.id,
          nextAction: formatNextAction(nextActionForm.type, nextActionForm.notes),
          nextActionAt: dueAtIso
        })
      });
      setNextActionModal(null);
      await loadData();
    } catch (err: any) {
      const message = normalizeError(err, "No se pudo guardar la accion");
      setNextActionError(message);
    }
  };

  const cards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Pipeline activo", value: formatCurrency(summary.pipelineActive.total), meta: `${summary.pipelineActive.count} deals` },
      { label: "En riesgo SLA", value: formatCurrency(summary.risk.total), meta: `${summary.risk.count} deals` },
      { label: "Pendientes hoy", value: `${summary.nextActionsToday}`, meta: "Next actions" },
      { label: "Ganadas mes", value: formatCurrency(summary.wonThisMonth.total), meta: `${summary.wonThisMonth.count} deals` }
    ];
  }, [summary]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3rem] text-slate-400">CRM - Bandeja</p>
          <h1 className="text-2xl font-semibold text-slate-900">{pipelineTypeLabel}</h1>
          <p className="text-sm text-slate-500">Prioriza riesgo, ejecuta la proxima accion y cierra deals.</p>
          <p className="text-xs text-slate-500">Este monto se calcula automáticamente desde cotizaciones aprobadas.</p>
        </div>
        <Link
          href={`/admin/crm/new?type=${normalizedType}`}
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800"
        >
          Nueva negociacion
        </Link>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {infoNote && <p className="text-sm text-amber-700">{infoNote}</p>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18rem] text-slate-400">{card.label}</p>
              <p className="text-2xl font-semibold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500">{card.meta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center gap-2">
          <CardTitle>Semaforo</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <SlaChip status="GREEN" label="En tiempo" />
            <SlaChip status="YELLOW" label="Sin respuesta / cerca SLA" />
            <SlaChip status="RED" label="SLA vencido o sin proxima accion" />
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>En riesgo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <p className="text-sm text-slate-500">Cargando deals en riesgo...</p>}
            {!loading && data?.riskDeals?.length === 0 && <p className="text-sm text-slate-500">Sin deals en riesgo.</p>}
            {data?.riskDeals?.map((deal) => (
              <div key={deal.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{getClientName(deal)}</p>
                  <p className="text-xs text-slate-500">
                    {CRM_STAGE_LABELS[deal.stage as keyof typeof CRM_STAGE_LABELS]} - {formatCurrency(deal.amount ?? deal.amountEstimated ?? 0)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <SlaChip
                    status={deal.missingAction || !deal.nextAction || !deal.nextActionAt ? "RED" : deal.slaStatus}
                    label={deal.missingAction || !deal.nextAction || !deal.nextActionAt ? "Sin accion" : deal.slaStatus}
                  />
                  <div className="text-xs text-slate-500">
                    {deal.nextActionAt ? formatDateTime(deal.nextActionAt) : "Sin accion"}
                  </div>
                  <button
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => openActions(deal)}
                  >
                    Acciones
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proximas acciones (hoy)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <p className="text-sm text-slate-500">Cargando acciones...</p>}
            {!loading && data?.nextActions?.length === 0 && <p className="text-sm text-slate-500">Sin acciones hoy.</p>}
            {data?.nextActions?.map((deal) => {
              const parsed = parseNextAction(deal.nextAction);
              const nextLabel = parsed.type ? nextActionLabel(parsed.type) : parsed.notes || "Sin accion";
              const timeLabel = deal.nextActionAt ? new Date(deal.nextActionAt).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" }) : "-";
              const missing = deal.missingAction || !deal.nextAction || !deal.nextActionAt;
              return (
                <div key={deal.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{getClientName(deal)}</p>
                      <p className="text-xs text-slate-500">
                        {timeLabel} - {nextLabel}
                      </p>
                    </div>
                    <SlaChip status={missing ? "RED" : deal.slaStatus} label={missing ? "Sin accion" : deal.slaStatus} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
                      onClick={() => openNextActionModal(deal, "done")}
                    >
                      Marcar hecho
                    </button>
                    <button
                      className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
                      onClick={() => openNextActionModal(deal, "reprogram")}
                    >
                      Reprogramar
                    </button>
                    <button
                      className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
                      onClick={() => openActions(deal)}
                    >
                      Acciones
                    </button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cotizaciones sin respuesta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-slate-500">Cargando cotizaciones...</p>}
          {!loading && data?.quoteFollowups?.length === 0 && <p className="text-sm text-slate-500">Sin cotizaciones pendientes.</p>}
          {data?.quoteFollowups?.map((quote) => (
            <div key={quote.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Cotizacion #{quote.quoteNumber} - {quote.deal ? getClientName(quote.deal as Deal) : "Sin cliente"}
                </p>
                <p className="text-xs text-slate-500">
                  Enviada {formatShortDate(quote.createdAt)} - {formatCurrency((quote as any).total ?? 0)}
                </p>
              </div>
              {quote.deal ? (
                <button
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() =>
                      openActions({
                        ...(quote.deal as Deal),
                        amount: (quote.deal as any).amount ?? (quote as any).total ?? 0,
                        quoteStatus: quote.status,
                        latestQuoteId: quote.id,
                        quoteCount: (quote.deal as any)?._count?.quotesV2 ?? 1
                      })
                    }
                >
                  Acciones
                </button>
              ) : (
                <span className="text-xs text-slate-500">Sin deal</span>
              )}
            </div>
          ))}
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
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                onClick={() => setStageModal(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800"
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
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={stageForm.stage}
              onChange={(event) => setStageForm((prev) => ({ ...prev, stage: event.target.value }))}
            >
              {Object.keys(CRM_STAGE_LABELS).map((stageOption) => (
                <option key={stageOption} value={stageOption}>
                  {CRM_STAGE_LABELS[stageOption as keyof typeof CRM_STAGE_LABELS]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Tipo de accion
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
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
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={stageForm.nextActionAt}
              onChange={(event) => setStageForm((prev) => ({ ...prev, nextActionAt: event.target.value }))}
              disabled={["GANADO", "PERDIDO"].includes(stageForm.stage)}
            />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Notas
            <input
              type="text"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
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
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
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
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={stageForm.lostNotes}
                onChange={(event) => setStageForm((prev) => ({ ...prev, lostNotes: event.target.value }))}
              />
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={!!actionDeal}
        onClose={() => setActionDeal(null)}
        title="Acciones del deal"
        subtitle={actionDeal ? getClientName(actionDeal) : undefined}
        className="max-w-2xl"
        footer={
          <div className="flex items-center justify-between">
            {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
            <button
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
              onClick={() => setActionDeal(null)}
            >
              Cerrar
            </button>
          </div>
        }
      >
        {actionDeal && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/crm/deal/${actionDeal.id}?type=${normalizedType}`}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ver historial completo
              </Link>
              <Link
                href={`/admin/crm/deal/${actionDeal.id}?type=${normalizedType}#cotizaciones`}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ver cotizaciones
              </Link>
              <Link
                href={`/admin/crm/deal/${actionDeal.id}?type=${normalizedType}#cotizaciones`}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Crear nueva cotizacion
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                onClick={() => openStageModal(actionDeal, "NEGOCIACION")}
                disabled={!actionDeal.quoteCount || actionDeal.quoteStatus !== "APPROVED"}
              >
                Pasar a negociacion
              </button>
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
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
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => openStageModal(actionDeal, "PERDIDO")}
              >
                Cerrar como perdido
              </button>
            </div>
            <div className="space-y-2 rounded-2xl border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-800">Cotizacion activa</p>
              <p className="text-xs text-slate-500">
                Estado: {actionDeal.quoteStatus || "SIN_COTIZAR"} · Total estimado: {formatCurrency(actionDeal.amount ?? actionDeal.amountEstimated ?? 0)}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  onClick={async () => {
                    if (!actionDeal.latestQuoteId) {
                      setActionError("No hay cotizacion para aprobar");
                      return;
                    }
                    if (!isAdmin) {
                      const message = "Acción solo para administrador.";
                      setActionError(message);
                      showToast(message, "error");
                      return;
                    }
                    try {
                      setActionError(null);
                      await fetchJson(`/api/crm/quotes-v2/${actionDeal.latestQuoteId}/approve`, { method: "POST" });
                      await loadData();
                      setActionDeal(null);
                      showToast("Cotización aprobada", "success");
                    } catch (err: any) {
                      const message = normalizeError(err, "No se pudo aprobar");
                      setActionError(message);
                    }
                  }}
                  disabled={!actionDeal.latestQuoteId || !isAdmin}
                  title={!isAdmin ? "Acción solo para administrador." : undefined}
                >
                  Marcar aprobada
                </button>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <input
                    className="flex-1 min-w-[160px] rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    placeholder="Motivo rechazo"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <button
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    onClick={async () => {
                      if (!actionDeal.latestQuoteId) {
                        setActionError("No hay cotizacion para rechazar");
                        return;
                      }
                      if (!rejectReason.trim()) {
                        setActionError("Motivo obligatorio para rechazar");
                        return;
                      }
                      if (!isAdmin) {
                        const message = "Acción solo para administrador.";
                        setActionError(message);
                        showToast(message, "error");
                        return;
                      }
                      try {
                        setActionError(null);
                        await fetchJson(`/api/crm/quotes-v2/${actionDeal.latestQuoteId}/reject`, {
                          method: "POST",
                          body: JSON.stringify({ rejectionReason: rejectReason })
                        });
                        await loadData();
                        setActionDeal(null);
                        showToast("Cotización rechazada", "success");
                      } catch (err: any) {
                        const message = normalizeError(err, "No se pudo rechazar");
                        setActionError(message);
                      }
                    }}
                    disabled={!actionDeal.latestQuoteId || !isAdmin}
                    title={!isAdmin ? "Acción solo para administrador." : undefined}
                  >
                    Marcar rechazada
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!nextActionModal}
        onClose={() => setNextActionModal(null)}
        title={nextActionModal?.mode === "done" ? "Accion completada" : "Reprogramar accion"}
        subtitle={nextActionModal ? getClientName(nextActionModal.deal) : undefined}
        className="max-w-2xl"
        footer={
          <div className="flex items-center justify-between">
            {nextActionError && <p className="text-sm text-rose-600">{nextActionError}</p>}
            <div className="flex gap-2">
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                onClick={() => setNextActionModal(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800"
                onClick={handleSaveNextAction}
              >
                Guardar
              </button>
            </div>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Tipo
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={nextActionForm.type}
              onChange={(event) => setNextActionForm((prev) => ({ ...prev, type: event.target.value }))}
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
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={nextActionForm.dueAt}
              onChange={(event) => setNextActionForm((prev) => ({ ...prev, dueAt: event.target.value }))}
            />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Notas
            <input
              type="text"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Agrega contexto para la proxima accion"
              value={nextActionForm.notes}
              onChange={(event) => setNextActionForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </label>
        </div>
      </Modal>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
