"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRightCircle, CheckCircle2, FileText, HandCoins, ShieldAlert } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import MoneyPill from "@/components/facturacion/MoneyPill";
import { formatBillingMoney } from "@/lib/billing/format";
import { cn } from "@/lib/utils";

type QuickPayIntent = "COBRAR" | "ABONO" | "CREDITO" | "EMITIR_DOC";

type Props = {
  caseId: string;
  intent: QuickPayIntent;
  caseNumber: string;
  patientName: string;
  balanceAmount: number;
  disabled?: boolean;
  requiresSupervisor?: boolean;
  canRunSupervisorActions?: boolean;
  compact?: boolean;
};

type LegalEntityOption = {
  id: string;
  legalName: string;
  isActive: boolean;
};

type BillingSeriesOption = {
  id: string;
  legalEntityId: string;
  name: string;
  prefix: string;
  nextNumber: number;
  isDefault: boolean;
  isActive: boolean;
};

const triggerStyles: Record<QuickPayIntent, string> = {
  COBRAR: "border-[#4aa59c]/40 bg-[#4aa59c]/12 text-[#2f7f77] hover:border-[#4aa59c]",
  ABONO: "border-[#4aadf5]/40 bg-[#4aadf5]/12 text-[#2e75ba] hover:border-[#2e75ba]",
  CREDITO: "border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-400",
  EMITIR_DOC: "border-cyan-200 bg-cyan-50 text-cyan-700 hover:border-cyan-400"
};

const triggerLabel: Record<QuickPayIntent, string> = {
  COBRAR: "Cobrar",
  ABONO: "Abono",
  CREDITO: "Crédito",
  EMITIR_DOC: "Emitir"
};

const intentTitle: Record<QuickPayIntent, string> = {
  COBRAR: "Cobro rápido",
  ABONO: "Registrar abono",
  CREDITO: "Enviar a crédito",
  EMITIR_DOC: "Emitir documento"
};

function defaultAmount(intent: QuickPayIntent, balanceAmount: number) {
  if (intent === "ABONO") return Math.max(50, Math.min(250, Math.round(balanceAmount * 0.35)));
  if (intent === "COBRAR") return balanceAmount;
  return balanceAmount;
}

