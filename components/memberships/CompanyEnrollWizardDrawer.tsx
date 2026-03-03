"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/ui/Toast";

type PlanOption = {
  id: string;
  name: string;
  segment: "B2C" | "B2B";
  active: boolean;
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
};

type OwnerOption = {
  id: string;
  type: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  nit?: string | null;
};

type ImportSummary = {
  created: number;
  linked: number;
  errors: number;
  personClientIds: string[];
  errorsPreview: Array<{ row: number; message: string }>;
};

type AssignSummary = {
  requested: number;
  eligible: number;
  linkedToCompany: number;
  added: number;
  skippedExisting: number;
  skippedOutOfScope: number;
  skippedNotLinked: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  plans: PlanOption[];
  onCreated?: (contract: { id: string }) => Promise<void> | void;
};

const STEPS = [
  { id: 1, label: "Identificación empresa" },
  { id: 2, label: "Adjuntar colaboradores" },
  { id: 3, label: "Confirmación" }
] as const;

type WizardStep = 0 | 1 | 2 | 3;
type ClientCreatedMessage = {
  type: "CLIENT_CREATED";
  clientType: "COMPANY" | "PERSON";
  id: string;
  name?: string | null;
};

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

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(value: Date) {
  return value.toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function isClientCreatedMessage(input: unknown): input is ClientCreatedMessage {
  if (!input || typeof input !== "object") return false;
  const value = input as Record<string, unknown>;
  if (value.type !== "CLIENT_CREATED") return false;
  if (value.clientType !== "COMPANY" && value.clientType !== "PERSON") return false;
  if (typeof value.id !== "string") return false;
  const id = value.id.trim();
  if (!id || id.length > 120 || /\\s/.test(id)) return false;
  if (value.name !== undefined && value.name !== null && typeof value.name !== "string") return false;
  return true;
}

export function CompanyEnrollWizardDrawer({ open, onClose, plans, onCreated }: Props) {
  const router = useRouter();
  const drawerRef = useRef<HTMLElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const { toasts, showToast, dismiss } = useToast();

  const [step, setStep] = useState<WizardStep>(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [companySearch, setCompanySearch] = useState("");
  const [companyResults, setCompanyResults] = useState<OwnerOption[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<OwnerOption | null>(null);
  const [companyIdManual, setCompanyIdManual] = useState("");
  const [companySearchAvailable, setCompanySearchAvailable] = useState(true);

  const [employeeMode, setEmployeeMode] = useState<"IMPORT" | "LINK" | "MANUAL">("IMPORT");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeResults, setEmployeeResults] = useState<OwnerOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<OwnerOption[]>([]);

  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [startAt, setStartAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [creditDays, setCreditDays] = useState("30");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [onlyLinkedToOwnerCompany, setOnlyLinkedToOwnerCompany] = useState(true);

  const [createdContractId, setCreatedContractId] = useState<string | null>(null);
  const [assignSummary, setAssignSummary] = useState<AssignSummary | null>(null);
  const [returnOrigin, setReturnOrigin] = useState<string>("");

  const availablePlans = useMemo(() => plans.filter((plan) => plan.segment === "B2B" && plan.active), [plans]);
  const selectedPlan = useMemo(
    () => availablePlans.find((plan) => plan.id === selectedPlanId) || null,
    [availablePlans, selectedPlanId]
  );
  const effectiveCompanyId = selectedCompany?.id || companyIdManual.trim();

  const computedNextRenewAt = useMemo(() => {
    if (!selectedPlan) return null;
    const base = startAt ? new Date(`${startAt}T12:00:00`) : new Date();
    const days = selectedPlan.durationPreset?.days || selectedPlan.customDurationDays || 30;
    return addDays(base, days);
  }, [selectedPlan, startAt]);

  const importCount = importSummary?.personClientIds.length || 0;
  const selectedCount = selectedEmployees.length;
  const totalEmployeesToAssociate = importCount + selectedCount;
  const companyCreateHref = returnOrigin
    ? `/admin/clientes/empresas/nuevo?returnMode=postMessage&returnOrigin=${encodeURIComponent(returnOrigin)}`
    : "/admin/clientes/empresas/nuevo";
  const personCreateHref = returnOrigin
    ? `/admin/clientes/personas/nuevo?returnMode=postMessage&returnOrigin=${encodeURIComponent(returnOrigin)}`
    : "/admin/clientes/personas/nuevo";

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReturnOrigin(window.location.origin);
  }, []);

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
    const allowedOrigin = returnOrigin || (typeof window !== "undefined" ? window.location.origin : "");
    const openerRef = typeof window !== "undefined" ? window.opener : null;

    const onMessage = (event: MessageEvent) => {
      if (!allowedOrigin || event.origin !== allowedOrigin) return;
      if (openerRef && event.source && event.source !== openerRef) return;
      if (!isClientCreatedMessage(event.data)) return;

      const payload = event.data;
      if (payload.clientType === "COMPANY") {
        const inferredName = (payload.name || "").trim() || `Empresa ${payload.id.slice(0, 8)}`;
        setSelectedCompany({
          id: payload.id,
          type: "COMPANY",
          name: inferredName,
          email: null,
          phone: null,
          nit: null
        });
        setCompanyIdManual(payload.id);
        setStep((prev) => (prev < 2 ? 2 : prev));
        showToast({
          tone: "success",
          title: "Empresa recibida",
          message: `Se vinculó ${inferredName} al wizard.`
        });
        return;
      }

      setSelectedEmployees((prev) => {
        if (prev.some((row) => row.id === payload.id)) return prev;
        const inferredName = (payload.name || "").trim() || `Persona ${payload.id.slice(0, 8)}`;
        return [
          ...prev,
          {
            id: payload.id,
            type: "PERSON",
            name: inferredName,
            email: null,
            phone: null,
            nit: null
          }
        ];
      });
      setStep((prev) => (prev < 2 ? 2 : prev));
      showToast({
        tone: "success",
        title: "Colaborador recibido",
        message: `Se agregó ${payload.name || payload.id} al listado del wizard.`
      });
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [open, returnOrigin, showToast]);

  useEffect(() => {
    if (!open || step !== 1) return;
    const q = companySearch.trim();
    if (q.length < 2) {
      setCompanyResults([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setLoadingCompanies(true);
      try {
        const res = await fetch(`/api/subscriptions/memberships/clients?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudo buscar empresas");

        const rows = Array.isArray(json?.data)
          ? json.data.map(normalizeOwnerResponse).filter((row: OwnerOption) => row.type === "COMPANY")
          : [];
        setCompanySearchAvailable(true);
        setCompanyResults(rows);
      } catch {
        setCompanySearchAvailable(false);
        setCompanyResults([]);
      } finally {
        setLoadingCompanies(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [companySearch, open, step]);

  useEffect(() => {
    if (!open || step !== 2 || employeeMode !== "LINK") return;
    const q = employeeSearch.trim();
    if (q.length < 2) {
      setEmployeeResults([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setLoadingEmployees(true);
      try {
        const res = await fetch(`/api/subscriptions/memberships/clients?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudo buscar personas");

        const rows = Array.isArray(json?.data)
          ? json.data.map(normalizeOwnerResponse).filter((row: OwnerOption) => row.type === "PERSON")
          : [];
        setEmployeeResults(rows);
      } catch {
        setEmployeeResults([]);
      } finally {
        setLoadingEmployees(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [employeeSearch, employeeMode, open, step]);

  const canContinueStep1 = Boolean(effectiveCompanyId);
  const canContinueStep2 = importCount > 0 || selectedCount > 0;

  const resetState = () => {
    setStep(0);
    setError(null);
    setSubmitting(false);
    setCompanySearch("");
    setCompanyResults([]);
    setLoadingCompanies(false);
    setSelectedCompany(null);
    setCompanyIdManual("");
    setCompanySearchAvailable(true);
    setEmployeeMode("IMPORT");
    setEmployeeSearch("");
    setEmployeeResults([]);
    setLoadingEmployees(false);
    setSelectedEmployees([]);
    setImporting(false);
    setImportSummary(null);
    setSelectedPlanId("");
    setStartAt(new Date().toISOString().slice(0, 10));
    setCreditDays("30");
    setShowAdvanced(false);
    setOnlyLinkedToOwnerCompany(true);
    setCreatedContractId(null);
    setAssignSummary(null);
  };

  const closeDrawer = () => {
    resetState();
    onClose();
  };

  async function handleImportCollaborators(file: File) {
    setError(null);
    setImportSummary(null);
    setImporting(true);

    try {
      const formData = new FormData();
      formData.append("type", "PERSON");
      formData.append("mode", "process");
      formData.append("dedupeMode", "skip");
      formData.append("file", file);

      const res = await fetch("/api/admin/clientes/import/csv", {
        method: "POST",
        body: formData
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "No se pudo importar colaboradores desde Clientes.");
      }

      setImportSummary({
        created: Number(json?.summary?.created || 0),
        linked: Number(json?.summary?.linked || 0),
        errors: Number(json?.summary?.errors || 0),
        personClientIds: Array.isArray(json?.personClientIds)
          ? json.personClientIds.map((value: unknown) => String(value || "").trim()).filter(Boolean)
          : [],
        errorsPreview: Array.isArray(json?.errorsPreview)
          ? json.errorsPreview
              .map((item: any) => ({ row: Number(item?.row || 0), message: String(item?.message || "") }))
              .slice(0, 6)
          : []
      });

      showToast({
        tone: "success",
        title: "Importación completada",
        message: "Colaboradores procesados por el importador de Clientes."
      });
    } catch (err: any) {
      const message = err?.message || "No se pudo completar la importación.";
      setError(message);
      showToast({ tone: "error", title: "Importación fallida", message });
    } finally {
      setImporting(false);
    }
  }

  function addEmployee(candidate: OwnerOption) {
    setSelectedEmployees((prev) => {
      if (prev.some((item) => item.id === candidate.id)) return prev;
      return [...prev, candidate];
    });
  }

  function removeEmployee(id: string) {
    setSelectedEmployees((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleConfirm() {
    if (!effectiveCompanyId) {
      setError("Selecciona la empresa titular para continuar.");
      return;
    }
    if (!selectedPlan) {
      setError("Selecciona un plan B2B antes de confirmar.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const contractRes = await fetch("/api/subscriptions/memberships/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerType: "COMPANY",
          ownerId: effectiveCompanyId,
          planId: selectedPlan.id,
          startAt: new Date(`${startAt || new Date().toISOString().slice(0, 10)}T12:00:00`).toISOString(),
          billingFrequency: "MONTHLY",
          channel: "ADMIN_B2B_ENROLL",
          allowDependents: true,
          note: `creditDays:${Math.max(0, Number(creditDays) || 0)}`
        })
      });
      const contractJson = await contractRes.json();
      if (!contractRes.ok) {
        throw new Error(contractJson?.error || "No se pudo crear el contrato B2B.");
      }

      const contractId = String(contractJson?.data?.id || "").trim();
      if (!contractId) {
        throw new Error("No se recibió contractId del servidor.");
      }

      const personIds = Array.from(
        new Set([
          ...selectedEmployees.map((row) => row.id),
          ...(importSummary?.personClientIds || [])
        ])
      );

      let latestAssignSummary: AssignSummary | null = null;
      if (personIds.length > 0) {
        const assignRes = await fetch(`/api/subscriptions/memberships/contracts/${encodeURIComponent(contractId)}/dependents/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personIds,
            onlyLinkedToOwnerCompany
          })
        });
        const assignJson = await assignRes.json();
        if (!assignRes.ok) {
          throw new Error(assignJson?.error || "No se pudieron asociar colaboradores al contrato.");
        }

        latestAssignSummary = {
          requested: Number(assignJson?.data?.requested || personIds.length),
          eligible: Number(assignJson?.data?.eligible || 0),
          linkedToCompany: Number(assignJson?.data?.linkedToCompany || 0),
          added: Number(assignJson?.data?.added || 0),
          skippedExisting: Number(assignJson?.data?.skippedExisting || 0),
          skippedOutOfScope: Number(assignJson?.data?.skippedOutOfScope || 0),
          skippedNotLinked: Number(assignJson?.data?.skippedNotLinked || 0)
        };
      }

      setCreatedContractId(contractId);
      setAssignSummary(latestAssignSummary);

      if (onCreated) await onCreated({ id: contractId });
      router.refresh();

      showToast({
        tone: "success",
        title: "Afiliación B2B creada",
        message:
          latestAssignSummary && latestAssignSummary.added >= 0
            ? `Contrato creado y ${latestAssignSummary.added} colaboradores vinculados.`
            : "Contrato B2B creado correctamente."
      });

      setStep(3);
    } catch (err: any) {
      const message = err?.message || "No se pudo completar la afiliación empresa.";
      setError(message);
      showToast({ tone: "error", title: "No se pudo completar", message });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" onClick={closeDrawer} className="absolute inset-0 bg-slate-900/40" aria-label="Cerrar asistente" />

      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Afiliación empresa"
        className="absolute inset-y-0 right-0 h-full w-full max-w-[520px] min-w-[360px] overflow-hidden border-l border-slate-200 bg-white shadow-md"
      >
        <div className="flex h-full flex-col">
          <header className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#2e75ba]">Afiliar empresa</h2>
                <p className="mt-1 text-xs text-slate-600">Orquesta contrato y vínculo de colaboradores usando el módulo Clientes.</p>
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

            {step > 0 ? (
              <ol className="mt-4 grid grid-cols-3 gap-2">
                {STEPS.map((item) => {
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
            ) : null}
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto bg-[#F8FAFC] p-5">
            {step === 0 ? (
              <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-[#2e75ba]">Qué alegre que estemos afiliando una empresa hoy</h3>
                <p className="text-sm text-slate-600">
                  Este asistente guía el proceso completo: identificación de empresa, adjuntar colaboradores desde Clientes y confirmación final del contrato B2B.
                </p>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex rounded-lg bg-[#4aa59c] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
                >
                  Empezar
                </button>
              </section>
            ) : null}

            {step === 1 ? (
              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#2e75ba]">Paso 1 · Identificación empresa</h3>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Buscar por nombre, NIT o código</span>
                  <input
                    value={companySearch}
                    onChange={(event) => setCompanySearch(event.target.value)}
                    placeholder="Ej. StarMedical, 1234-5"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                {loadingCompanies ? <p className="text-xs text-slate-500">Buscando empresas...</p> : null}

                {companySearchAvailable && companyResults.length > 0 ? (
                  <select
                    value={selectedCompany?.id || ""}
                    onChange={(event) => {
                      const option = companyResults.find((row) => row.id === event.target.value) || null;
                      setSelectedCompany(option);
                      if (option) setCompanyIdManual(option.id);
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar empresa</option>
                    {companyResults.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name} · {row.nit || row.id}
                      </option>
                    ))}
                  </select>
                ) : null}

                {!companySearchAvailable ? (
                  <p className="text-xs text-slate-500">Búsqueda temporalmente no disponible. Usa Empresa ID manual.</p>
                ) : (
                  <p className="text-xs text-slate-500">Si no aparece, crea la empresa en Clientes y regresa con el ID.</p>
                )}

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Empresa ID</span>
                  <input
                    value={companyIdManual}
                    onChange={(event) => {
                      setCompanyIdManual(event.target.value);
                      if (selectedCompany?.id !== event.target.value) setSelectedCompany(null);
                    }}
                    placeholder="Ej. cln_company_123"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                  <p className="text-xs text-slate-600">¿Necesitas crear la empresa ahora?</p>
                  <Link
                    href={companyCreateHref}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex rounded-lg border border-[#4aa59c] px-3 py-2 text-xs font-semibold text-[#4aa59c] transition hover:bg-white"
                  >
                    Crear empresa
                  </Link>
                  <p className="mt-2 text-[11px] text-slate-500">Al guardar en Clientes, vuelve y selecciona/pega el companyId.</p>
                </div>

                {selectedCompany ? (
                  <article className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                    <p className="text-sm font-semibold text-slate-900">{selectedCompany.name}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {selectedCompany.nit || "Sin NIT"} · {selectedCompany.email || "Sin correo"}
                    </p>
                  </article>
                ) : null}
              </section>
            ) : null}

            {step === 2 ? (
              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#2e75ba]">Paso 2 · Adjuntar colaboradores</h3>

                <div className="inline-flex rounded-full border border-slate-200 bg-[#F8FAFC] p-1">
                  {[
                    { key: "IMPORT", label: "Importar Excel" },
                    { key: "LINK", label: "Vincular existentes" },
                    { key: "MANUAL", label: "Crear manual" }
                  ].map((option) => {
                    const isActive = employeeMode === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setEmployeeMode(option.key as "IMPORT" | "LINK" | "MANUAL")}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          isActive
                            ? "border border-[#4aa59c]/40 bg-white text-[#2e75ba]"
                            : "text-slate-600 hover:bg-white hover:text-[#2e75ba]"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {employeeMode === "IMPORT" ? (
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                    <p className="text-xs text-slate-600">Usa el importador oficial de Clientes para personas (CSV/XLSX).</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href="/api/admin/clientes/import/template?type=PERSON&format=xlsx"
                        className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                      >
                        Descargar plantilla
                      </a>
                      <label className="inline-flex cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-[#4aadf5]">
                        <span>{importing ? "Importando..." : "Seleccionar archivo"}</span>
                        <input
                          type="file"
                          accept=".csv,.xlsx"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            void handleImportCollaborators(file);
                            event.currentTarget.value = "";
                          }}
                          disabled={importing}
                        />
                      </label>
                    </div>

                    {importSummary ? (
                      <div className="rounded-lg border border-[#4aa59c]/30 bg-white p-3">
                        <p className="text-xs font-semibold text-[#2e75ba]">Preview de importación</p>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                          <div className="rounded-md bg-[#F8FAFC] p-2">
                            <p className="text-slate-500">Nuevos</p>
                            <p className="font-semibold text-slate-900">{importSummary.created}</p>
                          </div>
                          <div className="rounded-md bg-[#F8FAFC] p-2">
                            <p className="text-slate-500">Vinculados</p>
                            <p className="font-semibold text-slate-900">{importSummary.linked}</p>
                          </div>
                          <div className="rounded-md bg-[#F8FAFC] p-2">
                            <p className="text-slate-500">Errores</p>
                            <p className="font-semibold text-slate-900">{importSummary.errors}</p>
                          </div>
                        </div>
                        {importSummary.errorsPreview.length ? (
                          <ul className="mt-2 list-disc pl-4 text-[11px] text-slate-600">
                            {importSummary.errorsPreview.map((item, idx) => (
                              <li key={`${item.row}-${idx}`}>
                                Fila {item.row}: {item.message}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {employeeMode === "LINK" ? (
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-slate-700">Buscar personas existentes</span>
                      <input
                        value={employeeSearch}
                        onChange={(event) => setEmployeeSearch(event.target.value)}
                        placeholder="Nombre, correo o teléfono"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>

                    {loadingEmployees ? <p className="text-xs text-slate-500">Buscando personas...</p> : null}

                    {employeeResults.length ? (
                      <div className="max-h-40 space-y-1 overflow-auto rounded-lg border border-slate-200 bg-white p-2">
                        {employeeResults.map((row) => (
                          <div key={row.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-[#F8FAFC]">
                            <div>
                              <p className="text-xs font-medium text-slate-800">{row.name}</p>
                              <p className="text-[11px] text-slate-500">{row.email || row.phone || row.id}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addEmployee(row)}
                              className="rounded-md border border-[#4aa59c]/40 px-2 py-1 text-[11px] font-semibold text-[#2e75ba] hover:bg-[#F8FAFC]"
                            >
                              Vincular
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {employeeMode === "MANUAL" ? (
                  <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                    <p className="text-xs text-slate-600">Crea personas en Clientes y luego selecciónalas por búsqueda.</p>
                    <Link
                      href={personCreateHref}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex rounded-lg border border-[#4aa59c] px-3 py-2 text-xs font-semibold text-[#4aa59c] transition hover:bg-white"
                    >
                      Crear persona
                    </Link>
                  </div>
                ) : null}

                {selectedEmployees.length > 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-white p-2">
                    <p className="mb-1 text-xs font-semibold text-slate-700">Personas vinculadas ({selectedEmployees.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEmployees.map((row) => (
                        <span key={row.id} className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-[#F8FAFC] px-2 py-1 text-[11px] text-slate-700">
                          {row.name}
                          <button
                            type="button"
                            onClick={() => removeEmployee(row.id)}
                            className="text-slate-500 hover:text-rose-600"
                            aria-label={`Quitar ${row.name}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                >
                  {showAdvanced ? "Ocultar avanzado" : "Avanzado"}
                </button>

                {showAdvanced ? (
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={onlyLinkedToOwnerCompany}
                        onChange={(event) => setOnlyLinkedToOwnerCompany(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Asociar solo personas vinculadas a la empresa titular
                    </label>
                  </div>
                ) : null}
              </section>
            ) : null}

            {step === 3 ? (
              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#2e75ba]">Paso 3 · Confirmación</h3>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Plan B2B</span>
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

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-700">Inicio</span>
                    <input
                      type="date"
                      value={startAt}
                      onChange={(event) => setStartAt(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-700">Días de crédito</span>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={creditDays}
                      onChange={(event) => setCreditDays(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <div className="space-y-1 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3 text-xs text-slate-700">
                  <p>
                    <span className="font-semibold">Empresa:</span> {selectedCompany?.name || effectiveCompanyId || "Pendiente"}
                  </p>
                  <p>
                    <span className="font-semibold">Producto:</span> {selectedPlan?.name || "Pendiente"}
                  </p>
                  <p>
                    <span className="font-semibold">Renovación estimada:</span> {computedNextRenewAt ? formatDate(computedNextRenewAt) : "Pendiente"}
                  </p>
                  <p>
                    <span className="font-semibold">Colaboradores a asociar:</span> {totalEmployeesToAssociate}
                  </p>
                </div>

                {createdContractId ? (
                  <div className="rounded-lg border border-[#4aa59c]/30 bg-white p-3 text-xs">
                    <p className="font-semibold text-[#2e75ba]">Resultado</p>
                    <p className="mt-1 text-slate-700">
                      <span className="font-semibold">Contrato:</span> {createdContractId}
                    </p>
                    {assignSummary ? (
                      <p className="mt-1 text-slate-700">
                        <span className="font-semibold">Colaboradores agregados:</span> {assignSummary.added} (existentes: {assignSummary.skippedExisting}, no vinculados: {assignSummary.skippedNotLinked})
                      </p>
                    ) : null}
                    <Link
                      href={`/admin/suscripciones/membresias/afiliaciones/${createdContractId}`}
                      className="mt-2 inline-flex rounded-lg border border-[#4aa59c] px-3 py-2 text-xs font-semibold text-[#4aa59c] hover:bg-[#F8FAFC]"
                    >
                      Ver afiliación
                    </Link>
                  </div>
                ) : null}
              </section>
            ) : null}

            {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
          </div>

          <footer className="border-t border-slate-200 bg-white px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep((prev) => (prev > 0 ? ((prev - 1) as WizardStep) : prev))}
                disabled={step === 0 || submitting}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Atrás
              </button>

              {step === 0 ? (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
                >
                  Empezar
                </button>
              ) : null}

              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canContinueStep1}
                  className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-50"
                >
                  Continuar
                </button>
              ) : null}

              {step === 2 ? (
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!canContinueStep2}
                  className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-50"
                >
                  Continuar
                </button>
              ) : null}

              {step === 3 ? (
                <button
                  type="button"
                  onClick={() => void handleConfirm()}
                  disabled={submitting || Boolean(createdContractId)}
                  className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-50"
                >
                  {submitting ? "Confirmando..." : createdContractId ? "Contrato creado" : "Confirmar afiliación"}
                </button>
              ) : null}
            </div>
          </footer>
        </div>
      </aside>

      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />
    </div>
  );
}
