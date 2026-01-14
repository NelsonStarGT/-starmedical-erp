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
  const [activeTab, setActiveTab] = useState<"branches" | "currency" | "identity">("branches");
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

  const branchesQuery = useQuery({
    queryKey: ["hr-branches-settings"],
    queryFn: fetchBranches,
    staleTime: 30_000,
    retry: 1
  });
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
    if (settingsQuery.data?.logoUrl) {
      setLogoUrl(settingsQuery.data.logoUrl);
    }
  }, [settingsQuery.data]);

  const activeBranches = useMemo(() => (branchesQuery.data || []).filter((b) => b.isActive), [branchesQuery.data]);

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
    mutationFn: async (url: string) => {
      const res = await fetch("/api/hr/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: url })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "No se pudo actualizar el logo");
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hr-settings"] });
      showToast("Logo actualizado", "success");
    },
    onError: (err: any) => showToast(err?.message || "Error al actualizar", "error")
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
                  <span className="text-xs text-slate-500">Sin logo</span>
                )}
              </div>
              <div className="flex-1 min-w-[220px] space-y-2">
                <UploadField
                  value={logoUrl}
                  onChange={(url) => {
                    setLogoUrl(url);
                    updateLogoMutation.mutate(url);
                  }}
                  accept="image/*"
                  helperText="PNG/JPG recomendado, fondo transparente."
                  onUploadSuccess={() => showToast("Logo cargado", "success")}
                  onUploadError={(message) => showToast(message, "error")}
                />
                <p className="text-xs text-slate-500">Se guardará al cargar. Dimensiones sugeridas: 256x256 o proporción horizontal.</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
