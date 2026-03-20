"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import {
  CRM_COMMUNICATION_OPTIONS,
  CRM_STAGE_LABELS,
  CrmStage,
  formatNextAction,
  nextActionLabel,
  parseNextAction
} from "@/lib/crmConfig";
import { formatCurrency, formatDateTime, formatSlaRemaining } from "@/lib/crmFormat";
import { toDateTimeLocalValue, toISOStringFromLocal } from "@/lib/date";

type Activity = {
  id: string;
  type: string;
  dateTime: string;
  summary?: string | null;
  notes?: string | null;
};

type Quote = {
  id: string;
  quoteNumber: number;
  versionLabel?: string | null;
  status: string;
  totalAmount: number;
  createdAt: string;
};

type QuoteV2Item = {
  id: string;
  category: string;
  productName: string;
  enlace?: string | null;
  refCode?: string | null;
  description?: string | null;
  qty: number;
  unitPrice: number;
  discountPct?: number | null;
  lineTotal: number;
};

type QuoteV2 = {
  id: string;
  number: string;
  status: string;
  type?: string;
  total: number;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  createdAt: string;
  isActive: boolean;
  items: QuoteV2Item[];
  pdfUrl?: string | null;
  pdfGeneratedAt?: string | null;
};

type QuoteDeliveryLog = {
  id: string;
  channel: string;
  status: string;
  to: any;
  cc?: any;
  bcc?: any;
  subject?: string;
  provider?: string;
  providerMessageId?: string | null;
  pdfUrl?: string;
  pdfHash?: string;
  createdAt: string;
  sentAt?: string | null;
  failedAt?: string | null;
  errorMessage?: string | null;
};

type DealDetail = {
  id: string;
  stage: string;
  pipelineType: "B2B" | "B2C";
  amount: number;
  amountEstimated?: number;
  slaStatus: "GREEN" | "YELLOW" | "RED";
  stageEnteredAt: string;
  ownerId?: string | null;
  capturedById?: string | null;
  capturedAt?: string | null;
  preferredChannel?: string | null;
  preferredAt?: string | null;
  status?: string | null;
  nextAction?: string | null;
  nextActionAt?: string | null;
  expectedCloseDate?: string | null;
  account?: { id: string; name: string | null } | null;
  contact?: { id: string; firstName: string | null; lastName?: string | null; phone?: string | null; email?: string | null; phonesJson?: any } | null;
  services?: { id: string; serviceType: string }[];
  servicesOtherNote?: string | null;
  activities?: Activity[];
  quotes?: Quote[];
  calendarEvents?: { id: string; type: string; startAt: string }[];
  missingAction?: boolean;
};

function getClientName(deal: DealDetail) {
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
  return <span className={cn("rounded-full border px-2 py-1 text-[11px] font-semibold", colors)}>{label || status || "-"}</span>;
}

function DealDetailPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") || "b2b";
  const normalizedType = typeParam.toLowerCase() === "b2c" ? "b2c" : "b2b";
  const roleParam = searchParams.get("role");
  const userRole = (roleParam || "Administrador").trim();
  const isAdmin = userRole.toLowerCase() === "administrador";
  const baseHeaders = useMemo(() => ({ "x-role": userRole, "Content-Type": "application/json" }), [userRole]);
  const dealId = params.id as string;
  const { toasts, showToast, dismiss } = useToast();

  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ mode: "done" | "reprogram" } | null>(null);
  const [actionForm, setActionForm] = useState({ type: "CALL", dueAt: "", notes: "" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expectedClose, setExpectedClose] = useState("");
  const [quotesV2, setQuotesV2] = useState<QuoteV2[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteUploadType, setQuoteUploadType] = useState<"B2B" | "B2C">(normalizedType === "b2c" ? "B2C" : "B2B");
  const [quoteFile, setQuoteFile] = useState<File | null>(null);
  const [quoteNotes, setQuoteNotes] = useState("");
  const [quoteDeclaredTotal, setQuoteDeclaredTotal] = useState("");
  const [uploadingQuote, setUploadingQuote] = useState(false);
  const [contactPhones, setContactPhones] = useState<Array<{ country: string; number: string }>>([]);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSaving, setContactSaving] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const isSupervisor = userRole.toLowerCase() === "supervisor";
  const canApprove = isAdmin || isSupervisor;
  const [deliveries, setDeliveries] = useState<Record<string, QuoteDeliveryLog[]>>({});
  const [deliveriesLoading, setDeliveriesLoading] = useState<Record<string, boolean>>({});
  const [sendModal, setSendModal] = useState<{
    quoteId: string;
    to: string;
    cc: string;
    bcc: string;
    subject: string;
    body: string;
  } | null>(null);
  const [sendingQuote, setSendingQuote] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const quotesRef = useRef<HTMLDivElement | null>(null);
  const quoteV2Enabled = process.env.NEXT_PUBLIC_QUOTE_V2_ENABLED !== "false";

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

  const hydrateContactPhones = useCallback((contact?: DealDetail["contact"]) => {
    const fromJson =
      Array.isArray(contact?.phonesJson) && contact.phonesJson.length
        ? contact.phonesJson.map((p: any) => ({
            country: String(p.country || "+502"),
            number: String(p.number || "")
          }))
        : [];
    if (fromJson.length) return fromJson;
    if (contact?.phone) {
      const parts = String(contact.phone).trim().split(" ");
      const country = parts[0]?.startsWith("+") ? parts[0] : "+502";
      const number = parts.slice(parts[0]?.startsWith("+") ? 1 : 0).join(" ") || contact.phone;
      return [{ country, number }];
    }
    return [{ country: "+502", number: "" }];
  }, []);

  const loadDeal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await fetchJson(`/api/crm/deals/${dealId}`);
      setDeal(json.data);
      setExpectedClose(toDateTimeLocalValue(json.data?.expectedCloseDate));
      setQuotesV2(json.data?.quotesV2 || []);
      setContactPhones(hydrateContactPhones(json.data?.contact));
    } catch (err: any) {
      const message = normalizeError(err, "No se pudo cargar el deal");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [dealId, fetchJson, hydrateContactPhones, normalizeError]);

  useEffect(() => {
    loadDeal();
  }, [loadDeal]);

  useEffect(() => {
    if (deal?.pipelineType === "B2C") {
      setQuoteUploadType("B2C");
    } else if (deal?.pipelineType === "B2B") {
      setQuoteUploadType("B2B");
    }
  }, [deal?.pipelineType]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#cotizaciones" && quotesRef.current) {
      quotesRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const parsedNextAction = useMemo(() => parseNextAction(deal?.nextAction), [deal?.nextAction]);
  const nextActionText = parsedNextAction.type ? nextActionLabel(parsedNextAction.type) : parsedNextAction.notes || "Sin accion";
  const renderStatusBadge = (status: string) => {
    const base = "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold";
    const map: Record<string, string> = {
      APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
      APPROVAL_PENDING: "border-amber-200 bg-amber-50 text-amber-800",
      SENT: "border-sky-200 bg-sky-50 text-sky-800",
      REJECTED: "border-rose-200 bg-rose-50 text-rose-800",
      DRAFT: "border-slate-200 bg-slate-50 text-slate-700"
    };
    return <span className={cn(base, map[status] || "border-slate-200 bg-slate-50 text-slate-700")}>{status}</span>;
  };

  const openActionModal = (mode: "done" | "reprogram") => {
    if (!deal) return;
    const baseDate = deal.nextActionAt ? new Date(deal.nextActionAt) : new Date();
    if (mode === "done") baseDate.setDate(baseDate.getDate() + 1);
    setActionForm({
      type: parsedNextAction.type || "CALL",
      dueAt: toDateTimeLocalValue(baseDate),
      notes: parsedNextAction.notes || ""
    });
    setActionError(null);
    setActionModal({ mode });
  };

  const handleSaveNextAction = async () => {
    if (!deal || !actionModal) return;
    setActionError(null);
    const dueAtIso = toISOStringFromLocal(actionForm.dueAt);
    if (!actionForm.type) {
      setActionError("Selecciona el tipo de accion.");
      return;
    }
    if (!dueAtIso) {
      setActionError("Selecciona fecha y hora.");
      return;
    }
    try {
      setSaving(true);
      if (actionModal.mode === "done") {
        const activityType = actionForm.type === "MEETING" ? "VISIT" : actionForm.type;
        await fetchJson("/api/crm/activities", {
          method: "POST",
          body: JSON.stringify({
            dealId: deal.id,
            type: activityType,
            dateTime: new Date().toISOString(),
            summary: "Accion completada",
            notes: actionForm.notes || null
          })
        });
      }
      await fetchJson("/api/crm/deals", {
        method: "PATCH",
        body: JSON.stringify({
          id: deal.id,
          nextAction: formatNextAction(actionForm.type, actionForm.notes),
          nextActionAt: dueAtIso
        })
      });
      setActionModal(null);
      await loadDeal();
    } catch (err: any) {
      const message = normalizeError(err, "No se pudo guardar la accion");
      setActionError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleOutcome = async (summary: string) => {
    if (!deal) return;
    try {
      setSaving(true);
      await fetchJson("/api/crm/activities", {
        method: "POST",
        body: JSON.stringify({
          dealId: deal.id,
          type: "SYSTEM",
          dateTime: new Date().toISOString(),
          summary
        })
      });
      await loadDeal();
      showToast("Seguimiento registrado", "success");
    } catch (err: any) {
      const message = normalizeError(err, "No se pudo registrar resultado");
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const loadQuotesV2 = useCallback(async () => {
    if (!deal) return;
    setQuotesLoading(true);
    setQuoteError(null);
    try {
      const res = await fetchJson(`/api/crm/quotes-v2?dealId=${deal.id}`);
      setQuotesV2(res.data || []);
    } catch (err: any) {
      const message = normalizeError(err, "No se pudieron cargar las cotizaciones. Reintenta. Si persiste, verifica permisos o sesión.");
      setQuoteError(message);
    } finally {
      setQuotesLoading(false);
    }
  }, [deal, fetchJson, normalizeError]);

  const onQuoteFileChange = (file: File | null) => {
    if (file && file.type && file.type !== "application/pdf") {
      const msg = "Solo se permiten archivos PDF.";
      setQuoteError(msg);
      showToast(msg, "error");
      return;
    }
    setQuoteError(null);
    setQuoteFile(file);
  };

  const uploadQuotePdf = async () => {
    if (!deal) return;
    if (!quoteFile) {
      const msg = "Sube el PDF de la cotización.";
      setQuoteError(msg);
      showToast(msg, "error");
      return;
    }
    if (quoteUploadType === "B2B" && (!quoteDeclaredTotal || Number(quoteDeclaredTotal) <= 0)) {
      const msg = "Ingresa el total negociado para cotizaciones B2B.";
      setQuoteError(msg);
      showToast(msg, "error");
      return;
    }
    try {
      setUploadingQuote(true);
      setQuoteError(null);
      const formData = new FormData();
      formData.append("dealId", deal.id);
      formData.append("type", quoteUploadType);
      if (quoteNotes.trim()) formData.append("notes", quoteNotes.trim());
      if (quoteDeclaredTotal.trim()) formData.append("total", quoteDeclaredTotal.trim());
      formData.append("pdf", quoteFile);

      const res = await fetch("/api/crm/quotes-v2/upload", {
        method: "POST",
        body: formData,
        headers: { "x-role": userRole }
      });
      const json = await res.json();
      if (!res.ok) {
        const error = new Error(json.error || "No se pudo crear la cotización.");
        (error as any).status = res.status;
        throw error;
      }

      setQuoteFile(null);
      setQuoteDeclaredTotal("");
      setQuoteNotes("");
      await loadQuotesV2();
      await loadDeal();
      showToast("Cotización guardada desde PDF.", "success");
    } catch (err: any) {
      const msg = normalizeError(err, "No se pudo crear la cotización.");
      setQuoteError(msg);
    } finally {
      setUploadingQuote(false);
    }
  };

  const addPhone = () => {
    setContactPhones((prev) => [...prev, { country: "+502", number: "" }]);
  };

  const updatePhone = (idx: number, patch: Partial<{ country: string; number: string }>) => {
    setContactPhones((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...patch, number: patch.number !== undefined ? patch.number : p.number } : p))
    );
  };

  const removePhone = (idx: number) => {
    setContactPhones((prev) => prev.filter((_, i) => i !== idx));
  };

  const makePrimaryPhone = (idx: number) => {
    setContactPhones((prev) => {
      if (idx === 0) return prev;
      const copy = [...prev];
      const [target] = copy.splice(idx, 1);
      return [target, ...copy];
    });
  };

  const savePhones = async () => {
    if (!deal?.contact?.id) {
      setContactError("No hay contacto asociado al deal.");
      return;
    }
    const cleaned = contactPhones
      .map((p) => ({ country: (p.country || "+502").trim(), number: (p.number || "").trim() }))
      .filter((p) => p.number.length > 0);
    const primary = cleaned[0] ? `${cleaned[0].country} ${cleaned[0].number}`.trim() : null;
    try {
      setContactSaving(true);
      setContactError(null);
      await fetchJson("/api/crm/contacts", {
        method: "PATCH",
        body: JSON.stringify({ id: deal.contact.id, phones: cleaned, phone: primary })
      });
      showToast("Teléfonos guardados", "success");
      await loadDeal();
    } catch (err: any) {
      const message = normalizeError(err, "No se pudieron guardar los teléfonos");
      setContactError(message);
    } finally {
      setContactSaving(false);
    }
  };

  const requestApproval = async (id: string) => {
    try {
      await fetchJson(`/api/crm/quotes-v2/${id}/request-approval`, { method: "POST" });
      await loadQuotesV2();
      showToast("Aprobación solicitada.", "success");
    } catch (err: any) {
      const msg = normalizeError(
        err,
        err?.message?.includes("403") ? "Acción solo para administrador." : "No se pudo solicitar aprobación."
      );
      setQuoteError(msg);
    }
  };

  const approveQuote = async (id: string) => {
    try {
      await fetchJson(`/api/crm/quotes-v2/${id}/approve`, { method: "POST" });
      await loadDeal();
      await loadQuotesV2();
      showToast("Cotización aprobada. Monto del deal actualizado.", "success");
    } catch (err: any) {
      const msg = normalizeError(
        err,
        err?.message?.includes("403") ? "Acción solo para administrador." : "No se pudo aprobar la cotización."
      );
      setQuoteError(msg);
    }
  };

  const rejectQuote = async (id: string) => {
    setRejectModal({ id });
    setRejectReason("");
  };

  const parseEmails = (value: string) =>
    value
      .split(/[,;\s]+/)
      .map((v) => v.trim())
      .filter(Boolean);

  const loadDeliveries = useCallback(
    async (quoteId: string) => {
      setDeliveriesLoading((prev) => ({ ...prev, [quoteId]: true }));
      try {
        const res = await fetchJson(`/api/crm/quotes-v2/${quoteId}/deliveries`);
        setDeliveries((prev) => ({ ...prev, [quoteId]: res.data || [] }));
      } catch (err: any) {
        const msg = normalizeError(err, "No se pudo cargar historial de envíos");
        setQuoteError(msg);
      } finally {
        setDeliveriesLoading((prev) => ({ ...prev, [quoteId]: false }));
      }
    },
    [fetchJson, normalizeError]
  );

  const openSendModal = (quote: QuoteV2) => {
    const defaultTo = deal?.contact?.email || (deal as any)?.account?.email || "";
    setSendError(null);
    setSendModal({
      quoteId: quote.id,
      to: defaultTo,
      cc: "",
      bcc: "",
      subject: `Cotización ${quote.number}`,
      body: `Hola,\n\nAdjuntamos la cotización ${quote.number}.\n\nGracias,\nEquipo StarMedical`
    });
    loadDeliveries(quote.id);
  };

  const handleSendQuote = async () => {
    if (!sendModal) return;
    const to = parseEmails(sendModal.to);
    const cc = parseEmails(sendModal.cc);
    const bcc = parseEmails(sendModal.bcc);
    if (!to.length) {
      setSendError("Ingresa al menos un destinatario válido.");
      return;
    }
    setSendError(null);
    const bodyHtml = sendModal.body
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<p>${line}</p>`)
      .join("");
    try {
      setSendingQuote(true);
      await fetchJson(`/api/crm/quotes-v2/${sendModal.quoteId}/send`, {
        method: "POST",
        body: JSON.stringify({
          channel: "EMAIL",
          to,
          cc: cc.length ? cc : undefined,
          bcc: bcc.length ? bcc : undefined,
          message: { subject: sendModal.subject, bodyText: sendModal.body, bodyHtml }
        })
      });
      await loadQuotesV2();
      await loadDeliveries(sendModal.quoteId);
      setSendModal(null);
      showToast("Cotización enviada", "success");
    } catch (err: any) {
      const msg = normalizeError(err, "No se pudo enviar la cotización");
      setSendError(msg);
    } finally {
      setSendingQuote(false);
    }
  };

  const confirmReject = async () => {
    if (!rejectModal) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setQuoteError("Motivo obligatorio para rechazo.");
      return;
    }
    try {
      setRejecting(true);
      await fetchJson(`/api/crm/quotes-v2/${rejectModal.id}/reject`, { method: "POST", body: JSON.stringify({ rejectionReason: reason }) });
      await loadQuotesV2();
      showToast("Cotización rechazada.", "success");
      setRejectModal(null);
      setRejectReason("");
    } catch (err: any) {
      const msg = normalizeError(
        err,
        err?.message?.includes("403") ? "Acción solo para administrador." : "No se pudo rechazar la cotización."
      );
      setQuoteError(msg);
    } finally {
      setRejecting(false);
    }
  };

  const sendQuote = (id: string) => {
    const target = quotesV2.find((q) => q.id === id);
    if (!target) return;
    if (target.status === "SENT") {
      setQuoteError("La cotización ya fue enviada. Crea una nueva versión para reenviar.");
      return;
    }
    openSendModal(target);
  };

  useEffect(() => {
    loadQuotesV2();
  }, [loadQuotesV2]);

  const handleContract = async () => {
    if (!deal) return;
    await handleOutcome("Contrato adjunto");
  };

  const handleExpectedCloseSave = async () => {
    if (!deal) return;
    const iso = toISOStringFromLocal(expectedClose);
    try {
      setSaving(true);
      await fetchJson("/api/crm/deals", {
        method: "PATCH",
        body: JSON.stringify({ id: deal.id, expectedCloseDate: iso })
      });
      await loadDeal();
    } catch (err: any) {
      setError(err?.message || "No se pudo guardar el primer cobro");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Cargando deal...</p>;
  }

  if (!deal) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-rose-600">{error || "Deal no encontrado."}</p>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={loadDeal}
          >
            Reintentar
          </button>
          <Link
            href={`/admin/crm/pipeline?type=${normalizedType}`}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Volver al pipeline
          </Link>
        </div>
      </div>
    );
  }

  const missingAction = !deal.nextAction || !deal.nextActionAt || deal.missingAction;
  const headerSlaStatus = missingAction ? "RED" : deal.slaStatus;
  const headerSlaLabel = missingAction ? "Sin accion" : deal.slaStatus;

  if (deal.pipelineType === "B2B") {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3rem] text-slate-400">CRM - Deal Detail</p>
            <h1 className="text-2xl font-semibold text-slate-900">{getClientName(deal)}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                {CRM_STAGE_LABELS[deal.stage as keyof typeof CRM_STAGE_LABELS]}
              </span>
              <SlaChip status={headerSlaStatus} label={headerSlaLabel} />
              <span className="font-semibold text-slate-800">
                {formatCurrency(deal.amount ?? deal.amountEstimated ?? 0)} · Este monto se calcula automáticamente desde cotizaciones aprobadas.
              </span>
              <span>Responsable: {deal.ownerId || "Ventas"}</span>
              <span>Status: {deal.status || "OPEN"}</span>
            </div>
          </div>
          <Link
            href={`/admin/crm/pipeline?type=${normalizedType}`}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Volver al pipeline
          </Link>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle>Servicios</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-xs text-slate-600">
            {deal.services?.length ? (
              deal.services.map((service) => (
                <span key={service.id} className="rounded-full border border-slate-200 px-3 py-1 text-slate-700">
                  {service.serviceType}
                </span>
              ))
            ) : (
              <span className="text-slate-500">Sin servicios seleccionados.</span>
            )}
            {deal.servicesOtherNote && (
              <div className="w-full text-sm text-slate-700">
                <span className="font-semibold">Otros:</span> {deal.servicesOtherNote}
              </div>
            )}
            {deal.services?.some((service) => service.serviceType === "OTROS") && !deal.servicesOtherNote && (
              <div className="w-full text-sm text-amber-700">Falta la nota de detalle para Otros.</div>
            )}
          </CardContent>
        </Card>

        <div ref={quotesRef}>
          <Card>
            <CardHeader>
              <CardTitle>Cotizaciones (subir PDF)</CardTitle>
              <p className="text-xs text-slate-500">
                El PDF es la fuente de verdad. El monto se usa solo para control del deal. No se usan items de inventario en este flujo.
              </p>
            </CardHeader>
            <CardContent className="space-y-5 text-sm text-slate-700">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Tipo de cotización</p>
                    <p className="mt-1 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800">
                      B2B (PDF externo)
                    </p>
                  </div>
                  <label className="text-xs font-semibold text-slate-700">
                    Total negociado (obligatorio en B2B)
                    <input
                      type="number"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={quoteDeclaredTotal}
                      onChange={(e) => setQuoteDeclaredTotal(e.target.value)}
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Control comercial: se sincroniza al deal al aprobar. El PDF mantiene los términos legales.
                    </p>
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Notas internas (opcional)
                    <textarea
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      rows={4}
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                      placeholder="Contexto o condiciones relevantes."
                    />
                  </label>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-700">
                    Archivo PDF
                    <input
                      type="file"
                      accept="application/pdf"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      onChange={(e) => onQuoteFileChange(e.target.files?.[0] || null)}
                    />
                  </label>
                  {quoteFile ? (
                    <p className="text-xs text-slate-600">
                      Seleccionado: <span className="font-semibold">{quoteFile.name}</span>{" "}
                      <span className="text-slate-500">({(quoteFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">Sube un PDF para crear la cotización.</p>
                  )}
                  {quoteError && <p className="text-xs text-rose-600">{quoteError}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                      onClick={uploadQuotePdf}
                      disabled={uploadingQuote}
                    >
                      {uploadingQuote ? "Guardando..." : "Guardar cotización"}
                    </button>
                    <button
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      onClick={() => onQuoteFileChange(null)}
                      disabled={!quoteFile}
                    >
                      Limpiar archivo
                    </button>
                    <button
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={loadQuotesV2}
                    >
                      Refrescar lista
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Cotizaciones</h3>
                    <p className="text-[11px] text-slate-500">
                      DRAFT: aprobar/enviar. SENT/APPROVED: solo consultar o crear nueva versión con nuevo PDF.
                    </p>
                  </div>
                  {quotesLoading && <p className="text-xs text-slate-500">Cargando...</p>}
                </div>
                {!quotesLoading && quotesV2.length === 0 && <p className="text-xs text-slate-500">Sin cotizaciones.</p>}
                <div className="space-y-2">
                  {quotesV2.map((quote) => (
                    <div key={quote.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{quote.number}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            {renderStatusBadge(quote.status)}
                            <p className="text-xs text-slate-600">Total negociado: {formatCurrency(quote.total)}</p>
                          </div>
                          {quote.isActive && <p className="text-[11px] font-semibold text-emerald-700">Activa</p>}
                          {quote.pdfGeneratedAt && (
                            <p className="text-[11px] text-slate-500">PDF adjuntado: {formatDateTime(quote.pdfGeneratedAt)}</p>
                          )}
                          {quote.status === "SENT" && (
                            <p className="text-[11px] text-slate-600">Enviada. Para cambios, sube una nueva versión con PDF actualizado.</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {quote.status === "DRAFT" && (
                            <button
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={() => requestApproval(quote.id)}
                            >
                              Solicitar aprobación
                            </button>
                          )}
                          {(quote.status === "DRAFT" || quote.status === "APPROVED") && (
                            <button
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                              onClick={() => sendQuote(quote.id)}
                              disabled={!quote.pdfUrl}
                              title={!quote.pdfUrl ? "Sube un PDF antes de enviar" : undefined}
                            >
                              Enviar
                            </button>
                          )}
                          {canApprove ? (
                            (quote.status === "DRAFT" || quote.status === "APPROVAL_PENDING") && (
                              <button
                                className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                onClick={() => approveQuote(quote.id)}
                              >
                                Aprobar
                              </button>
                            )
                          ) : (
                            <button
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-400"
                              title="Acción solo para administrador."
                              disabled
                            >
                              Aprobar
                            </button>
                          )}
                          {canApprove && (quote.status === "DRAFT" || quote.status === "APPROVAL_PENDING") ? (
                            <button
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={() => rejectQuote(quote.id)}
                            >
                              Rechazar
                            </button>
                          ) : (
                            <button
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-400"
                              title="Acción solo para administrador."
                              disabled
                            >
                              Rechazar
                            </button>
                          )}
                          {quote.pdfUrl ? (
                            <Link
                              href={quote.pdfUrl}
                              target="_blank"
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Ver PDF
                            </Link>
                          ) : (
                            <button
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-400"
                              disabled
                              title="Sube un PDF para esta cotización"
                            >
                              PDF pendiente
                            </button>
                          )}
                          <button
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            onClick={() => loadDeliveries(quote.id)}
                          >
                            Historial envíos
                          </button>
                        </div>
                      </div>
                      {deliveries[quote.id]?.length ? (
                        <div className="mt-2 space-y-1 text-xs text-slate-600">
                          {deliveries[quote.id].map((d) => (
                            <div key={d.id} className="rounded-lg border border-slate-100 px-3 py-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">{d.status}</span>
                                <span>{d.channel}</span>
                                <span>{d.sentAt ? formatDateTime(d.sentAt) : formatDateTime(d.createdAt)}</span>
                                {d.errorMessage && <span className="text-rose-600">{d.errorMessage}</span>}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Dest: {(d.to || []).join(", ")} {d.providerMessageId ? `· msgId: ${d.providerMessageId}` : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : deliveriesLoading[quote.id] ? (
                        <p className="mt-2 text-xs text-slate-500">Cargando envíos...</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3rem] text-slate-400">CRM - Deal Detail</p>
          <h1 className="text-2xl font-semibold text-slate-900">{getClientName(deal)}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
              {CRM_STAGE_LABELS[deal.stage as keyof typeof CRM_STAGE_LABELS]}
            </span>
            <SlaChip status={headerSlaStatus} label={headerSlaLabel} />
            <span className="font-semibold text-slate-800">
              {formatCurrency(deal.amount ?? deal.amountEstimated ?? 0)} · Este monto se calcula automáticamente desde cotizaciones aprobadas.
            </span>
            <span>Responsable: {deal.ownerId || "Ventas"}</span>
            <span>Captador / Primer contacto: {deal.capturedById || "-"}</span>
            {deal.capturedAt && <span>Captura: {formatDateTime(deal.capturedAt)}</span>}
            <span>Status: {deal.status || "OPEN"}</span>
          </div>
        </div>
        <Link
          href={`/admin/crm/pipeline?type=${normalizedType}`}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Volver al pipeline
        </Link>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Próxima acción</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{nextActionText}</p>
                <p className="text-xs text-slate-500">
                  {deal.nextActionAt ? formatDateTime(deal.nextActionAt) : "Sin accion"}
                </p>
                {parsedNextAction.notes && <p className="text-xs text-slate-500">{parsedNextAction.notes}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
                  onClick={() => openActionModal("done")}
                >
                  Marcar hecho
                </button>
                <button
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
                  onClick={() => openActionModal("reprogram")}
                >
                  Reprogramar
                </button>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              SLA restante: {formatSlaRemaining(deal.stage as CrmStage, deal.stageEnteredAt)}
            </div>
            <div className="grid gap-2 text-xs text-slate-600">
              <div>
                <span className="font-semibold">Preferencia del cliente:</span>{" "}
                {deal.preferredChannel ? nextActionLabel(deal.preferredChannel) : "-"}
              </div>
              <div>
                <span className="font-semibold">Horario preferido:</span>{" "}
                {deal.preferredAt ? formatDateTime(deal.preferredAt) : "No definida"}
              </div>
              <div>
                <span className="font-semibold">Captador / Primer contacto (quien recibio el lead):</span>{" "}
                {deal.capturedAt ? formatDateTime(deal.capturedAt) : "-"} · {deal.capturedById || "-"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Servicios</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-xs text-slate-600">
            {deal.services?.length ? (
              deal.services.map((service) => (
                <span key={service.id} className="rounded-full border border-slate-200 px-3 py-1 text-slate-700">
                  {service.serviceType}
                </span>
              ))
            ) : (
              <span className="text-slate-500">Sin servicios seleccionados.</span>
            )}
            {deal.servicesOtherNote && (
              <div className="w-full text-sm text-slate-700">
                <span className="font-semibold">Otros:</span> {deal.servicesOtherNote}
              </div>
            )}
            {deal.services?.some((service) => service.serviceType === "OTROS") && !deal.servicesOtherNote && (
              <div className="w-full text-sm text-amber-700">Falta la nota de detalle para Otros.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{deal.pipelineType === "B2C" ? "Paciente" : "Contacto"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            {deal.contact ? (
              <>
                <div>
                  <p className="font-semibold">
                    {deal.contact.firstName} {deal.contact.lastName || ""}
                  </p>
                  <p className="text-xs text-slate-500">{deal.contact.email || "Sin email"}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700">Teléfonos (primero es principal)</p>
                    <button
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={addPhone}
                    >
                      Agregar teléfono
                    </button>
                  </div>
                  <div className="space-y-2">
                    {contactPhones.map((p, idx) => (
                      <div key={`${idx}-${p.country}-${p.number}`} className="flex flex-wrap items-center gap-2">
                        <input
                          className="w-24 rounded-xl border border-slate-200 px-2 py-2 text-xs"
                          value={p.country}
                          onChange={(e) => updatePhone(idx, { country: e.target.value })}
                          placeholder="+502"
                        />
                        <input
                          className="flex-1 min-w-[140px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          value={p.number}
                          onChange={(e) => updatePhone(idx, { number: e.target.value })}
                          placeholder="Número"
                        />
                        {idx !== 0 && (
                          <button
                            className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                            onClick={() => makePrimaryPhone(idx)}
                          >
                            Marcar principal
                          </button>
                        )}
                        <button
                          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                          onClick={() => removePhone(idx)}
                          disabled={contactPhones.length === 1}
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                    {contactError && <p className="text-xs text-rose-600">{contactError}</p>}
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-soft hover:bg-slate-800 disabled:opacity-60"
                        onClick={savePhones}
                        disabled={contactSaving}
                      >
                        Guardar teléfonos
                      </button>
                      <button
                        className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={addPhone}
                      >
                        Añadir otro
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Sin contacto asociado.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deal.activities?.length ? (
              deal.activities.map((activity) => (
                <div key={activity.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{activity.type}</p>
                    <span className="text-xs text-slate-500">{formatDateTime(activity.dateTime)}</span>
                  </div>
                  {activity.summary && <p className="text-xs text-slate-600">{activity.summary}</p>}
                  {activity.notes && <p className="text-xs text-slate-500">{activity.notes}</p>}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Sin actividades.</p>
            )}
          </CardContent>
        </Card>

        {!quoteV2Enabled && (
          <Card>
            <CardHeader>
              <CardTitle>Cotizaciones legacy (solo lectura)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {deal.quotes?.length ? (
                deal.quotes.map((quote) => (
                  <div key={quote.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">
                        #{quote.quoteNumber} {quote.versionLabel || ""}
                      </p>
                      <span className="text-xs text-slate-500">{quote.status}</span>
                    </div>
                    <p className="text-xs text-slate-500">{formatCurrency(quote.totalAmount)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Sin cotizaciones legacy.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>


        <div ref={quotesRef}>
          <Card>
            <CardHeader>
              <CardTitle>Cotizaciones (subir PDF)</CardTitle>
              <p className="text-xs text-slate-500">Adjunta el PDF generado fuera del CRM. No se usan items de inventario en esta vista.</p>
            </CardHeader>
            <CardContent className="space-y-5 text-sm text-slate-700">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-700">
                    Tipo de cotización
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={quoteUploadType}
                      onChange={(e) => setQuoteUploadType(e.target.value === "B2C" ? "B2C" : "B2B")}
                    >
                      <option value="B2B">B2B</option>
                      <option value="B2C">B2C</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Total declarado (opcional)
                    <input
                      type="number"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={quoteDeclaredTotal}
                      onChange={(e) => setQuoteDeclaredTotal(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Solo informativo para el monto del deal; el PDF es la fuente de verdad.
                    </p>
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Notas internas (opcional)
                    <textarea
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      rows={4}
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                      placeholder="Contexto o condiciones relevantes."
                    />
                  </label>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-700">
                    Archivo PDF
                    <input
                      type="file"
                      accept="application/pdf"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      onChange={(e) => onQuoteFileChange(e.target.files?.[0] || null)}
                    />
                  </label>
                  {quoteFile ? (
                    <p className="text-xs text-slate-600">
                      Seleccionado: <span className="font-semibold">{quoteFile.name}</span>{" "}
                      <span className="text-slate-500">({(quoteFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">Sube un PDF para crear la cotización.</p>
                  )}
                  {quoteError && <p className="text-xs text-rose-600">{quoteError}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                      onClick={uploadQuotePdf}
                      disabled={uploadingQuote}
                    >
                      {uploadingQuote ? "Guardando..." : "Guardar cotización"}
                    </button>
                    <button
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      onClick={() => onQuoteFileChange(null)}
                      disabled={!quoteFile}
                    >
                      Limpiar archivo
                    </button>
                    <button
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={loadQuotesV2}
                    >
                      Refrescar lista
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">Cotizaciones</h3>
                  {quotesLoading && <p className="text-xs text-slate-500">Cargando...</p>}
                </div>
                {!quotesLoading && quotesV2.length === 0 && <p className="text-xs text-slate-500">Sin cotizaciones.</p>}
                <div className="space-y-2">
                  {quotesV2.map((quote) => (
                    <div key={quote.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {quote.number} · {quote.status}
                          </p>
                          <p className="text-xs text-slate-500">Total: {formatCurrency(quote.total)}</p>
                          {quote.isActive && <p className="text-[11px] font-semibold text-emerald-700">Activa</p>}
                          {quote.pdfGeneratedAt && (
                            <p className="text-[11px] text-slate-500">PDF adjuntado: {formatDateTime(quote.pdfGeneratedAt)}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(quote.status === "DRAFT" || quote.status === "SENT") && (
                            <button
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={() => requestApproval(quote.id)}
                            >
                              Solicitar aprobación
                            </button>
                          )}
                          {quote.status === "DRAFT" && (
                            <button
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                              onClick={() => sendQuote(quote.id)}
                              disabled={!quote.pdfUrl}
                              title={!quote.pdfUrl ? "Sube un PDF antes de enviar" : undefined}
                            >
                              Enviar
                            </button>
                          )}
                          {isAdmin ? (
                            quote.status !== "APPROVED" && (
                              <button
                                className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                onClick={() => approveQuote(quote.id)}
                              >
                                Aprobar (ADMIN)
                              </button>
                            )
                          ) : (
                            <button
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-400"
                              title="Acción solo para administrador."
                              disabled
                            >
                              Aprobar (ADMIN)
                            </button>
                          )}
                          {isAdmin ? (
                            quote.status !== "REJECTED" && (
                              <button
                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                onClick={() => rejectQuote(quote.id)}
                              >
                                Rechazar
                              </button>
                            )
                          ) : (
                            <button
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-400"
                              title="Acción solo para administrador."
                              disabled
                            >
                              Rechazar
                            </button>
                          )}
                          {quote.pdfUrl ? (
                            <Link
                              href={quote.pdfUrl}
                              target="_blank"
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Ver PDF
                            </Link>
                          ) : (
                            <button
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-400"
                              disabled
                              title="Sube un PDF para esta cotización"
                            >
                              PDF pendiente
                            </button>
                          )}
                          <button
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            onClick={() => loadDeliveries(quote.id)}
                          >
                            Historial envíos
                          </button>
                        </div>
                      </div>
                      {deliveries[quote.id]?.length ? (
                        <div className="mt-2 space-y-1 text-xs text-slate-600">
                          {deliveries[quote.id].map((d) => (
                            <div key={d.id} className="rounded-lg border border-slate-100 px-3 py-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">{d.status}</span>
                                <span>{d.channel}</span>
                                <span>{d.sentAt ? formatDateTime(d.sentAt) : formatDateTime(d.createdAt)}</span>
                                {d.errorMessage && <span className="text-rose-600">{d.errorMessage}</span>}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Dest: {(d.to || []).join(", ")} {d.providerMessageId ? `· msgId: ${d.providerMessageId}` : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : deliveriesLoading[quote.id] ? (
                        <p className="mt-2 text-xs text-slate-500">Cargando envíos...</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


      <Modal
        open={!!sendModal}
        onClose={() => setSendModal(null)}
        title="Enviar cotización"
        subtitle={deal ? getClientName(deal) : undefined}
        className="max-w-2xl"
        footer={
          <div className="flex items-center justify-between">
            {sendError && <p className="text-sm text-rose-600">{sendError}</p>}
            <div className="flex gap-2">
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                onClick={() => setSendModal(null)}
                disabled={sendingQuote}
              >
                Cancelar
              </button>
              <button
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800 disabled:opacity-60"
                onClick={handleSendQuote}
                disabled={sendingQuote}
              >
                {sendingQuote ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        }
      >
        {sendModal && (
          <div className="space-y-3 text-sm text-slate-700">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">Para</span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                  value={sendModal.to}
                  onChange={(e) => setSendModal((prev) => (prev ? { ...prev, to: e.target.value } : prev))}
                  placeholder="correo1@cliente.com, correo2@cliente.com"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">CC (solo admin/supervisor)</span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                  value={sendModal.cc}
                  onChange={(e) => setSendModal((prev) => (prev ? { ...prev, cc: e.target.value } : prev))}
                  placeholder="cc@cliente.com"
                  disabled={!isAdmin && !isSupervisor}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">BCC (solo admin/supervisor)</span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                  value={sendModal.bcc}
                  onChange={(e) => setSendModal((prev) => (prev ? { ...prev, bcc: e.target.value } : prev))}
                  placeholder="bcc@cliente.com"
                  disabled={!isAdmin && !isSupervisor}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-600">Asunto</span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                  value={sendModal.subject}
                  onChange={(e) => setSendModal((prev) => (prev ? { ...prev, subject: e.target.value } : prev))}
                />
              </label>
            </div>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Mensaje</span>
              <textarea
                className="w-full min-h-[120px] rounded-xl border border-slate-200 bg-white px-3 py-2"
                value={sendModal.body}
                onChange={(e) => setSendModal((prev) => (prev ? { ...prev, body: e.target.value } : prev))}
              />
            </label>
            <p className="text-[11px] text-slate-500">Límite: 3 envíos por canal en 30 minutos.</p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        title={actionModal?.mode === "done" ? "Accion completada" : "Reprogramar accion"}
        subtitle={deal ? getClientName(deal) : undefined}
        className="max-w-2xl"
        footer={
          <div className="flex items-center justify-between">
            {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
            <div className="flex gap-2">
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                onClick={() => setActionModal(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800"
                onClick={handleSaveNextAction}
                disabled={saving}
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
              value={actionForm.type}
              onChange={(event) => setActionForm((prev) => ({ ...prev, type: event.target.value }))}
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
              value={actionForm.dueAt}
              onChange={(event) => setActionForm((prev) => ({ ...prev, dueAt: event.target.value }))}
            />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Notas
            <input
              type="text"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Agrega contexto para la proxima accion"
              value={actionForm.notes}
              onChange={(event) => setActionForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </label>
        </div>
      </Modal>
      <Modal
        open={!!rejectModal}
        onClose={() => setRejectModal(null)}
        title="Rechazar cotización"
        subtitle="Motivo obligatorio"
        className="max-w-lg"
        footer={
          <div className="flex items-center justify-between">
            {!rejectReason.trim() && <p className="text-sm text-rose-600">Ingresa un motivo.</p>}
            <div className="flex gap-2">
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                onClick={() => setRejectModal(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-soft hover:bg-rose-700 disabled:opacity-60"
                onClick={confirmReject}
                disabled={!rejectReason.trim() || rejecting}
              >
                Rechazar
              </button>
            </div>
          </div>
        }
      >
        <label className="text-sm font-medium text-slate-700">
          Motivo
          <textarea
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Escribe el motivo de rechazo"
          />
        </label>
      </Modal>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

export default function DealDetailPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Cargando detalle CRM...</div>}>
      <DealDetailPageContent />
    </Suspense>
  );
}
