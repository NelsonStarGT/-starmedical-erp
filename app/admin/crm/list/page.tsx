"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { CRM_PIPELINE_TYPES, CRM_STAGE_LABELS, CrmStage, nextActionLabel, parseNextAction } from "@/lib/crmConfig";
import { formatCurrency, formatDateTime, formatSlaRemaining } from "@/lib/crmFormat";
import { formatNextAction, toDateTimeLocalValue, toISOStringFromLocal } from "@/lib/datetime";

type Deal = {
  id: string;
  stage: string;
  pipelineType: "B2B" | "B2C";
  amount: number;
  amountEstimated?: number;
  slaStatus: "GREEN" | "YELLOW" | "RED";
  stageEnteredAt: string;
  nextAction?: string | null;
  nextActionAt?: string | null;
  missingAction?: boolean;
  ownerId?: string | null;
  quoteCount?: number;
  quoteStatus?: string;
  latestQuoteId?: string | null;
  account?: { id: string; name: string | null } | null;
  contact?: { id: string; firstName: string | null; lastName?: string | null } | null;
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

export default function CrmListPage() {
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
  const [actionDeal, setActionDeal] = useState<Deal | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
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
      const message = normalizeError(err, "No se pudo cargar la lista");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [normalizedType, fetchJson, normalizeError]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const rows = useMemo(() => deals, [deals]);

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
      await loadDeals();
    } catch (err: any) {
      const message = normalizeError(err, "No se pudo mover la etapa");
      setStageError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3rem] text-slate-400">CRM - Worklist</p>
          <h1 className="text-2xl font-semibold text-slate-900">{pipelineTypeLabel}</h1>
          <p className="text-sm text-slate-500">Vista limpia con proxima accion y SLA visible.</p>
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

      <Card>
        <CardHeader className="flex flex-wrap items-center gap-2">
          <CardTitle>Semaforo</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <SlaChip status="GREEN" label="En tiempo" />
            <SlaChip status="YELLOW" label="Sin respuesta / cerca SLA" />
            <SlaChip status="RED" label="Vencido o sin accion" />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deals activos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Etapa</th>
                  <th className="px-4 py-3">Q estimado</th>
                  <th className="px-4 py-3">Proxima accion</th>
                  <th className="px-4 py-3">SLA</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading && (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={7}>
                      Cargando deals...
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={7}>
                      Sin deals activos.
                    </td>
                  </tr>
                )}
                {rows.map((deal) => {
                  const parsed = parseNextAction(deal.nextAction);
                  const nextLabel = parsed.type ? nextActionLabel(parsed.type) : parsed.notes || "Sin accion";
                  const semaforo =
                    deal.missingAction || !deal.nextAction || !deal.nextActionAt
                      ? "RED"
                      : deal.slaStatus === "YELLOW"
                        ? "YELLOW"
                        : deal.slaStatus;
                  return (
                    <tr key={deal.id}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{getClientName(deal)}</td>
                      <td className="px-4 py-3 text-slate-600">{CRM_STAGE_LABELS[deal.stage as keyof typeof CRM_STAGE_LABELS]}</td>
                      <td className="px-4 py-3 text-slate-700">{formatCurrency(deal.amount ?? deal.amountEstimated ?? 0)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="text-xs font-semibold text-slate-800">{nextLabel}</div>
                        <div className="text-xs text-slate-500">
                          {deal.nextActionAt ? formatDateTime(deal.nextActionAt) : "Sin accion"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <SlaChip
                            status={semaforo}
                            label={semaforo === "RED" && (!deal.nextAction || !deal.nextActionAt) ? "Sin accion" : semaforo}
                          />
                          <span className="text-xs text-slate-500">
                            {formatSlaRemaining(deal.stage as CrmStage, deal.stageEnteredAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{deal.ownerId || "Ventas"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <button
                            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            onClick={() => openActions(deal)}
                          >
                            Acciones
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
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
                      await loadDeals();
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
                        await loadDeals();
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
              {["NUEVO", "CONTACTADO", "DIAGNOSTICO", "COTIZACION", "NEGOCIACION", "GANADO", "PERDIDO"].map((stageOption) => (
                <option key={stageOption} value={stageOption}>
                  {stageOption}
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
              {["CALL", "WHATSAPP", "EMAIL", "VISIT", "VIDEO"].map((type) => (
                <option key={type} value={type}>
                  {type}
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
                {["Precio", "Competencia", "Sin respuesta", "Sin presupuesto", "Sin tiempo", "Otro"].map((reason) => (
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
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
