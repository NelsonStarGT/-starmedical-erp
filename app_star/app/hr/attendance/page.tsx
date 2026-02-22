/**
 * RRHH · Asistencia
 * Tabs: Registros, Ingreso manual, Marcaje rápido.
 * Usa nuevas rutas /api/hr/attendance*, /api/hr/employees/options, /api/hr/settings.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

type AttendanceRow = {
  id: string;
  employeeId: string;
  branchId?: string | null;
  date: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  source: "MANUAL" | "KIOSK" | "IMPORT" | "AI";
  status: "PRESENTE" | "TARDE" | "AUSENTE" | "INCOMPLETO";
  notes?: string | null;
  timezone?: string;
  employee?: { id: string; firstName?: string | null; lastName?: string | null; employeeCode?: string | null; email?: string | null } | null;
  branch?: { id: string; name: string } | null;
};

type EmployeeOption = {
  id: string;
  name: string;
  code?: string | null;
  email?: string | null;
  dpi?: string | null;
  biometricId?: string | null;
  branchId?: string | null;
  branchName?: string | null;
};
type BranchOption = { id: string; name: string };
type HrSettings = { defaultTimezone?: string; attendanceLateToleranceMinutes?: number; attendanceEmailEnabled?: boolean };

const statusTone: Record<
  AttendanceRow["status"],
  { label: string; className: string; badge: "success" | "warning" | "neutral" | "info" }
> = {
  PRESENTE: { label: "Presente", className: "bg-emerald-50 text-emerald-800 border border-emerald-200", badge: "success" },
  TARDE: { label: "Tarde", className: "bg-amber-50 text-amber-800 border border-amber-200", badge: "warning" },
  INCOMPLETO: { label: "Incompleto", className: "bg-sky-50 text-sky-800 border border-sky-200", badge: "info" },
  AUSENTE: { label: "Ausente", className: "bg-rose-50 text-rose-800 border border-rose-200", badge: "neutral" }
};

const sourceLabel: Record<AttendanceRow["source"], string> = {
  MANUAL: "Manual",
  KIOSK: "Marcaje",
  IMPORT: "Importado",
  AI: "AI"
};

const primaryColor = "#4aa59c";
const secondaryColor = "#4aadf5";
const corporateBlue = "#2e75ba";

async function fetchAttendanceRecords(filters: {
  from: string;
  to: string;
  employeeId?: string;
  branchId?: string | null;
  status?: AttendanceRow["status"] | "";
}) {
  const params = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.employeeId) params.append("employeeId", filters.employeeId);
  if (filters.branchId) params.append("branchId", filters.branchId);
  if (filters.status) params.append("status", filters.status);
  const res = await fetch(`/api/hr/attendance?${params.toString()}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || json?.error || "No se pudieron cargar registros");
  return (json.data || []) as AttendanceRow[];
}

async function fetchEmployees(search: string) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await fetch(`/api/hr/employees/options${qs}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("No se pudieron cargar empleados");
  return (json.data || []) as EmployeeOption[];
}

async function fetchBranches(): Promise<BranchOption[]> {
  const res = await fetch("/api/hr/branches?includeInactive=1", { cache: "no-store" });
  if (!res.ok) return [];
  const payload = await res.json().catch(() => ({}));
  return (payload.data || []).map((b: any) => ({ id: b.id, name: b.name }));
}

async function fetchSettings(): Promise<HrSettings | null> {
  const res = await fetch("/api/hr/settings", { cache: "no-store" });
  if (!res.ok) return null;
  const payload = await res.json().catch(() => ({}));
  return payload.data || null;
}

const emptyState = (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
    <p className="text-sm font-semibold text-slate-700">Sin registros aún</p>
    <p className="text-xs text-slate-500">Empieza agregando una entrada manual o usando el marcaje rápido.</p>
  </div>
);

export default function AttendancePage() {
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [tab, setTab] = useState<"records" | "manual" | "kiosk">("records");
  const [from, setFrom] = useState(() => format(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
  const [to, setTo] = useState(today);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AttendanceRow["status"] | "">("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [manualForm, setManualForm] = useState<{
    employeeId: string;
    date: string;
    time: string;
    timeOut: string;
    notes: string;
    branchId?: string | null;
    mode: "IN" | "OUT" | "BOTH";
  }>({
    employeeId: "",
    date: today,
    time: "",
    timeOut: "",
    notes: "",
    branchId: null,
    mode: "IN"
  });
  const [markEmployeeId, setMarkEmployeeId] = useState("");
  const [lastMark, setLastMark] = useState<{ type: "IN" | "OUT"; at: string; employeeName?: string }>({ type: "IN", at: "" });
  const [importSummary, setImportSummary] = useState<{ imported: number; skipped?: number; errors?: number; total?: number } | null>(null);
  const [processSummary, setProcessSummary] = useState<{ processed: number; ignored: number; failed: number } | null>(null);
  const { toasts, showToast, dismiss } = useToast();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({ queryKey: ["hr-settings"], queryFn: fetchSettings, staleTime: 60_000 });
  const employeesQuery = useQuery({ queryKey: ["employee-options", employeeSearch], queryFn: () => fetchEmployees(employeeSearch), staleTime: 30_000 });
  const branchesQuery = useQuery({ queryKey: ["hr-branches"], queryFn: fetchBranches, staleTime: 60_000 });
  const attendanceQuery = useQuery({
    queryKey: ["attendance-records", from, to, employeeFilter, branchFilter, statusFilter],
    queryFn: () => fetchAttendanceRecords({ from, to, employeeId: employeeFilter || undefined, branchId: branchFilter || undefined, status: statusFilter || undefined }),
    enabled: Boolean(from && to)
  });

  const manualMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        employeeId: manualForm.employeeId,
        date: manualForm.date,
        notes: manualForm.notes || undefined
      };
      if (manualForm.mode === "IN" && manualForm.time) payload.checkIn = manualForm.time;
      if (manualForm.mode === "OUT" && manualForm.time) payload.checkOut = manualForm.time;
      if (manualForm.mode === "BOTH" && manualForm.time) {
        payload.checkIn = manualForm.time;
        if (manualForm.timeOut) payload.checkOut = manualForm.timeOut;
        payload.allowBoth = true;
      }
      if (manualForm.branchId) payload.branchId = manualForm.branchId;
      const res = await fetch("/api/hr/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || json?.error || "No se pudo guardar asistencia");
      return json.data as AttendanceRow;
    },
    onSuccess: () => {
      showToast("Asistencia guardada", "success");
      void queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
    },
    onError: (err: any) => showToast(err?.message || "Error al guardar", "error")
  });

  const markInMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/hr/attendance/mark-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: markEmployeeId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || json?.error || "No se pudo marcar entrada");
      return json.data as AttendanceRow;
    },
    onSuccess: (record) => {
      setLastMark({
        type: "IN",
        at: record.checkInAt || new Date().toISOString(),
        employeeName: [record.employee?.firstName, record.employee?.lastName].filter(Boolean).join(" ")
      });
      showToast("Entrada registrada", "success");
      void queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
    },
    onError: (err: any) => showToast(err?.message || "No se pudo marcar entrada", "error")
  });

  const markOutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/hr/attendance/mark-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: markEmployeeId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || json?.error || "No se pudo marcar salida");
      return json.data as AttendanceRow;
    },
    onSuccess: (record) => {
      setLastMark({
        type: "OUT",
        at: record.checkOutAt || new Date().toISOString(),
        employeeName: [record.employee?.firstName, record.employee?.lastName].filter(Boolean).join(" ")
      });
      showToast("Salida registrada", "success");
      void queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
    },
    onError: (err: any) => showToast(err?.message || "No se pudo marcar salida", "error")
  });

  const importRawMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/attendance/import/raw", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error?.message || json?.error || "No se pudo importar marcajes");
      return json.data || json;
    },
    onSuccess: (data: any) => {
      const summary = {
        imported: data?.imported || 0,
        skipped: data?.skipped || 0,
        errors: data?.errors || 0,
        total: data?.total || 0
      };
      setImportSummary(summary);
      showToast(`Importados ${summary.imported}; omitidos ${summary.skipped}; errores ${summary.errors}`, "success");
    },
    onError: (err: any) => showToast(err?.message || "No se pudo importar", "error")
  });

  const processRawMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/attendance/process", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error?.message || json?.error || "No se pudo procesar");
      return json.data || json;
    },
    onSuccess: (data: any) => {
      const summary = {
        processed: data?.processed || 0,
        ignored: data?.ignored || 0,
        failed: data?.failed || 0
      };
      setProcessSummary(summary);
      showToast(`Procesado: ${summary.processed} ok · ${summary.ignored} ignorados · ${summary.failed} fallidos`, "success");
      void queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
    },
    onError: (err: any) => showToast(err?.message || "No se pudo procesar", "error")
  });

  const employees = employeesQuery.data || [];
  const branches = branchesQuery.data || [];
  const timezone = settingsQuery.data?.defaultTimezone || "America/Guatemala";

  const selectedEmployee = employees.find((e) => e.id === manualForm.employeeId);
  useEffect(() => {
    setManualForm((prev) => ({ ...prev, branchId: selectedEmployee?.branchId || null }));
  }, [selectedEmployee]);

  const statusPill = (value: AttendanceRow["status"]) => (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", statusTone[value].className)}>
      {statusTone[value].label}
    </span>
  );

  const renderRecords = () => {
    if (attendanceQuery.isLoading) {
      return <p className="text-sm text-slate-500">Cargando registros...</p>;
    }
    if (!attendanceQuery.data || attendanceQuery.data.length === 0) return emptyState;

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Empleado</th>
              <th className="px-4 py-3">Sucursal</th>
              <th className="px-4 py-3">Entrada</th>
              <th className="px-4 py-3">Salida</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fuente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {attendanceQuery.data?.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-800">{format(new Date(row.date), "yyyy-MM-dd")}</td>
                <td className="px-4 py-3 text-slate-700">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {[row.employee?.firstName, row.employee?.lastName].filter(Boolean).join(" ") || row.employeeId}
                    </span>
                    {row.employee?.employeeCode && <span className="text-xs text-slate-500">{row.employee.employeeCode}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{row.branch?.name || "—"}</td>
                <td className="px-4 py-3 text-slate-700">{row.checkInAt ? format(new Date(row.checkInAt), "HH:mm") : "—"}</td>
                <td className="px-4 py-3 text-slate-700">{row.checkOutAt ? format(new Date(row.checkOutAt), "HH:mm") : "—"}</td>
                <td className="px-4 py-3">{statusPill(row.status)}</td>
                <td className="px-4 py-3">
                  <Badge variant="neutral">{sourceLabel[row.source]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const handleExportCsv = () => {
    const rows = attendanceQuery.data || [];
    if (!rows.length) {
      showToast("No hay registros para exportar", "error");
      return;
    }
    const header = ["Fecha", "Empleado", "Código", "Sucursal", "Entrada", "Salida", "Estado", "Fuente"];
    const lines = rows.map((row) => {
      const fecha = format(new Date(row.date), "yyyy-MM-dd");
      const empleado = [row.employee?.firstName, row.employee?.lastName].filter(Boolean).join(" ") || row.employeeId;
      const codigo = row.employee?.employeeCode || "";
      const sucursal = row.branch?.name || "";
      const entrada = row.checkInAt ? format(new Date(row.checkInAt), "HH:mm") : "";
      const salida = row.checkOutAt ? format(new Date(row.checkOutAt), "HH:mm") : "";
      return [fecha, empleado, codigo, sucursal, entrada, salida, row.status, sourceLabel[row.source]].map((value) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`
      ).join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `asistencia_${from}_a_${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Exportación generada", "success");
  };

  return (
    <div className="space-y-5 bg-gradient-to-br from-white via-sky-50 to-slate-50 p-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white/90 shadow-soft">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-[#4aa59c] via-[#4aadf5] to-[#2e75ba] px-6 py-5 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-80">RRHH · Asistencia</p>
            <h1 className="font-['Montserrat'] text-2xl font-semibold drop-shadow-sm">Registros y marcaje en tiempo real</h1>
            <p className="text-sm opacity-85">Marcaje manual y kiosk, con confirmaciones por correo y horario base en {timezone}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "records", label: "Registros" },
              { key: "manual", label: "Ingreso manual" },
              { key: "kiosk", label: "Marcaje" }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key as any)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold shadow transition",
                  tab === item.key
                    ? "bg-white text-slate-900"
                    : "bg-white/20 text-white ring-1 ring-white/40 hover:bg-white/30"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === "records" && (
        <div className="space-y-4">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="font-['Montserrat'] text-lg text-slate-800">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div>
                <label className="text-xs text-slate-600">Desde</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Hasta</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-600">Empleado</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Buscar por nombre, DPI, código o biométrico"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                />
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.code ? `(${emp.code})` : ""} {emp.dpi ? `· DPI ${emp.dpi}` : ""}{" "}
                      {emp.biometricId ? `· Bio ${emp.biometricId}` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">Escribe para buscar y selecciona un resultado.</p>
              </div>
              <div>
                <label className="text-xs text-slate-600">Sucursal</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={branchFilter || ""}
                  onChange={(e) => setBranchFilter(e.target.value || null)}
                >
                  <option value="">Todas</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600">Estado</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="">Todos</option>
                  <option value="PRESENTE">Presente</option>
                  <option value="TARDE">Tarde</option>
                  <option value="INCOMPLETO">Incompleto</option>
                  <option value="AUSENTE">Ausente</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <CardTitle className="font-['Montserrat'] text-lg text-slate-800">Registros</CardTitle>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  disabled={attendanceQuery.isLoading}
                >
                  Exportar CSV
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {attendanceQuery.data && attendanceQuery.data.length > 0 && (
                <p className="text-xs text-slate-500">
                  Zona horaria: <span className="font-semibold text-slate-700">{timezone}</span>. Tolerancia tardanza:{" "}
                  {settingsQuery.data?.attendanceLateToleranceMinutes ?? 10} minutos.
                </p>
              )}
              {renderRecords()}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "manual" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 shadow-soft">
            <CardHeader>
              <CardTitle className="font-['Montserrat'] text-lg text-slate-800">Ingreso manual</CardTitle>
              <p className="text-sm text-slate-500">Un registro por día. Usa las horas locales en {timezone}.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs text-slate-600">Empleado</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={manualForm.employeeId}
                    onChange={(e) => setManualForm({ ...manualForm, employeeId: e.target.value })}
                  >
                    <option value="">Selecciona empleado</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} {emp.code ? `(${emp.code})` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Busca por nombre:{" "}
                    <input
                      className="rounded border border-slate-200 px-2 py-1 text-xs"
                      placeholder="Buscar..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                    />
                  </p>
                </div>
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-600">Sucursal asignada</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedEmployee?.branchName ? <Badge variant="info">{selectedEmployee.branchName}</Badge> : <span className="text-slate-500">Sin sucursal principal</span>}
                  </p>
                  <p className="text-[11px] text-slate-500">Se asigna automáticamente al guardar.</p>
                </div>
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs text-slate-600">Tipo de registro</p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {[
                      { key: "IN", label: "Registrar entrada" },
                      { key: "OUT", label: "Registrar salida" },
                      { key: "BOTH", label: "Ambos (admin)" }
                    ].map((opt) => (
                      <label key={opt.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                        <input
                          type="radio"
                          name="manual-type"
                          value={opt.key}
                          checked={manualForm.mode === opt.key}
                          onChange={() => setManualForm((f) => ({ ...f, mode: opt.key as any }))}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs text-slate-600">Fecha</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={manualForm.date}
                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">
                    {manualForm.mode === "OUT" ? "Hora de salida" : "Hora de entrada"}
                  </label>
                  <input
                    type="time"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={manualForm.time}
                    onChange={(e) => setManualForm({ ...manualForm, time: e.target.value })}
                  />
                </div>
                {manualForm.mode === "BOTH" && (
                  <div>
                    <label className="text-xs text-slate-600">Hora de salida</label>
                    <input
                      type="time"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={manualForm.timeOut}
                      onChange={(e) => setManualForm({ ...manualForm, timeOut: e.target.value })}
                    />
                    <p className="text-[11px] text-slate-500">Solo administradores pueden registrar ambos.</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-600">Notas</label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Observaciones del supervisor"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => manualMutation.mutate()}
                  disabled={
                    !manualForm.employeeId ||
                    !manualForm.time ||
                    (manualForm.mode === "BOTH" && !manualForm.timeOut) ||
                    manualMutation.isPending
                  }
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-soft transition"
                  style={{ backgroundColor: primaryColor }}
                >
                  {manualMutation.isPending ? "Guardando..." : "Guardar registro"}
                </button>
                {selectedEmployee?.email && (
                  <p className="text-xs text-slate-500">Se notificará a {selectedEmployee.email} si notificaciones están activas.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="font-['Montserrat'] text-lg text-slate-800">Guía rápida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>• Un registro por día. La salida requiere una entrada previa.</p>
              <p>• Zona horaria base: {timezone}. Ajusta tolerancia en Configuración HR.</p>
              <p>• Fuentes manuales se marcan como MANUAL; marcaje automático usa KIOSK.</p>
              <p className="text-xs text-slate-500">
                ¿Necesitas importaciones masivas? Usa la API /api/hr/attendance/manual con un batch.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "kiosk" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white shadow-soft">
            <div className="flex flex-col gap-4 bg-gradient-to-r from-[#2e75ba] via-[#4aadf5] to-[#4aa59c] px-6 py-5 text-white">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] opacity-80">Marcaje Kiosk</p>
                <h2 className="font-['Montserrat'] text-xl font-semibold">Marcar entrada / salida</h2>
                <p className="text-sm opacity-90">Busca al colaborador y confirma con un toque.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="text-xs text-white/80">Empleado</label>
                  <select
                    className="w-full rounded-xl border border-white/40 bg-white/90 px-3 py-2 text-sm text-slate-800"
                    value={markEmployeeId}
                    onChange={(e) => setMarkEmployeeId(e.target.value)}
                  >
                    <option value="">Selecciona colaborador</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} {emp.code ? `(${emp.code})` : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    className="mt-2 w-full rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
                    placeholder="Buscar por nombre, DPI o código"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => markInMutation.mutate()}
                    disabled={!markEmployeeId || markInMutation.isPending}
                    className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-95 disabled:opacity-60"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {markInMutation.isPending ? "Marcando..." : "Marcar entrada"}
                  </button>
                  <button
                    onClick={() => markOutMutation.mutate()}
                    disabled={!markEmployeeId || markOutMutation.isPending}
                    className="flex-1 rounded-xl border border-white/60 bg-white/20 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-white/30 disabled:opacity-60"
                  >
                    {markOutMutation.isPending ? "Marcando..." : "Marcar salida"}
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-4">
              {lastMark.at ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-emerald-50 px-4 py-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    {lastMark.type === "IN" ? "IN" : "OUT"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {lastMark.type === "IN" ? "Entrada" : "Salida"} confirmada{" "}
                      {lastMark.employeeName ? `para ${lastMark.employeeName}` : ""}
                    </p>
                    <p className="text-xs text-slate-600">{format(new Date(lastMark.at), "PPpp")}</p>
                  </div>
                </div>
              ) : (
              <p className="text-sm text-slate-600">Aún no hay marcajes en esta sesión.</p>
              )}
            </div>
          </div>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="font-['Montserrat'] text-lg text-slate-800">Ayuda rápida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>• Si existe entrada previa, se bloquea un nuevo check-in con código 409.</p>
              <p>• Las notificaciones por correo dependen del ajuste “attendanceEmailEnabled”.</p>
              <p>
                • Ver bitácora:{" "}
                <Link href="/app/marcaje/tokens" className="text-[#2e75ba] underline">
                  Tokens de marcaje
                </Link>
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 shadow-soft">
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="font-['Montserrat'] text-lg text-slate-800">Importar marcajes (ZKTime)</CardTitle>
                <p className="text-xs text-slate-500">Sube CSV/Excel; se omiten duplicados y puedes procesar los pendientes.</p>
              </div>
              {importSummary && (
                <Badge variant="info">
                  {importSummary.imported} importados · {importSummary.skipped || 0} omitidos · {importSummary.errors || 0} errores
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                <div className="flex-1">
                  <label className="text-xs text-slate-600">Archivo ZKTime (Excel/CSV)</label>
                  <input
                    type="file"
                    accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) importRawMutation.mutate(file);
                    }}
                    disabled={importRawMutation.isPending}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => processRawMutation.mutate()}
                    disabled={processRawMutation.isPending}
                    className="rounded-lg bg-[#4aa59c] px-4 py-2 text-xs font-semibold text-white shadow-soft hover:-translate-y-px transition disabled:opacity-60"
                  >
                    {processRawMutation.isPending ? "Procesando..." : "Procesar pendientes"}
                  </button>
                  {processSummary && (
                    <Badge variant="neutral">
                      {processSummary.processed} procesados · {processSummary.ignored} ignorados · {processSummary.failed} fallidos
                    </Badge>
                  )}
                </div>
              </div>
              {importSummary && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  <p>
                    Lote: {importSummary.total ?? importSummary.imported + (importSummary.skipped || 0)} filas · Importados:{" "}
                    {importSummary.imported} · Omitidos/duplicados: {importSummary.skipped || 0} · Errores: {importSummary.errors || 0}
                  </p>
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                Se buscan columnas AC-No/Time en el archivo de ZKTime. Los eventos quedan en estado NEW hasta procesarlos.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