export default function QuickPayPanel({
  caseId,
  intent,
  caseNumber,
  patientName,
  balanceAmount,
  disabled,
  requiresSupervisor,
  canRunSupervisorActions = false,
  compact
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(defaultAmount(intent, balanceAmount));
  const [method, setMethod] = useState<"EFECTIVO" | "TARJETA" | "TRANSFERENCIA">("EFECTIVO");
  const [reference, setReference] = useState("");
  const [creditDueDate, setCreditDueDate] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [legalEntities, setLegalEntities] = useState<LegalEntityOption[]>([]);
  const [seriesOptions, setSeriesOptions] = useState<BillingSeriesOption[]>([]);
  const [selectedLegalEntityId, setSelectedLegalEntityId] = useState("");
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [loadingEmitOptions, setLoadingEmitOptions] = useState(false);
  const [lastIssuedSerial, setLastIssuedSerial] = useState<string | null>(null);

  const icon = useMemo(() => {
    if (intent === "COBRAR") return <HandCoins className="h-4 w-4" />;
    if (intent === "ABONO") return <ArrowRightCircle className="h-4 w-4" />;
    if (intent === "CREDITO") return <ShieldAlert className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  }, [intent]);

  const blockedByRole = Boolean(requiresSupervisor && !canRunSupervisorActions);

  function resetState() {
    setAmount(defaultAmount(intent, balanceAmount));
    setMethod("EFECTIVO");
    setReference("");
    setCreditDueDate("");
    setConfirm(false);
    setSubmitted(false);
    setError(null);
    setIsSubmitting(false);
    setSelectedSeriesId("");
    setLastIssuedSerial(null);
  }

  function onClose() {
    setOpen(false);
    resetState();
  }

  useEffect(() => {
    if (!open || intent !== "EMITIR_DOC") return;

    let cancelled = false;

    async function loadEmitOptions() {
      setLoadingEmitOptions(true);
      setError(null);
      try {
        const [legalRes, prefRes] = await Promise.all([
          fetch("/api/admin/config/legal-entities?includeInactive=0", { cache: "no-store" }),
          fetch("/api/admin/config/billing/preference", { cache: "no-store" })
        ]);

        const legalJson = await legalRes.json().catch(() => ({}));
        const prefJson = await prefRes.json().catch(() => ({}));

        if (!legalRes.ok || legalJson?.ok === false) {
          throw new Error(legalJson?.error || "No se pudieron cargar las patentes.");
        }

        const legalRows = (Array.isArray(legalJson?.data) ? legalJson.data : []) as LegalEntityOption[];
        const activeLegals = legalRows.filter((row) => row.isActive);
        const defaultLegal =
          (prefJson?.data?.defaultLegalEntityId as string | undefined) || activeLegals[0]?.id || "";

        if (cancelled) return;
        setLegalEntities(activeLegals);
        setSelectedLegalEntityId((current) => current || defaultLegal);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "No se pudo cargar configuración de emisión.");
      } finally {
        if (!cancelled) setLoadingEmitOptions(false);
      }
    }

    void loadEmitOptions();

    return () => {
      cancelled = true;
    };
  }, [open, intent]);

  useEffect(() => {
    if (intent !== "EMITIR_DOC") return;
    if (!selectedLegalEntityId) {
      setSeriesOptions([]);
      setSelectedSeriesId("");
      return;
    }

    let cancelled = false;

    async function loadSeries() {
      setLoadingEmitOptions(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/admin/config/billing/series?legalEntityId=${encodeURIComponent(selectedLegalEntityId)}&includeInactive=0`,
          { cache: "no-store" }
        );
        const json = await response.json().catch(() => ({}));
        if (!response.ok || json?.ok === false) {
          throw new Error(json?.error || "No se pudieron cargar series de facturación.");
        }

        const rows = (Array.isArray(json?.data) ? json.data : []) as BillingSeriesOption[];
        const activeRows = rows.filter((row) => row.isActive);
        const defaultSeries = activeRows.find((row) => row.isDefault)?.id || activeRows[0]?.id || "";

        if (cancelled) return;
        setSeriesOptions(activeRows);
        setSelectedSeriesId((current) => current || defaultSeries);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "No se pudieron cargar series de facturación.");
      } finally {
        if (!cancelled) setLoadingEmitOptions(false);
      }
    }

    void loadSeries();

    return () => {
      cancelled = true;
    };
  }, [intent, selectedLegalEntityId]);

  function validate() {
    if (blockedByRole) {
      return "Acción bloqueada: requiere rol supervisor.";
    }

    if (!confirm) {
      return "Confirma que revisaste saldo y pagador antes de continuar.";
    }

    if (intent === "EMITIR_DOC") {
      if (balanceAmount > 0) return "No se puede emitir con saldo pendiente.";
      if (legalEntities.length > 1 && !selectedLegalEntityId) {
        return "Debes seleccionar la patente para emitir la factura.";
      }
      if (!selectedSeriesId) {
        return "Debes seleccionar una serie activa de facturación.";
      }
      return null;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return "El monto debe ser mayor que cero.";
    }

    if (amount > balanceAmount) {
      return "El monto no puede exceder el saldo del expediente.";
    }

    if (method !== "EFECTIVO" && !reference.trim()) {
      return "Referencia obligatoria para tarjeta o transferencia.";
    }

    if (intent === "CREDITO") {
      if (!creditDueDate) return "Debes definir fecha de vencimiento del crédito.";
      if (Date.parse(creditDueDate) < Date.now() - 60_000) {
        return "La fecha de vencimiento no puede estar en el pasado.";
      }
    }

    return null;
  }

  async function onSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSubmitted(false);

      const payload: Record<string, unknown> = {
        action: intent,
        confirm: true
      };

      if (intent !== "EMITIR_DOC") {
        payload.amount = amount;
        payload.paymentMethod = method;
        payload.reference = reference || undefined;
      }

      if (intent === "CREDITO") {
        payload.creditDueDate = creditDueDate || undefined;
      }

      if (intent === "EMITIR_DOC") {
        payload.legalEntityId = selectedLegalEntityId || undefined;
        payload.billingSeriesId = selectedSeriesId || undefined;
      }

      const response = await fetch(`/api/facturacion/expedientes/${caseId}/quick-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.error || "No se pudo completar la acción");
      }

      const serialPrefix = json?.data?.invoice?.serialPrefix as string | undefined;
      const serialNumber = json?.data?.invoice?.serialNumber as number | undefined;
      if (serialPrefix && typeof serialNumber === "number") {
        setLastIssuedSerial(`${serialPrefix}-${serialNumber}`);
      } else {
        setLastIssuedSerial(null);
      }
      setSubmitted(true);
      router.refresh();
    } catch (err: any) {
      setSubmitted(false);
      setError(err?.message || "No se pudo completar la acción");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled || blockedByRole}
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
          triggerStyles[intent],
          compact && "px-2 py-1 text-[11px]",
          (disabled || blockedByRole) && "cursor-not-allowed opacity-45"
        )}
      >
        {icon}
        {triggerLabel[intent]}
      </button>

      <Modal
        open={open}
        onClose={onClose}
        title={`${intentTitle[intent]} · ${caseNumber}`}
        subtitle={`${patientName} · Operación en caja`}
        className="max-w-2xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Acción conectada al backend con persistencia y auditoría.</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting}
                className={cn(
                  "rounded-lg bg-[#4aa59c] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f968d]",
                  isSubmitting && "cursor-wait opacity-70"
                )}
              >
                {isSubmitting ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <MoneyPill label="Saldo" amount={balanceAmount} tone="info" />
            <MoneyPill label="Monto" amount={amount || 0} tone="primary" />
          </div>

          {submitted ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-semibold">Operación aplicada</p>
                  <p>
                    {intentTitle[intent]} guardado correctamente. Monto: <span className="font-semibold">{formatBillingMoney(amount || 0)}</span>
                  </p>
                  {lastIssuedSerial ? (
                    <p className="mt-1">
                      Correlativo emitido: <span className="font-semibold">{lastIssuedSerial}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {blockedByRole ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Esta operación requiere rol supervisor.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </div>
          ) : null}

          {intent !== "EMITIR_DOC" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                Monto a registrar
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(Number(event.target.value))}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                Método
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value as "EFECTIVO" | "TARJETA" | "TRANSFERENCIA")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 md:col-span-2">
                Referencia (opcional en efectivo)
                <input
                  type="text"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="No. autorización, voucher, transferencia"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
                />
              </label>

              {intent === "CREDITO" ? (
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 md:col-span-2">
                  Fecha de vencimiento
                  <input
                    type="date"
                    value={creditDueDate}
                    onChange={(event) => setCreditDueDate(event.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
                  />
                </label>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-[#4aadf5]/30 bg-[#4aadf5]/10 p-3 text-sm text-[#2e75ba]">
              <p>La emisión requiere saldo en cero y una serie activa por patente.</p>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  Patente
                  <select
                    value={selectedLegalEntityId}
                    onChange={(event) => {
                      setSelectedLegalEntityId(event.target.value);
                      setSelectedSeriesId("");
                    }}
                    disabled={loadingEmitOptions || legalEntities.length === 0}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
                  >
                    <option value="">Selecciona patente</option>
                    {legalEntities.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.legalName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  Serie
                  <select
                    value={selectedSeriesId}
                    onChange={(event) => setSelectedSeriesId(event.target.value)}
                    disabled={loadingEmitOptions || !selectedLegalEntityId || seriesOptions.length === 0}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
                  >
                    <option value="">Selecciona serie</option>
                    {seriesOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.prefix} · {item.name} · sig. {item.nextNumber}
                        {item.isDefault ? " (default)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {loadingEmitOptions ? <p className="text-xs text-slate-500">Cargando patentes y series...</p> : null}
            </div>
          )}

          <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={confirm} onChange={(event) => setConfirm(event.target.checked)} />
            Validé pagador, monto, método de pago y reglas de cierre antes de confirmar.
          </label>
        </div>
      </Modal>
    </>
  );
}
