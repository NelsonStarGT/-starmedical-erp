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
  benefits?: Array<{
    id: string;
    quantity?: number | null;
    isUnlimited?: boolean;
    benefitCatalog?: {
      id: string;
      title: string;
    } | null;
  }>;
};

type OwnerOption = {
  id: string;
  type: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  nit?: string | null;
};

type ImportedCollaborator = {
  row: number;
  fullName: string;
  email: string;
  phone: string;
  valid: boolean;
};

type CreatedContract = {
  id: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  plans: PlanOption[];
  onCreated?: (contract: CreatedContract) => Promise<void> | void;
};

const STEPS = [
  { id: 1, label: "Empresa" },
  { id: 2, label: "Producto" },
  { id: 3, label: "Colaboradores" }
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

function parseCsvRows(csvRaw: string): ImportedCollaborator[] {
  const lines = csvRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const maybeHeader = lines[0].toLowerCase();
  const start = maybeHeader.includes("nombre") || maybeHeader.includes("email") || maybeHeader.includes("telefono") ? 1 : 0;

  const rows = lines.slice(start).map((line, idx) => {
    const [fullName = "", email = "", phone = ""] = line.split(",").map((col) => col.trim());
    const valid = fullName.length >= 3;
    return {
      row: start + idx + 1,
      fullName,
      email,
      phone,
      valid
    };
  });

  return rows.slice(0, 200);
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

export function CompanyMembershipEnrollDrawer({ open, onClose, plans, onCreated }: Props) {
  const router = useRouter();
  const drawerRef = useRef<HTMLElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const { toasts, showToast, dismiss } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companySearch, setCompanySearch] = useState("");
  const [companyResults, setCompanyResults] = useState<OwnerOption[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [searchAvailable, setSearchAvailable] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<OwnerOption | null>(null);
  const [companyIdManual, setCompanyIdManual] = useState("");

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [creditDays, setCreditDays] = useState("30");
  const [startAt, setStartAt] = useState(() => new Date().toISOString().slice(0, 10));

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeResults, setEmployeeResults] = useState<OwnerOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<OwnerOption[]>([]);
  const [importedRows, setImportedRows] = useState<ImportedCollaborator[]>([]);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const availablePlans = useMemo(() => plans.filter((plan) => plan.segment === "B2B" && plan.active), [plans]);
  const selectedPlan = useMemo(
    () => availablePlans.find((plan) => plan.id === selectedPlanId) || null,
    [availablePlans, selectedPlanId]
  );
  const effectiveCompanyId = selectedCompany?.id || companyIdManual.trim();
  const canContinueStep1 = Boolean(effectiveCompanyId);
  const canContinueStep2 = Boolean(selectedPlanId);
  const canSubmit = canContinueStep1 && canContinueStep2;

  const nextRenewAt = useMemo(() => {
    if (!selectedPlan) return null;
    const days = selectedPlan.durationPreset?.days || selectedPlan.customDurationDays || 30;
    const base = startAt ? new Date(`${startAt}T12:00:00`) : new Date();
    return addDays(base, days);
  }, [selectedPlan, startAt]);

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
    const q = companySearch.trim();
    if (q.length < 2) {
      setCompanyResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoadingCompanies(true);
      try {
        const res = await fetch(`/api/subscriptions/memberships/clients?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudo buscar empresas");
        setSearchAvailable(true);
        const rows = Array.isArray(json?.data) ? json.data.map(normalizeOwnerResponse).filter((item: OwnerOption) => item.type === "COMPANY") : [];
        setCompanyResults(rows);
      } catch {
        setSearchAvailable(false);
        setCompanyResults([]);
      } finally {
        setLoadingCompanies(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [companySearch, open]);

  useEffect(() => {
    if (!open) return;
    const q = employeeSearch.trim();
    if (q.length < 2) {
      setEmployeeResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoadingEmployees(true);
      try {
        const res = await fetch(`/api/subscriptions/memberships/clients?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudo buscar colaboradores");
        const rows = Array.isArray(json?.data) ? json.data.map(normalizeOwnerResponse).filter((item: OwnerOption) => item.type === "PERSON") : [];
        setEmployeeResults(rows);
      } catch {
        setEmployeeResults([]);
      } finally {
        setLoadingEmployees(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [employeeSearch, open]);

  const resetState = () => {
    setStep(1);
    setSubmitting(false);
    setError(null);
    setCompanySearch("");
    setCompanyResults([]);
    setLoadingCompanies(false);
    setSelectedCompany(null);
    setCompanyIdManual("");
    setSelectedPlanId("");
    setCreditDays("30");
    setStartAt(new Date().toISOString().slice(0, 10));
    setEmployeeSearch("");
    setEmployeeResults([]);
    setLoadingEmployees(false);
    setSelectedEmployees([]);
    setImportedRows([]);
    setImportMessage(null);
    setSearchAvailable(true);
  };

  const closeDrawer = () => {
    resetState();
    onClose();
  };

  async function handleImportFile(file: File) {
    setImportMessage(null);
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".csv")) {
      const raw = await file.text();
      const parsed = parseCsvRows(raw);
      setImportedRows(parsed);
      if (!parsed.length) {
        setImportMessage("No se detectaron filas válidas en el archivo.");
      } else {
        const invalid = parsed.filter((row) => !row.valid).length;
        setImportMessage(`Vista previa cargada (${parsed.length} filas, ${invalid} con observación).`);
      }
      return;
    }

    setImportedRows([]);
    setImportMessage("Vista previa automática disponible para CSV. XLSX/XLS queda preparado para la siguiente iteración.");
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

  async function handleCreateContract() {
    if (!canSubmit || !selectedPlan) {
      setError("Completa empresa y producto antes de confirmar.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/subscriptions/memberships/contracts", {
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
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo crear la afiliación empresa.");

      const contractId = String(json?.data?.id || "");
      if (!contractId) throw new Error("El servidor no devolvió contractId.");

      if (onCreated) await onCreated({ id: contractId });
      router.refresh();

      if (selectedEmployees.length || importedRows.length) {
        showToast({
          tone: "info",
          title: "Contrato creado",
          message:
            "El contrato B2B se creó correctamente. La asociación masiva de colaboradores queda en scaffold UI para la siguiente iteración backend."
        });
      } else {
        showToast({ tone: "success", title: "Afiliación creada", message: "El contrato B2B fue registrado correctamente." });
      }

      closeDrawer();
      router.push(`/admin/suscripciones/membresias/afiliaciones/${contractId}`);
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
        aria-label="Afiliar empresa"
        className="absolute inset-y-0 right-0 h-full w-full max-w-[520px] min-w-[360px] overflow-hidden border-l border-slate-200 bg-white shadow-md"
      >
        <div className="flex h-full flex-col">
          <header className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#2e75ba]">Afiliar empresa</h2>
                <p className="mt-1 text-xs text-slate-600">Crea una afiliación B2B y prepara sus colaboradores.</p>
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
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto bg-[#F8FAFC] p-5">
            {step === 1 ? (
              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#2e75ba]">Paso 1 · Empresa</h3>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Buscar empresa</span>
                  <input
                    value={companySearch}
                    onChange={(event) => setCompanySearch(event.target.value)}
                    placeholder="Nombre, NIT o código"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                {loadingCompanies ? <p className="text-xs text-slate-500">Buscando empresas...</p> : null}

                {searchAvailable && companyResults.length > 0 ? (
                  <select
                    value={selectedCompany?.id || ""}
                    onChange={(event) => {
                      const row = companyResults.find((item) => item.id === event.target.value) || null;
                      setSelectedCompany(row);
                      if (row) setCompanyIdManual(row.id);
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

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Empresa ID</span>
                  <input
                    value={companyIdManual}
                    onChange={(event) => {
                      setCompanyIdManual(event.target.value);
                      if (selectedCompany?.id !== event.target.value) setSelectedCompany(null);
                    }}
                    placeholder="Ej: cln_company_123"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                  <p className="text-xs text-slate-600">¿No existe la empresa en Clientes?</p>
                  <Link
                    href="/admin/clientes/empresas/nuevo"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex rounded-lg border border-[#4aa59c] px-3 py-2 text-xs font-semibold text-[#4aa59c] transition hover:bg-white"
                  >
                    Crear empresa
                  </Link>
                  <p className="mt-2 text-[11px] text-slate-500">Luego regresa y pega el ID de empresa para continuar.</p>
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
                <h3 className="text-sm font-semibold text-[#2e75ba]">Paso 2 · Producto</h3>

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

                {selectedPlan ? (
                  <article className="space-y-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                    <p className="text-sm font-semibold text-slate-900">{selectedPlan.name}</p>
                    <p className="text-xs text-slate-600">
                      Categoría: {selectedPlan.category?.name || "Sin categoría"} · Duración:{" "}
                      {selectedPlan.durationPreset?.name || (selectedPlan.customDurationDays ? `${selectedPlan.customDurationDays} días` : "No definida")}
                    </p>
                    <p className="text-xs text-slate-600">Renovación estimada: {nextRenewAt ? formatDate(nextRenewAt) : "Pendiente"}</p>
                  </article>
                ) : null}
              </section>
            ) : null}

            {step === 3 ? (
              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#2e75ba]">Paso 3 · Colaboradores</h3>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-700">Vincular existentes</span>
                  <input
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    placeholder="Buscar personas por nombre, correo o teléfono"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                {loadingEmployees ? <p className="text-xs text-slate-500">Buscando colaboradores...</p> : null}

                {employeeResults.length > 0 ? (
                  <div className="max-h-40 space-y-1 overflow-auto rounded-lg border border-slate-200 p-2">
                    {employeeResults.map((row) => (
                      <div key={row.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-[#F8FAFC]">
                        <div>
                          <p className="text-xs font-medium text-slate-800">{row.name}</p>
                          <p className="text-[11px] text-slate-500">{row.email || row.phone || row.id}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addEmployee(row)}
                          className="rounded-md border border-[#4aa59c]/50 px-2 py-1 text-[11px] font-semibold text-[#2e75ba] hover:bg-[#F8FAFC]"
                        >
                          Vincular
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {selectedEmployees.length > 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-2">
                    <p className="mb-1 text-xs font-semibold text-slate-700">Seleccionados ({selectedEmployees.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEmployees.map((row) => (
                        <span key={row.id} className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700">
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

                <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                  <p className="text-xs font-semibold text-slate-700">Importar Excel/CSV</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Scaffold: vista previa y validación básica. La creación masiva de personas y asociación automática se habilita en backend dedicado.
                  </p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="mt-2 block w-full text-xs text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-[#4aa59c] file:px-2 file:py-1 file:text-xs file:font-semibold file:text-white"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void handleImportFile(file);
                    }}
                  />
                  {importMessage ? <p className="mt-2 text-[11px] text-slate-600">{importMessage}</p> : null}
                </div>

                {importedRows.length > 0 ? (
                  <div className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-[11px]">
                      <thead className="sticky top-0 bg-[#F8FAFC]">
                        <tr>
                          <th className="px-2 py-1 text-left font-semibold text-[#2e75ba]">Fila</th>
                          <th className="px-2 py-1 text-left font-semibold text-[#2e75ba]">Nombre</th>
                          <th className="px-2 py-1 text-left font-semibold text-[#2e75ba]">Email</th>
                          <th className="px-2 py-1 text-left font-semibold text-[#2e75ba]">Teléfono</th>
                          <th className="px-2 py-1 text-left font-semibold text-[#2e75ba]">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importedRows.slice(0, 20).map((row, idx) => (
                          <tr key={`${row.row}-${idx}`} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                            <td className="px-2 py-1 text-slate-700">{row.row}</td>
                            <td className="px-2 py-1 text-slate-700">{row.fullName || "—"}</td>
                            <td className="px-2 py-1 text-slate-700">{row.email || "—"}</td>
                            <td className="px-2 py-1 text-slate-700">{row.phone || "—"}</td>
                            <td className="px-2 py-1">
                              <span className={`rounded-full px-2 py-0.5 ${row.valid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                {row.valid ? "OK" : "Revisar"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev))}
                disabled={step === 1 || submitting}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Atrás
              </button>
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
                  onClick={() => void handleCreateContract()}
                  disabled={!canSubmit || submitting}
                  className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-50"
                >
                  {submitting ? "Creando..." : "Crear afiliación B2B"}
                </button>
              )}
            </div>
          </footer>
        </div>
      </aside>

      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />
    </div>
  );
}
