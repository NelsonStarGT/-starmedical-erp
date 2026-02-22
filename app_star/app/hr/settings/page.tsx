"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/ui/Toast";
import { branchSchema, hrSettingsSchema } from "@/lib/hr/schemas";
import UploadField from "@/components/ui/UploadField";
import { broadcastIdentityUpdate, initialsFromIdentity } from "@/lib/identity";
import { useIdentityConfig } from "@/hooks/useIdentityConfig";

type Branch = {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  isActive: boolean;
};

type HrSettings = {
  id: number;
  currencyCode: "GTQ" | "USD";
  logoUrl?: string | null;
  logoFileKey?: string | null;
  attendanceEmailEnabled?: boolean;
  attendanceAdminRecipients?: string[];
  photoSafetyEnabled?: boolean;
  openaiEnabled?: boolean;
  openaiApiKeySet?: boolean;
  defaultTimezone?: string | null;
  attendanceStartTime?: string | null;
  attendanceLateToleranceMinutes?: number | null;
};

type SiteOption = { id: string; name: string };
type Shift = {
  id: string;
  siteId: string;
  name: string;
  startTime: string;
  endTime: string;
  toleranceMinutes: number;
  lunchMinutes?: number | null;
  lunchPaid: boolean;
  overtimeAllowed: boolean;
  isDefaultForSite: boolean;
};

type Assignment = {
  id: string;
  employeeId: string;
  siteId: string;
  shiftId: string;
  startDate: string;
  endDate?: string | null;
  isPrimary: boolean;
  shift?: Shift;
};

async function fetchBranches(): Promise<Branch[]> {
  const res = await fetch("/api/hr/branches?includeInactive=1", { cache: "no-store" });
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.data || [];
}

async function fetchSettings(): Promise<HrSettings | null> {
  const res = await fetch("/api/hr/settings", { cache: "no-store" });
  if (!res.ok) return null;
  const payload = await res.json();
  return payload.data || null;
}

