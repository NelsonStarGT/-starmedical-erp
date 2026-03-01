"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/ui/Toast";

type PaymentMethod = "MANUAL" | "RECURRENT";

type OwnerOption = {
  id: string;
  type: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  nit?: string | null;
};

type PlanOption = {
  id: string;
  name: string;
  segment: "B2C" | "B2B";
  active: boolean;
  priceMonthly: number;
  priceAnnual: number;
  currency?: string;
  category?: {
    id: string;
    name: string;
    segment: "B2C" | "B2B";
  } | null;
  durationPreset?: {
    id: string;
    name: string;
    days: number;
  } | null;
  customDurationDays?: number | null;
  benefits?: Array<{
    id: string;
    isUnlimited?: boolean;
    quantity?: number | null;
    benefitCatalog?: {
      id: string;
      title: string;
      serviceType: string;
    } | null;
  }>;
};

type CreatedContract = {
  id: string;
  code?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  plans: PlanOption[];
  canViewPricing: boolean;
  hidePricesForOperators: boolean;
  onCreated?: (contract: CreatedContract) => Promise<void> | void;
};

const WIZARD_STEPS = [
  { id: 1, label: "Titular" },
  { id: 2, label: "Plan" },
  { id: 3, label: "Pago" }
] as const;

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter((el) => !el.hasAttribute("disabled"));
}

