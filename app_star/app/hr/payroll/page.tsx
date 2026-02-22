"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { usePermissions } from "@/hooks/usePermissions";

type RunStatus = "DRAFT" | "REVIEW" | "APPROVED" | "PUBLISHED" | "PAID" | "CLOSED";
type RunType = "REGULAR" | "EXTRA";

type PayrollRunRow = {
  id: string;
  code: string;
  runType: RunType;
  status: RunStatus;
  branchId?: string | null;
  branchName?: string | null;
  periodStart: string;
  periodEnd: string;
  employees: number;
  createdAt: string;
};

type PreviewEmployee = {
  id: string;
  code?: string | null;
  name: string;
  dpi?: string | null;
  biometricId?: string | null;
  branch?: string | null;
  status?: string | null;
};
type BranchOption = { id: string; name: string };

const statusStyles: Record<RunStatus, string> = {
  DRAFT: "bg-[#4aadf5]/15 text-[#2e75ba]",
  REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-[#4aa59c]/20 text-[#2e8c7f]",
  PUBLISHED: "bg-[#2e75ba]/15 text-[#2e75ba]",
  PAID: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-slate-200 text-slate-700"
};

const typeLabels: Record<RunType, string> = { REGULAR: "Ordinaria", EXTRA: "Extraordinaria" };

function formatDate(value: string) {
  return value ? value.slice(0, 10) : "—";
}

async function fetchBranches(): Promise<BranchOption[]> {
  const res = await fetch("/api/hr/branches?includeInactive=1", { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "No se pudieron cargar las sucursales");
  return json.data || [];
}

async function fetchPreview(branchId?: string | null, search?: string): Promise<PreviewEmployee[]> {
  const params = new URLSearchParams();
  if (branchId) params.set("branchId", branchId);
  if (search) params.set("search", search);
  const qs = params.toString();
  const res = await fetch(`/api/hr/payroll/preview${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "No se pudo cargar la vista previa");
  return json.data?.items || [];
}

type RunsResponse = { items: PayrollRunRow[]; total: number; page?: number; pageSize?: number; totalPages?: number };
type RunFilters = {
  status?: RunStatus | "ALL";
  branchId?: string;
  runType?: RunType | "ALL";
  search?: string;
  periodStartFrom?: string;
  periodEndTo?: string;
};

async function fetchRuns(filters?: RunFilters): Promise<RunsResponse> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);
  if (filters?.branchId) params.set("branchId", filters.branchId);
  if (filters?.runType && filters.runType !== "ALL") params.set("runType", filters.runType);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.periodStartFrom) params.set("periodStartFrom", filters.periodStartFrom);
  if (filters?.periodEndTo) params.set("periodEndTo", filters.periodEndTo);
  const qs = params.toString();
  const res = await fetch(`/api/hr/payroll${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || "No se pudieron cargar las corridas");
  const items: PayrollRunRow[] = payload.data?.items || [];
  return {
    items,
    total: payload.data?.total ?? items.length,
    page: payload.data?.page,
    pageSize: payload.data?.pageSize,
    totalPages: payload.data?.totalPages
  };
}

async function createRun(payload: { runType: RunType; periodStart: string; periodEnd: string; branchId?: string; selectedEmployeeIds: string[] }) {
  const res = await fetch("/api/hr/payroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "No se pudo crear la corrida");
  return json;
}

async function updateStatus(id: string, status: RunStatus) {
  const res = await fetch(`/api/hr/payroll/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "No se pudo actualizar el estado");
  return json;
}

export default function PayrollPage() {
  const { toasts, showToast, dismiss } = useToast();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("HR:PAYROLL:WRITE");
  const canUpdateStatus = hasPermission("HR:PAYROLL:WRITE");

  const [openWizard, setOpenWizard] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<{ runType: RunType; periodStart: string; periodEnd: string; branchId: string }>({
    runType: "REGULAR",
    periodStart: "",
    periodEnd: "",
    branchId: ""
  });
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<RunFilters>({
    status: "DRAFT",
    runType: "ALL",
    branchId: "",
    search: "",
    periodStartFrom: "",
    periodEndTo: ""
  });

  const qc = useQueryClient();

  const runsQuery = useQuery({ queryKey: ["payroll-runs", filters], queryFn: () => fetchRuns(filters) });
  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: fetchBranches, enabled: openWizard });
  const branchesFilterQuery = useQuery({ queryKey: ["branches", "filters"], queryFn: fetchBranches });
  const previewQuery = useQuery({
    queryKey: ["payroll-preview", form.branchId, debouncedSearch],
    queryFn: () => fetchPreview(form.branchId || undefined, debouncedSearch || undefined),
    enabled: openWizard && step >= 1 && Boolean(form.periodStart && form.periodEnd)
  });
  const runsData = runsQuery.data;
  const runs = runsData?.items || [];
  const totalRuns = runsData?.total ?? runs.length;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (previewQuery.data && selectedEmployees.length === 0) {
      setSelectedEmployees(previewQuery.data.map((e) => e.id));
    }
  }, [previewQuery.data, selectedEmployees.length]);

  const createMutation = useMutation({
    mutationFn: () =>
      createRun({
        runType: form.runType,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        branchId: form.branchId || undefined,
        selectedEmployeeIds: selectedEmployees
      }),
    onSuccess: () => {
      showToast("Corrida creada", "success");
      setOpenWizard(false);
      setStep(0);
      setSelectedEmployees([]);
      setSearch("");
      setForm((prev) => ({ ...prev, periodStart: "", periodEnd: "" }));
      void qc.invalidateQueries({ queryKey: ["payroll-runs"] });
    },
    onError: (err: any) => {
      const msg = err?.message || "";
      if (msg.includes("MISSING_LEGAL_ENTITY")) {
        showToast("Configura una razón social antes de crear corridas", "error");
      } else {
        showToast(msg || "Error al crear la corrida", "error");
      }
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RunStatus }) => updateStatus(id, status),
    onSuccess: () => {
      showToast("Estado actualizado", "success");
      void qc.invalidateQueries({ queryKey: ["payroll-runs"] });
    },
    onError: (err: any) => showToast(err?.message || "No se pudo actualizar", "error")
  });

  const steps = [
    { key: "config", title: "Configuración" },
    { key: "preview", title: "Vista previa empleados" },
    { key: "create", title: "Crear corrida" }
  ];

  const canContinueConfig = form.periodStart !== "" && form.periodEnd !== "" && Boolean(form.runType);

  const selectedPreview = useMemo(() => {
    const set = new Set(selectedEmployees);
    return previewQuery.data ? previewQuery.data.filter((e) => set.has(e.id)) : [];
  }, [previewQuery.data, selectedEmployees]);
  const previewList = previewQuery.data || [];
  const previewTotal = previewList.length;
  const hasSelection = selectedEmployees.length > 0;
  const canCreateRun = hasSelection && canContinueConfig;

  return (
    <div className="p-6 space-y-5">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="rounded-3xl bg-gradient-to-r from-[#4aa59c] via-[#4aadf5] to-[#2e75ba] px-6 py-6 shadow-soft flex flex-col gap-2 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide opacity-80">RRHH · Nómina</p>
            <h1 className="text-2xl font-bold">Corridas y control de nómina</h1>
            <p className="text-sm opacity-90 max-w-2xl">
              Prepara corridas, visualiza quién está incluido y navega hacia el detalle sin cálculos todavía. Todo listo para iterar rápido.
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => setOpenWizard(true)}
              className="rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold text-white shadow-soft border border-white/30 backdrop-blur hover:bg-white/25 transition"
            >
              Nueva corrida
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "ALL", label: "Todas" },
            { key: "DRAFT", label: "Borradores" },
            { key: "REVIEW", label: "En revisión" },
            { key: "APPROVED", label: "Aprobadas" },
            { key: "PAID", label: "Pagadas" },
            { key: "CLOSED", label: "Cerradas" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilters((f) => ({ ...f, status: tab.key as RunStatus | "ALL" }))}
              className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                filters.status === tab.key ? "border-[#2e75ba] bg-[#4aadf5]/15 text-[#2e75ba]" : "border-slate-200 text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 whitespace-nowrap">Sucursal</span>
            <select
              value={filters.branchId || ""}
              onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value || undefined }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/40"
            >
              <option value="">Todas</option>
              {(branchesFilterQuery.data || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 whitespace-nowrap">Tipo</span>
            <select
              value={filters.runType || "ALL"}
              onChange={(e) => setFilters((f) => ({ ...f, runType: (e.target.value as RunType | "ALL") || "ALL" }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/40"
            >
              <option value="ALL">Todos</option>
              <option value="REGULAR">Ordinaria</option>
              <option value="EXTRA">Extraordinaria</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 whitespace-nowrap">Desde</span>
            <input
              type="date"
              value={filters.periodStartFrom || ""}
              onChange={(e) => setFilters((f) => ({ ...f, periodStartFrom: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/40"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 whitespace-nowrap">Hasta</span>
            <input
              type="date"
              value={filters.periodEndTo || ""}
              onChange={(e) => setFilters((f) => ({ ...f, periodEndTo: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/40"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              value={filters.search || ""}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Buscar código"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/40"
            />
            <button
              onClick={() => runsQuery.refetch()}
              className="rounded-lg border border-[#4aadf5] px-3 py-2 text-xs font-semibold text-[#2e75ba] hover:bg-[#4aadf5]/10"
            >
              Filtrar
            </button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm text-slate-700">Corridas</CardTitle>
            <p className="text-xs text-slate-500">Tabla lista para poblar conforme generes corridas.</p>
          </div>
          <div className="flex gap-2">
            <span className="text-xs text-slate-500">{totalRuns} corridas</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Código</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Periodo</th>
                  <th className="py-2 pr-3">Sucursal</th>
                  <th className="py-2 pr-3">Colabs</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 text-right pr-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="py-3 pr-3 font-semibold text-slate-800">
                      <Link href={`/hr/payroll/${run.id}`} className="hover:underline">
                        {run.code}
                      </Link>
                      <p className="text-xs text-slate-500">{formatDate(run.createdAt)}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c]/10 px-3 py-1 text-xs font-semibold text-[#2e8c7f]">
                        {typeLabels[run.runType]}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-slate-700">
                      {formatDate(run.periodStart)} → {formatDate(run.periodEnd)}
                    </td>
                    <td className="py-3 pr-3 text-slate-700">{run.branchName || "—"}</td>
                    <td className="py-3 pr-3 text-slate-700">{run.employees || 0}</td>
                    <td className="py-3 pr-3">
                      <Badge className={statusStyles[run.status]}>{run.status}</Badge>
                    </td>
                    <td className="py-3 pr-3 text-right space-x-2">
                      <Link href={`/hr/payroll/${run.id}`} className="text-xs font-semibold text-[#2e75ba] hover:underline">
                        Ver
                      </Link>
                      <a
                        href={`/api/hr/payroll/${run.id}/export.csv`}
                        className="text-xs font-semibold text-slate-700 hover:underline"
                      >
                        CSV
                      </a>
                      {canUpdateStatus && (() => {
                        const sequence: RunStatus[] = ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "PAID", "CLOSED"];
                        const idx = sequence.indexOf(run.status);
                        const next = idx >= 0 && idx < sequence.length - 1 ? sequence[idx + 1] : null;
                        return next ? (
                          <button
                            onClick={() => statusMutation.mutate({ id: run.id, status: next })}
                            className="rounded-full border border-[#4aadf5] px-3 py-1 text-xs font-semibold text-[#2e75ba] hover:bg-[#4aadf5]/10 disabled:opacity-60"
                            disabled={statusMutation.isPending}
                          >
                            Avanzar a {next}
                          </button>
                        ) : null;
                      })()}
                    </td>
                  </tr>
                ))}
                {!runs.length && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Sin corridas registradas. Empieza con “Nueva corrida”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={openWizard}
        onClose={() => {
          setOpenWizard(false);
          setStep(0);
          setSearch("");
          setSelectedEmployees([]);
        }}
        title="Nueva corrida de nómina"
        subtitle="MVP – crear sin cálculos"
        className="max-w-5xl"
        footer={
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {step === 0 && "Define la corrida."}
              {step === 1 && "Revisa quién entraría en la corrida."}
              {step === 2 && "Confirma y crea en modo borrador."}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                disabled={step === 0}
              >
                Atrás
              </button>
              {step < 2 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="rounded-xl bg-[#2e75ba] px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-60"
                  disabled={!canContinueConfig || (step === 1 && (previewQuery.isLoading || !hasSelection))}
                >
                  Continuar
                </button>
              ) : (
                <button
                  onClick={() => createMutation.mutate()}
                  className="rounded-xl bg-gradient-to-r from-[#4aa59c] via-[#4aadf5] to-[#2e75ba] px-5 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-60"
                  disabled={createMutation.isPending || !canCreateRun}
                >
                  {createMutation.isPending ? "Creando..." : "Crear corrida"}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {steps.map((s, idx) => (
              <div
                key={s.key}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  idx === step ? "bg-[#4aadf5]/15 border border-[#4aadf5]/50 text-[#2e75ba]" : "bg-slate-50 text-slate-500"
                }`}
              >
                Paso {idx + 1}: {s.title}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold text-[#2e75ba] uppercase tracking-wide">Tipo</p>
                <div className="mt-2 space-y-2">
                  {(["REGULAR", "EXTRA"] as RunType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, runType: t }))}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold ${
                        form.runType === t
                          ? "border-[#4aa59c] bg-[#4aa59c]/10 text-[#1f6d62]"
                          : "border-slate-200 text-slate-700 hover:border-[#4aadf5]"
                      }`}
                    >
                      {typeLabels[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-3 space-y-2">
                <label className="text-xs font-semibold text-slate-600">Inicio</label>
                <input
                  type="date"
                  value={form.periodStart}
                  onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/50"
                />
                <label className="text-xs font-semibold text-slate-600">Fin</label>
                <input
                  type="date"
                  value={form.periodEnd}
                  onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/50"
                />
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-3 space-y-2">
                <label className="text-xs font-semibold text-slate-600">Sucursal</label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/50"
                >
                  <option value="">Selecciona</option>
                  {(branchesQuery.data || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {branchesQuery.isLoading && <p className="text-xs text-slate-500">Cargando sucursales...</p>}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs text-slate-500">Configuración</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {typeLabels[form.runType]} · {form.branchId ? "Sucursal seleccionada" : "Sucursal pendiente"} ·{" "}
                    {form.periodStart || "—"} → {form.periodEnd || "—"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Seleccionados {selectedEmployees.length} / {previewTotal || 0}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar nombre/DPI/código/biométrico"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/50"
                  />
                  <button
                    className="rounded-xl border border-[#4aadf5] px-3 py-2 text-xs font-semibold text-[#2e75ba] hover:bg-[#4aadf5]/10 disabled:opacity-60"
                    onClick={() => previewQuery.refetch()}
                    disabled={previewQuery.isFetching}
                  >
                    Refrescar previa
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="py-3 pl-4 text-left">Incluido</th>
                      <th className="py-3 text-left">Empleado</th>
                      <th className="py-3 text-left">Código</th>
                      <th className="py-3 text-left">DPI</th>
                      <th className="py-3 text-left">Biométrico</th>
                      <th className="py-3 text-left">Sucursal</th>
                      <th className="py-3 text-left pr-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewQuery.isLoading && (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-500">
                          Cargando vista previa de empleados...
                        </td>
                      </tr>
                    )}
                    {!previewQuery.isLoading &&
                      previewList.map((emp) => {
                        const selected = selectedEmployees.includes(emp.id);
                        return (
                          <tr key={emp.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                            <td className="py-3 pl-4">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() =>
                                  setSelectedEmployees((prev) =>
                                    prev.includes(emp.id) ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-300 text-[#2e75ba] focus:ring-[#2e75ba]"
                              />
                            </td>
                            <td className="py-3">{emp.name || "Sin nombre"}</td>
                            <td className="py-3 text-slate-700">{emp.code || "—"}</td>
                            <td className="py-3 text-slate-700">{emp.dpi || "—"}</td>
                            <td className="py-3 text-slate-700">{emp.biometricId || "—"}</td>
                            <td className="py-3 text-slate-700">{emp.branch || "—"}</td>
                            <td className="py-3 pr-4">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                                {emp.status || "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    {!previewQuery.isLoading && !previewList.length && (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-500">
                          No hay resultados. Ajusta la búsqueda o sucursal.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="col-span-2 rounded-2xl border border-slate-200 px-4 py-3 space-y-2">
                <p className="text-xs text-slate-500">Resumen</p>
                <div className="flex flex-wrap gap-2 text-sm text-slate-700">
                  <span className="rounded-full bg-[#4aa59c]/10 px-3 py-1 font-semibold text-[#2e8c7f]">{typeLabels[form.runType]}</span>
                  <span className="rounded-full bg-[#4aadf5]/10 px-3 py-1 font-semibold text-[#2e75ba]">
                    {form.periodStart || "Sin inicio"} → {form.periodEnd || "Sin fin"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                    {form.branchId ? "Sucursal seleccionada" : "Sucursal opcional"}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  Crearás la corrida en estado <span className="font-semibold text-[#2e75ba]">DRAFT</span> con{" "}
                  <span className="font-semibold">{selectedEmployees.length}</span> colaboradores seleccionados.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-3 space-y-2">
                <p className="text-xs text-slate-500">Colaboradores incluidos</p>
                <div className="max-h-48 overflow-auto space-y-2">
                  {selectedPreview.map((emp) => (
                    <div key={emp.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <p className="font-semibold">{emp.name}</p>
                      <p className="text-xs text-slate-500">{emp.code || "Sin código"}</p>
                    </div>
                  ))}
                  {!selectedPreview.length && (
                    <p className="text-xs text-slate-500">
                      Selecciona al menos un colaborador en la vista previa para habilitar la creación.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