export default function HrSettingsPage() {
  const queryClient = useQueryClient();
  const { toasts, showToast, dismiss } = useToast();
  const [activeTab, setActiveTab] = useState<"branches" | "currency" | "identity" | "assignments" | "attendance">("branches");
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchForm, setBranchForm] = useState<{ name: string; code: string; address: string; isActive: boolean }>({
    name: "",
    code: "",
    address: "",
    isActive: true
  });
  const [currencyCode, setCurrencyCode] = useState<"GTQ" | "USD">("GTQ");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoFileKey, setLogoFileKey] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [shiftForm, setShiftForm] = useState<{ name: string; startTime: string; endTime: string; toleranceMinutes: number; lunchMinutes?: number | null; lunchPaid: boolean; overtimeAllowed: boolean }>({
    name: "",
    startTime: "08:00",
    endTime: "17:00",
    toleranceMinutes: 15,
    lunchMinutes: 60,
    lunchPaid: false,
    overtimeAllowed: false
  });
  const [assignmentForm, setAssignmentForm] = useState<{ employeeId: string; shiftId: string; startDate: string; endDate: string }>({
    employeeId: "",
    shiftId: "",
    startDate: "",
    endDate: ""
  });
  const [aiForm, setAiForm] = useState<{
    photoSafetyEnabled: boolean;
    attendanceEmailEnabled: boolean;
    attendanceAdminRecipients: string;
    defaultTimezone: string;
    attendanceStartTime: string;
    attendanceLateToleranceMinutes: number;
  }>({
    photoSafetyEnabled: false,
    attendanceEmailEnabled: false,
    attendanceAdminRecipients: "",
    defaultTimezone: "America/Guatemala",
    attendanceStartTime: "08:00",
    attendanceLateToleranceMinutes: 10
  });

  const branchesQuery = useQuery({
    queryKey: ["hr-branches-settings"],
    queryFn: fetchBranches,
    staleTime: 30_000,
    retry: 1
  });
  const sitesQuery = useQuery({
    queryKey: ["attendance-sites"],
    queryFn: async (): Promise<SiteOption[]> => {
      const res = await fetch("/api/hr/attendance/sites");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 60_000
  });
  const shiftsQuery = useQuery({
    queryKey: ["attendance-shifts", selectedSiteId],
    queryFn: async (): Promise<Shift[]> => {
      if (!selectedSiteId) return [];
      const res = await fetch(`/api/hr/attendance/shifts?siteId=${selectedSiteId}`);
      if (!res.ok) throw new Error("No se pudieron cargar turnos");
      const json = await res.json();
      return json.data || [];
    },
    enabled: Boolean(selectedSiteId)
  });
  const assignmentsQuery = useQuery({
    queryKey: ["attendance-assignments", selectedSiteId],
    queryFn: async (): Promise<Assignment[]> => {
      if (!selectedSiteId) return [];
      const res = await fetch(`/api/hr/attendance/assignments?siteId=${selectedSiteId}`);
      if (!res.ok) throw new Error("No se pudieron cargar asignaciones");
      const json = await res.json();
      return json.data || [];
    },
    enabled: Boolean(selectedSiteId)
  });
  const { identity, isLoading: identityLoading } = useIdentityConfig();
  const settingsQuery = useQuery({
    queryKey: ["hr-settings"],
    queryFn: fetchSettings,
    staleTime: 30_000,
    retry: 1
  });
  useEffect(() => {
    if (settingsQuery.data?.currencyCode) {
      setCurrencyCode(settingsQuery.data.currencyCode);
    }
    if (settingsQuery.data) {
      setAiForm((prev) => ({
        ...prev,
        attendanceEmailEnabled: Boolean(settingsQuery.data?.attendanceEmailEnabled),
        photoSafetyEnabled: Boolean(settingsQuery.data?.photoSafetyEnabled),
        defaultTimezone: settingsQuery.data?.defaultTimezone || prev.defaultTimezone,
        attendanceAdminRecipients: (settingsQuery.data?.attendanceAdminRecipients || []).join(", "),
        attendanceStartTime: settingsQuery.data?.attendanceStartTime || prev.attendanceStartTime,
        attendanceLateToleranceMinutes: settingsQuery.data?.attendanceLateToleranceMinutes ?? prev.attendanceLateToleranceMinutes
      }));
    }
  }, [settingsQuery.data]);
  useEffect(() => {
    if (identity?.logoUrl) setLogoUrl(identity.logoUrl);
    if (identity?.logoFileKey) setLogoFileKey(identity.logoFileKey);
    if (!identity?.logoUrl && settingsQuery.data?.logoUrl) {
      setLogoUrl(settingsQuery.data.logoUrl);
    }
    if (!identity?.logoFileKey && settingsQuery.data?.logoFileKey) {
      setLogoFileKey(settingsQuery.data.logoFileKey);
    }
  }, [identity?.logoFileKey, identity?.logoUrl, settingsQuery.data?.logoFileKey, settingsQuery.data?.logoUrl]);

  const activeBranches = useMemo(() => (branchesQuery.data || []).filter((b) => b.isActive), [branchesQuery.data]);
  useEffect(() => {
    if (!selectedSiteId && sitesQuery.data?.[0]?.id) {
      setSelectedSiteId(sitesQuery.data[0].id);
    }
  }, [selectedSiteId, sitesQuery.data]);

  const createBranchMutation = useMutation({
    mutationFn: async (payload: typeof branchForm) => {
      const res = await fetch("/api/hr/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo crear la sucursal");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hr-branches-settings"] });
      showToast("Sucursal creada", "success");
      setShowBranchModal(false);
    },
    onError: (err: any) => showToast(err?.message || "Error al crear", "error")
  });

  const updateBranchMutation = useMutation({
    mutationFn: async (payload: { id: string; data: Partial<typeof branchForm> }) => {
      const res = await fetch(`/api/hr/branches/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo actualizar la sucursal");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hr-branches-settings"] });
      showToast("Sucursal actualizada", "success");
      setShowBranchModal(false);
      setEditingBranchId(null);
    },
    onError: (err: any) => showToast(err?.message || "Error al actualizar", "error")
  });

  const updateCurrencyMutation = useMutation({
    mutationFn: async (code: "GTQ" | "USD") => {
      const res = await fetch("/api/hr/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currencyCode: code })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo actualizar la moneda");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hr-settings"] });
      showToast("Moneda actualizada", "success");
    },
    onError: (err: any) => showToast(err?.message || "Error al actualizar", "error")
  });

  const updateLogoMutation = useMutation({
    mutationFn: async (payload: { url: string; fileKey?: string | null }) => {
      const res = await fetch("/api/config/identity", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: payload.url, logoFileKey: payload.fileKey ?? null })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo actualizar el logo");
      }
      return res.json();
    },
    onSuccess: (payload) => {
      if (payload?.data) {
        setLogoUrl(payload.data.logoUrl || "");
        setLogoFileKey(payload.data.logoFileKey || "");
      }
      void queryClient.invalidateQueries({ queryKey: ["hr-settings"] });
      broadcastIdentityUpdate();
      showToast("Logo actualizado", "success");
    },
    onError: (err: any) => showToast(err?.message || "Error al actualizar", "error")
  });

  const saveAiMutation = useMutation({
    mutationFn: async () => {
      const recipients = aiForm.attendanceAdminRecipients
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const res = await fetch("/api/hr/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoSafetyEnabled: aiForm.photoSafetyEnabled,
          attendanceEmailEnabled: aiForm.attendanceEmailEnabled,
          attendanceAdminRecipients: recipients,
          defaultTimezone: aiForm.defaultTimezone,
          attendanceStartTime: aiForm.attendanceStartTime,
          attendanceLateToleranceMinutes: aiForm.attendanceLateToleranceMinutes
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || json?.message || "No se pudieron guardar los ajustes");
      return json.data as HrSettings;
    },
    onSuccess: (data) => {
      showToast("Ajustes guardados", "success");
    },
    onError: (err: any) => showToast(err?.message || "Error al guardar ajustes", "error")
  });

  const createShiftMutation = useMutation({
    mutationFn: async (payload: typeof shiftForm & { siteId: string }) => {
      const res = await fetch("/api/hr/attendance/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo crear el turno");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["attendance-shifts", selectedSiteId] });
      showToast("Turno creado", "success");
    },
    onError: (err: any) => showToast(err?.message || "Error al crear turno", "error")
  });

  const setDefaultShiftMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/hr/attendance/shifts/${id}/set-default`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo marcar default");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["attendance-shifts", selectedSiteId] });
      showToast("Turno marcado default", "success");
    },
    onError: (err: any) => showToast(err?.message || "Error al marcar default", "error")
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (payload: { employeeId: string; shiftId: string; startDate: string; endDate?: string }) => {
      const res = await fetch("/api/hr/attendance/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, siteId: selectedSiteId })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo asignar");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["attendance-assignments", selectedSiteId] });
      showToast("Asignación creada", "success");
      setAssignmentForm({ employeeId: "", shiftId: "", startDate: "", endDate: "" });
    },
    onError: (err: any) => showToast(err?.message || "Error al asignar", "error")
  });

  const endAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/hr/attendance/assignments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo cerrar asignación");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["attendance-assignments", selectedSiteId] });
      showToast("Asignación cerrada", "success");
    },
    onError: (err: any) => showToast(err?.message || "Error al cerrar asignación", "error")
  });

  const openNewBranch = () => {
    setEditingBranchId(null);
    setBranchForm({ name: "", code: "", address: "", isActive: true });
    setShowBranchModal(true);
  };

  const openEditBranch = (branch: Branch) => {
    setEditingBranchId(branch.id);
    setBranchForm({
      name: branch.name || "",
      code: branch.code || "",
      address: branch.address || "",
      isActive: branch.isActive
    });
    setShowBranchModal(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-500">RRHH</p>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Ajustes</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("branches")}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            activeTab === "branches" ? "border-brand-primary bg-brand-primary text-white" : "border-slate-200 text-slate-700"
          }`}
        >
          Sucursales
        </button>
        <button
          onClick={() => {
            if (settingsQuery.data?.currencyCode) setCurrencyCode(settingsQuery.data.currencyCode);
            setActiveTab("currency");
          }}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            activeTab === "currency" ? "border-brand-primary bg-brand-primary text-white" : "border-slate-200 text-slate-700"
          }`}
        >
          Moneda
        </button>
        <button
          onClick={() => setActiveTab("identity")}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            activeTab === "identity" ? "border-brand-primary bg-brand-primary text-white" : "border-slate-200 text-slate-700"
          }`}
        >
          Identidad (logo)
        </button>
        <button
          onClick={() => {
            if (!selectedSiteId && sitesQuery.data?.[0]?.id) setSelectedSiteId(sitesQuery.data[0].id);
            setActiveTab("assignments");
          }}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            activeTab === "assignments" ? "border-brand-primary bg-brand-primary text-white" : "border-slate-200 text-slate-700"
          }`}
        >
          Asignaciones
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            activeTab === "attendance" ? "border-brand-primary bg-brand-primary text-white" : "border-slate-200 text-slate-700"
          }`}
        >
          Asistencia
        </button>
      </div>

      {activeTab === "branches" && (
        <Card className="border border-slate-200">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Sucursales</CardTitle>
            <button
              onClick={openNewBranch}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition"
            >
              + Nueva sucursal
            </button>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Activas: {activeBranches.length}</span>
              <span>•</span>
              <span>Total: {branchesQuery.data?.length || 0}</span>
            </div>
            {branchesQuery.isLoading && <p className="text-sm text-slate-500">Cargando sucursales...</p>}
            {branchesQuery.isError && (
              <div className="flex items-center gap-2 text-sm text-rose-600">
                <span>No se pudieron cargar las sucursales.</span>
                <button
                  onClick={() => branchesQuery.refetch()}
                  className="text-xs font-semibold text-brand-primary hover:underline"
                >
                  Reintentar
                </button>
              </div>
            )}
            {!branchesQuery.isLoading && branchesQuery.data?.length === 0 && (
              <p className="text-sm text-slate-500">No hay sucursales registradas.</p>
            )}
            <div className="space-y-3">
              {(branchesQuery.data || []).map((branch) => (
                <div key={branch.id} className="rounded-xl border border-slate-200 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{branch.name}</p>
                        <Badge variant={branch.isActive ? "success" : "warning"}>
                          {branch.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">Código: {branch.code || "—"}</p>
                      <p className="text-xs text-slate-500">Dirección: {branch.address || "Sin dirección"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditBranch(branch)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() =>
                          updateBranchMutation.mutate({
                            id: branch.id,
                            data: { isActive: !branch.isActive }
                          })
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        disabled={updateBranchMutation.isPending}
                      >
                        {branch.isActive ? "Inactivar" : "Activar"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "currency" && (
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle>Moneda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {settingsQuery.isLoading && <p className="text-sm text-slate-500">Cargando configuración...</p>}
            {settingsQuery.isError && (
              <div className="flex items-center gap-2 text-sm text-rose-600">
                <span>No se pudo cargar la configuración.</span>
                <button
                  onClick={() => settingsQuery.refetch()}
                  className="text-xs font-semibold text-brand-primary hover:underline"
                >
                  Reintentar
                </button>
              </div>
            )}
            <div className="max-w-sm space-y-2">
              <label className="text-sm font-semibold text-slate-600">Moneda predeterminada</label>
              <select
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value as "GTQ" | "USD")}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                <option value="GTQ">GTQ (Quetzal)</option>
                <option value="USD">USD (Dólar)</option>
              </select>
            </div>
            <button
              onClick={() => {
                const parsed = hrSettingsSchema.safeParse({ currencyCode });
                if (!parsed.success) {
                  showToast("Moneda inválida", "error");
                  return;
                }
                updateCurrencyMutation.mutate(parsed.data.currencyCode);
              }}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition disabled:opacity-60"
              disabled={updateCurrencyMutation.isPending}
            >
              {updateCurrencyMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
      </CardContent>
    </Card>
  )}

      {activeTab === "identity" && (
        <Card className="border border-slate-200">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Identidad visual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-slate-600">Sube el logo institucional para usarlo en el ERP y reportes.</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                {logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logoUrl} alt="Logo StarMedical" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-sm font-semibold text-slate-500">{initialsFromIdentity(identity?.name)}</span>
                )}
              </div>
              <div className="flex-1 min-w-[220px] space-y-2">
                <UploadField
                  value={logoUrl}
                  onChange={(url, info) => {
                    setLogoUrl(url);
                    setLogoFileKey(info?.fileKey || "");
                    updateLogoMutation.mutate({ url, fileKey: info?.fileKey });
                  }}
                  accept="image/*"
                  helperText="PNG/JPG recomendado, fondo transparente."
                  onUploadSuccess={() => showToast("Logo cargado", "success")}
                  onUploadError={(message) => showToast(message, "error")}
                  disabled={identityLoading || updateLogoMutation.isPending}
                />
                <p className="text-xs text-slate-500">Se guardará al cargar. Dimensiones sugeridas: 256x256 o proporción horizontal.</p>
                <p className="text-[11px] text-slate-400">{logoFileKey ? "Logo almacenado en configuración" : "Sin logo registrado"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "assignments" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-600">
              Site
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {(sitesQuery.data || []).map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Card className="border border-slate-200">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Turnos del site</CardTitle>
              <button
                onClick={() =>
                  createShiftMutation.mutate({
                    ...shiftForm,
                    siteId: selectedSiteId
                  })
                }
                disabled={!selectedSiteId || createShiftMutation.isPending}
                className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
              >
                {createShiftMutation.isPending ? "Guardando..." : "Crear turno"}
              </button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  placeholder="Nombre"
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm((f) => ({ ...f, name: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                />
                <input
                  type="time"
                  value={shiftForm.startTime}
                  onChange={(e) => setShiftForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                />
                <input
                  type="time"
                  value={shiftForm.endTime}
                  onChange={(e) => setShiftForm((f) => ({ ...f, endTime: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-sm text-slate-700">
                  Tolerancia (min)
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={shiftForm.toleranceMinutes}
                    onChange={(e) => setShiftForm((f) => ({ ...f, toleranceMinutes: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Almuerzo (min)
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={shiftForm.lunchMinutes ?? 0}
                    onChange={(e) => setShiftForm((f) => ({ ...f, lunchMinutes: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={shiftForm.lunchPaid}
                      onChange={(e) => setShiftForm((f) => ({ ...f, lunchPaid: e.target.checked }))}
                    />
                    Almuerzo pagado
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={shiftForm.overtimeAllowed}
                      onChange={(e) => setShiftForm((f) => ({ ...f, overtimeAllowed: e.target.checked }))}
                    />
                    Overtime permitido
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                {(shiftsQuery.data || []).map((shift) => (
                  <div key={shift.id} className="flex flex-wrap items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {shift.name} {shift.isDefaultForSite && <Badge variant="success">Default</Badge>}
                      </p>
                      <p className="text-xs text-slate-500">
                        {shift.startTime} - {shift.endTime} · Tol {shift.toleranceMinutes}m · Lunch {shift.lunchMinutes || 0}m{" "}
                        {shift.lunchPaid ? "(pagado)" : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => setDefaultShiftMutation.mutate(shift.id)}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60"
                      disabled={setDefaultShiftMutation.isPending}
                    >
                      Marcar default
                    </button>
                  </div>
                ))}
                {!shiftsQuery.isLoading && (shiftsQuery.data || []).length === 0 && <p className="text-sm text-slate-500">Sin turnos</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Asignaciones</CardTitle>
              <button
                onClick={() =>
                  createAssignmentMutation.mutate({
                    employeeId: assignmentForm.employeeId,
                    shiftId: assignmentForm.shiftId,
                    startDate: assignmentForm.startDate,
                    endDate: assignmentForm.endDate || undefined
                  })
                }
                disabled={!selectedSiteId || createAssignmentMutation.isPending}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
              >
                {createAssignmentMutation.isPending ? "Asignando..." : "Asignar colaborador"}
              </button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 md:grid-cols-4">
                <input
                  placeholder="Empleado ID"
                  value={assignmentForm.employeeId}
                  onChange={(e) => setAssignmentForm((f) => ({ ...f, employeeId: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                />
                <select
                  value={assignmentForm.shiftId}
                  onChange={(e) => setAssignmentForm((f) => ({ ...f, shiftId: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                >
                  <option value="">Turno</option>
                  {(shiftsQuery.data || []).map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={assignmentForm.startDate}
                  onChange={(e) => setAssignmentForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                />
                <input
                  type="date"
                  value={assignmentForm.endDate}
                  onChange={(e) => setAssignmentForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>

              <div className="space-y-2">
                {(assignmentsQuery.data || []).map((asg) => (
                  <div key={asg.id} className="flex flex-wrap items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {asg.employeeId} · {asg.shift?.name || asg.shiftId}
                      </p>
                      <p className="text-xs text-slate-500">
                        {asg.startDate?.slice(0, 10)} - {asg.endDate ? asg.endDate.slice(0, 10) : "Sin fin"}
                      </p>
                    </div>
                    <button
                      onClick={() => endAssignmentMutation.mutate(asg.id)}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60"
                      disabled={endAssignmentMutation.isPending}
                    >
                      Cerrar
                    </button>
                  </div>
                ))}
                {!assignmentsQuery.isLoading && (assignmentsQuery.data || []).length === 0 && (
                  <p className="text-sm text-slate-500">Sin asignaciones</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="grid grid-cols-1 gap-4">
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="font-['Montserrat'] text-lg text-slate-800">Asistencia y seguridad</CardTitle>
              <p className="text-sm text-slate-500">Controla correos de marcaje, zona horaria y escaneo de fotos.</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs text-slate-600">Zona horaria por defecto</label>
                  <input
                    value={aiForm.defaultTimezone}
                    onChange={(e) => setAiForm((f) => ({ ...f, defaultTimezone: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    placeholder="America/Guatemala"
                  />
                </div>
                <label className="text-xs text-slate-600">
                  Hora base (entrada)
                  <input
                    type="time"
                    value={aiForm.attendanceStartTime}
                    onChange={(e) => setAiForm((f) => ({ ...f, attendanceStartTime: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </label>
                <label className="text-xs text-slate-600">
                  Tolerancia tardanza (min)
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={aiForm.attendanceLateToleranceMinutes}
                    onChange={(e) => setAiForm((f) => ({ ...f, attendanceLateToleranceMinutes: Number(e.target.value) || 0 }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={aiForm.attendanceEmailEnabled}
                  onChange={(e) => setAiForm((f) => ({ ...f, attendanceEmailEnabled: e.target.checked }))}
                />
                Enviar correo al marcar entrada/salida
              </label>
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={aiForm.photoSafetyEnabled}
                  onChange={(e) => setAiForm((f) => ({ ...f, photoSafetyEnabled: e.target.checked }))}
                />
                Seguridad de fotos / liveness
              </label>
              <div>
                <label className="text-xs text-slate-600">Correos de administradores (coma separada)</label>
                <textarea
                  rows={2}
                  value={aiForm.attendanceAdminRecipients}
                  onChange={(e) => setAiForm((f) => ({ ...f, attendanceAdminRecipients: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  placeholder="admin@sucursal.gt, rrhh@starmedical.com"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => saveAiMutation.mutate()}
                  className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-60"
                  disabled={saveAiMutation.isPending}
                >
                  {saveAiMutation.isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Modal
        open={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        title={editingBranchId ? "Editar sucursal" : "Nueva sucursal"}
        className="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowBranchModal(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                const parsed = branchSchema.safeParse(branchForm);
                if (!parsed.success) {
                  showToast("Completa los campos obligatorios", "error");
                  return;
                }
                const payload = { ...parsed.data, isActive: parsed.data.isActive ?? true };
                if (editingBranchId) {
                  updateBranchMutation.mutate({ id: editingBranchId, data: payload });
                } else {
                  createBranchMutation.mutate(payload);
                }
              }}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition disabled:opacity-60"
              disabled={createBranchMutation.isPending || updateBranchMutation.isPending}
            >
              {editingBranchId ? "Guardar" : "Crear"}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div>
            <label className="text-slate-600">Nombre</label>
            <input
              value={branchForm.name}
              onChange={(e) => setBranchForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
          <div>
            <label className="text-slate-600">Código</label>
            <input
              value={branchForm.code}
              onChange={(e) => setBranchForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
          <div>
            <label className="text-slate-600">Dirección</label>
            <textarea
              value={branchForm.address}
              onChange={(e) => setBranchForm((f) => ({ ...f, address: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={branchForm.isActive}
              onChange={(e) => setBranchForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
            Sucursal activa
          </label>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