function formatDate(value: Date) {
  return value.toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function money(value: number, currency = "GTQ") {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
}

function normalizeOwnerResponse(row: any): OwnerOption {
  return {
    id: row.id,
    type: row.type,
    name: row.name || row.companyName || "Sin nombre",
    email: row.email || null,
    phone: row.phone || null,
    nit: row.nit || null
  };
}

export function SubscriptionMembershipEnrollDrawer({
  open,
  onClose,
  plans,
  canViewPricing,
  hidePricesForOperators,
  onCreated
}: Props) {
  const router = useRouter();
  const drawerRef = useRef<HTMLElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const { toasts, showToast, dismiss } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerIdManual, setOwnerIdManual] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<OwnerOption | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("MANUAL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdContract, setCreatedContract] = useState<CreatedContract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchAvailable, setSearchAvailable] = useState(true);

  const availablePlans = useMemo(() => plans.filter((plan) => plan.segment === "B2C" && plan.active), [plans]);
  const selectedPlan = useMemo(
    () => availablePlans.find((plan) => plan.id === selectedPlanId) || null,
    [availablePlans, selectedPlanId]
  );

  const startAt = useMemo(() => new Date(), []);
  const nextRenewAt = useMemo(() => {
    if (!selectedPlan) return null;
    const days = selectedPlan.durationPreset?.days || selectedPlan.customDurationDays || 30;
    return addDays(startAt, days);
  }, [selectedPlan, startAt]);

  const shouldHidePricing = hidePricesForOperators && !canViewPricing;

  useEffect(() => {
    if (!open) return;
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => {
      const first = getFocusableElements(drawerRef.current)[0];
      first?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusables = getFocusableElements(drawerRef.current);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (!active || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    return () => {
      lastFocusedRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const query = ownerSearch.trim();
    if (query.length < 2) {
      setOwners([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setLoadingOwners(true);
      try {
        const res = await fetch(`/api/subscriptions/memberships/clients?q=${encodeURIComponent(query)}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudo buscar pacientes");
        setSearchAvailable(true);
        setOwners(Array.isArray(json?.data) ? json.data.map(normalizeOwnerResponse) : []);
      } catch {
        setSearchAvailable(false);
        setOwners([]);
      } finally {
        setLoadingOwners(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [ownerSearch, open]);

  const resetWizard = () => {
    setStep(1);
    setOwnerSearch("");
    setOwners([]);
    setOwnerIdManual("");
    setSelectedOwner(null);
    setSelectedPlanId("");
    setPaymentMethod("MANUAL");
    setIsSubmitting(false);
    setCreatedContract(null);
    setError(null);
    setSearchAvailable(true);
  };

  const closeDrawer = () => {
    resetWizard();
    onClose();
  };

  const effectiveOwnerId = selectedOwner?.id || ownerIdManual.trim();

  const canContinueStep1 = Boolean(effectiveOwnerId);
  const canContinueStep2 = Boolean(selectedPlanId);
  const canCreate = canContinueStep1 && canContinueStep2;

  const buildBillingLink = (contractId?: string) => {
    const params = new URLSearchParams();
    params.set("source", "memberships");
    params.set("owner", "PERSON");
    if (effectiveOwnerId) params.set("patientId", effectiveOwnerId);
    if (selectedPlanId) params.set("planId", selectedPlanId);
    if (contractId) params.set("contractId", contractId);
    return `/admin/facturacion?${params.toString()}`;
  };

  const createAffiliation = async () => {
    if (!canCreate || !selectedPlan) {
      throw new Error("Completa titular y plan antes de continuar.");
    }
    const payload = {
      ownerType: "PERSON",
      ownerId: effectiveOwnerId,
      planId: selectedPlan.id,
      status: paymentMethod === "MANUAL" ? "PENDIENTE_PAGO" : "PENDIENTE",
      startAt: new Date().toISOString(),
      billingFrequency: "MONTHLY",
      channel: paymentMethod === "RECURRENT" ? "ADMIN_RECURRENTE" : "ADMIN_MANUAL"
    };

    const res = await fetch("/api/subscriptions/memberships/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error || "No se pudo crear la afiliación.");
    }
    const created = { id: String(json?.data?.id || ""), code: json?.data?.code };
    if (!created.id) throw new Error("El servidor no devolvió el identificador de la afiliación.");
    setCreatedContract(created);
    return created;
  };

  const handleCreateAffiliation = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const created = await createAffiliation();
      if (onCreated) await onCreated(created);
      router.refresh();
      showToast({ tone: "success", title: "Afiliación creada", message: "La afiliación del titular fue registrada correctamente." });
      closeDrawer();
    } catch (err: any) {
      const message = err?.message || "No se pudo crear la afiliación.";
      setError(message);
      showToast({ tone: "error", title: "No se pudo completar", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const contract = createdContract ?? (await createAffiliation());
      const res = await fetch("/api/subscriptions/recurrente/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: contract.id,
          returnUrl: window.location.href
        })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Pendiente de configuración de pasarela recurrente.");
      }
      if (onCreated) await onCreated(contract);
      router.refresh();
      const checkoutUrl = json?.data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }
      showToast({ tone: "info", message: "Checkout iniciado. Continúa el proceso en la pasarela." });
      closeDrawer();
    } catch (err: any) {
      const message = err?.message || "No se pudo iniciar checkout recurrente.";
      setError(message);
      showToast({ tone: "warning", title: "Pendiente de configuración", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        onClick={closeDrawer}
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Cerrar asistente de afiliación"
      />

      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Afiliar titular"
        className="absolute inset-y-0 right-0 h-full w-full max-w-[520px] min-w-[360px] overflow-hidden border-l border-slate-200 bg-white shadow-md"
      >
        <div className="flex h-full flex-col">
          <header className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#2e75ba]">Afiliar titular</h2>
                <p className="mt-1 text-xs text-slate-600">Crea una afiliación y define método de cobro.</p>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-[#4aadf5] hover:text-[#2e75ba]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="mt-4 grid grid-cols-3 gap-2">
              {WIZARD_STEPS.map((item) => {
                const active = step === item.id;
                const completed = step > item.id;
                return (
                  <li
                    key={item.id}
                    className={`rounded-lg border px-2 py-2 text-center text-[11px] font-semibold ${
                      active
                        ? "border-[#4aa59c] bg-[#F8FAFC] text-[#2e75ba]"
                        : completed
                          ? "border-[#4aadf5] bg-[#4aadf5]/10 text-[#2e75ba]"
                          : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    {item.label}
                  </li>
                );
              })}
            </ol>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto bg-[#F8FAFC] p-5">
            {step === 1 ? (
              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#2e75ba]">Paso 1 · Titular</h3>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Buscar paciente</span>
                  <input
                    value={ownerSearch}
                    onChange={(event) => setOwnerSearch(event.target.value)}
                    placeholder="Nombre, teléfono, DPI"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                {loadingOwners ? <p className="text-xs text-slate-500">Buscando pacientes...</p> : null}

                {searchAvailable && owners.length > 0 ? (
                  <select
                    value={selectedOwner?.id || ""}
                    onChange={(event) => {
                      const option = owners.find((row) => row.id === event.target.value) || null;
                      setSelectedOwner(option);
                      if (option) setOwnerIdManual(option.id);
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Selecciona paciente</option>
                    {owners.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name} · {row.id}
                      </option>
                    ))}
                  </select>
                ) : null}

                {!searchAvailable ? (
                  <p className="text-xs text-slate-500">(Temporal) Ingresa ID de paciente.</p>
                ) : (
                  <p className="text-xs text-slate-500">Si no aparece en la búsqueda, puedes ingresar el ID manualmente.</p>
                )}

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Paciente ID</span>
                  <input
                    value={ownerIdManual}
                    onChange={(event) => {
                      setOwnerIdManual(event.target.value);
                      if (selectedOwner?.id !== event.target.value) setSelectedOwner(null);
                    }}
                    placeholder="Ej: cln_123456"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                {selectedOwner ? (
                  <article className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                    <p className="text-sm font-semibold text-slate-900">{selectedOwner.name}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {selectedOwner.phone || "Sin teléfono"} · {selectedOwner.email || "Sin correo"}
                    </p>
                  </article>
                ) : null}
              </section>
            ) : null}

            {step === 2 ? (
              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#2e75ba]">Paso 2 · Plan</h3>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Plan B2C</span>
                  <select
                    value={selectedPlanId}
                    onChange={(event) => setSelectedPlanId(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar plan</option>
                    {availablePlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedPlan ? (
                  <article className="space-y-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                    <p className="text-sm font-semibold text-slate-900">{selectedPlan.name}</p>
                    <p className="text-xs text-slate-600">
                      Categoría: {selectedPlan.category?.name || "Sin categoría"} · Duración:{" "}
                      {selectedPlan.durationPreset?.name || (selectedPlan.customDurationDays ? `${selectedPlan.customDurationDays} días` : "No definida")}
                    </p>
                    <p className="text-xs text-slate-600">
                      Vigencia estimada: {formatDate(startAt)} → {nextRenewAt ? formatDate(nextRenewAt) : "Pendiente"}
                    </p>
                    {!shouldHidePricing ? (
                      <p className="text-xs text-slate-600">
                        Mensual: {money(selectedPlan.priceMonthly, selectedPlan.currency || "GTQ")} · Anual:{" "}
                        {money(selectedPlan.priceAnnual, selectedPlan.currency || "GTQ")}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">Precio oculto para este perfil.</p>
                    )}
                    {selectedPlan.benefits?.length ? (
                      <ul className="list-disc pl-4 text-xs text-slate-600">
                        {selectedPlan.benefits.slice(0, 4).map((benefit) => (
                          <li key={benefit.id}>
                            {benefit.benefitCatalog?.title || "Beneficio"}{" "}
                            {benefit.isUnlimited ? "(ilimitado)" : benefit.quantity ? `(x${benefit.quantity})` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">Sin beneficios configurados.</p>
                    )}
                  </article>
                ) : null}
              </section>
            ) : null}

            {step === 3 ? (
              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#2e75ba]">Paso 3 · Pago</h3>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("MANUAL")}
                    className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                      paymentMethod === "MANUAL"
                        ? "border-[#4aa59c] bg-[#F8FAFC] text-[#2e75ba]"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    Manual
                    <span className="mt-1 block text-xs font-normal text-slate-500">Efectivo o transferencia.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("RECURRENT")}
                    className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                      paymentMethod === "RECURRENT"
                        ? "border-[#4aa59c] bg-[#F8FAFC] text-[#2e75ba]"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    Recurrente
                    <span className="mt-1 block text-xs font-normal text-slate-500">Tarjeta con pasarela segura.</span>
                  </button>
                </div>

                {paymentMethod === "MANUAL" ? (
                  <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                    <p className="text-xs text-slate-600">El cobro se gestiona en Facturación/Finanzas.</p>
                    <Link
                      href={buildBillingLink(createdContract?.id)}
                      className="mt-2 inline-flex rounded-lg border border-[#4aa59c] px-3 py-2 text-xs font-semibold text-[#4aa59c] transition hover:bg-white"
                    >
                      Generar cobro en Facturación
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                    <p className="text-xs text-slate-600">Activa checkout externo sin almacenar datos de tarjeta en el ERP.</p>
                    <button
                      type="button"
                      onClick={() => void handleCheckout()}
                      disabled={isSubmitting || !canCreate}
                      className="mt-2 inline-flex rounded-lg border border-[#4aa59c] px-3 py-2 text-xs font-semibold text-[#4aa59c] transition hover:bg-white disabled:opacity-60"
                    >
                      {isSubmitting ? "Procesando..." : "Ir a checkout"}
                    </button>
                  </div>
                )}
              </section>
            ) : null}

            {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
          </div>

          <footer className="border-t border-slate-200 bg-white px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev))}
                disabled={step === 1 || isSubmitting}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Atrás
              </button>

              <div className="flex items-center gap-2">
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => setStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev))}
                    disabled={(step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2)}
                    className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-50"
                  >
                    Continuar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleCreateAffiliation()}
                    disabled={!canCreate || isSubmitting}
                    className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-50"
                  >
                    {isSubmitting ? "Creando..." : "Crear afiliación"}
                  </button>
                )}
              </div>
            </div>
          </footer>
        </div>
      </aside>

      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />
    </div>
  );
}
