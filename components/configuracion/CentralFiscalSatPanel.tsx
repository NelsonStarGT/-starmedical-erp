"use client";

import { configApiFetch } from "@/lib/config-central/clientAuth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { useConfigToast } from "@/hooks/useConfigToast";
import { cn } from "@/lib/utils";

type PanelTab = "legal_entities" | "trade_units" | "billing_profiles";

type BranchRow = {
  id: string;
  name: string;
  code?: string | null;
  isActive: boolean;
};

type LegalEntityRow = {
  id: string;
  legalName: string;
  tradeName?: string | null;
  nit?: string | null;
  address?: string | null;
  isActive: boolean;
};

type SatEstablishmentOption = {
  id: string;
  satEstablishmentCode: string;
  legalName: string;
  isActive: boolean;
};

type TradeUnitRow = {
  id: string;
  name: string;
  registrationNumber?: string | null;
  address?: string | null;
  branchId: string;
  legalEntityId: string;
  pdfAssetId?: string | null;
  isActive: boolean;
  branch?: BranchRow;
  legalEntity?: {
    id: string;
    legalName: string;
    tradeName?: string | null;
    nit?: string | null;
    isActive: boolean;
  };
};

type BillingProfileRow = {
  id: string;
  branchId: string;
  legalEntityId: string;
  establishmentId?: string | null;
  priority: number;
  isActive: boolean;
  rulesJson?: Record<string, unknown> | null;
  branch?: BranchRow;
  legalEntity?: {
    id: string;
    legalName: string;
    tradeName?: string | null;
    nit?: string | null;
    isActive: boolean;
  };
  establishment?: {
    id: string;
    satEstablishmentCode: string;
    legalName: string;
    tradeName?: string | null;
    isActive: boolean;
  } | null;
};

type ApiEnvelope<T> = {
  ok?: boolean;
  code?: string;
  error?: string;
  issues?: Array<{ path: string; message: string }>;
  data?: T;
};

type LegalEntityForm = {
  id?: string;
  legalName: string;
  tradeName: string;
  nit: string;
  address: string;
  isActive: boolean;
};

type TradeUnitForm = {
  id?: string;
  name: string;
  registrationNumber: string;
  address: string;
  branchId: string;
  legalEntityId: string;
  pdfAssetId: string;
  isActive: boolean;
};

type BillingProfileForm = {
  id?: string;
  branchId: string;
  legalEntityId: string;
  establishmentId: string;
  priority: number;
  isActive: boolean;
  rulesJsonText: string;
};

type PendingModuleState = {
  legalEntities: boolean;
  tradeUnits: boolean;
  billingProfiles: boolean;
};

function buildErrorMessage<T>(payload: ApiEnvelope<T> | null, fallback: string) {
  if (!payload) return fallback;
  const issueText = Array.isArray(payload.issues)
    ? payload.issues
        .map((issue) => `${issue.path || "field"}: ${issue.message}`)
        .filter(Boolean)
        .join(" · ")
    : "";
  const main = payload.error || fallback;
  return issueText ? `${main} (${issueText})` : main;
}

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const raw = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  return raw;
}

function isDbNotReadyResponse(payload: ApiEnvelope<unknown> | null, status: number) {
  const code = String(payload?.code || "").trim().toUpperCase();
  const error = String(payload?.error || "").trim().toLowerCase();
  return status === 503 || code === "DB_NOT_READY" || error.includes("delegate missing");
}

function pendingMessage(payload: ApiEnvelope<unknown> | null) {
  const raw = String(payload?.error || "").trim();
  return raw || "Aún no disponible en este entorno. Falta migración y prisma generate.";
}

const defaultLegalForm: LegalEntityForm = {
  legalName: "",
  tradeName: "",
  nit: "",
  address: "",
  isActive: true
};

const defaultTradeForm: TradeUnitForm = {
  name: "",
  registrationNumber: "",
  address: "",
  branchId: "",
  legalEntityId: "",
  pdfAssetId: "",
  isActive: true
};

const defaultBillingProfileForm: BillingProfileForm = {
  branchId: "",
  legalEntityId: "",
  establishmentId: "",
  priority: 10,
  isActive: true,
  rulesJsonText: ""
};

const DEFAULT_PENDING_MESSAGE = "Aún no disponible en este entorno. Falta migración y prisma generate.";

export default function CentralFiscalSatPanel() {
  const { toasts, showToast, dismiss } = useConfigToast();
  const [tab, setTab] = useState<PanelTab>("legal_entities");
  const [loading, setLoading] = useState(false);
  const [pendingModules, setPendingModules] = useState<PendingModuleState>({
    legalEntities: false,
    tradeUnits: false,
    billingProfiles: false
  });
  const [pendingModuleMessages, setPendingModuleMessages] = useState<Record<keyof PendingModuleState, string>>({
    legalEntities: DEFAULT_PENDING_MESSAGE,
    tradeUnits: DEFAULT_PENDING_MESSAGE,
    billingProfiles: DEFAULT_PENDING_MESSAGE
  });

  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntityRow[]>([]);
  const [tradeUnits, setTradeUnits] = useState<TradeUnitRow[]>([]);
  const [billingProfiles, setBillingProfiles] = useState<BillingProfileRow[]>([]);
  const [satOptions, setSatOptions] = useState<SatEstablishmentOption[]>([]);

  const [legalForm, setLegalForm] = useState<LegalEntityForm>(defaultLegalForm);
  const [tradeForm, setTradeForm] = useState<TradeUnitForm>(defaultTradeForm);
  const [billingForm, setBillingForm] = useState<BillingProfileForm>(defaultBillingProfileForm);

  const activeBranches = useMemo(() => branches.filter((row) => row.isActive), [branches]);
  const activeLegalEntities = useMemo(
    () => legalEntities.filter((row) => row.isActive),
    [legalEntities]
  );

  const fetchSatOptions = useCallback(
    async (branchId: string) => {
      if (pendingModules.billingProfiles) {
        setSatOptions([]);
        return;
      }

      const normalizedBranchId = branchId.trim();
      if (!normalizedBranchId) {
        setSatOptions([]);
        return;
      }

      const response = await configApiFetch(`/api/admin/config/branches/${normalizedBranchId}/establishments`, {
        cache: "no-store"
      });
      const payload = await parseEnvelope<{ items: SatEstablishmentOption[] }>(response);
      if (!response.ok || payload.ok === false) {
        throw new Error(buildErrorMessage(payload, "No se pudo cargar establecimientos SAT."));
      }

      setSatOptions((payload.data?.items || []).filter((row) => row.isActive));
    },
    [pendingModules.billingProfiles]
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [branchesRes, legalRes, tradeRes, profilesRes] = await Promise.all([
        configApiFetch("/api/admin/config/branches?includeInactive=1", { cache: "no-store" }),
        configApiFetch("/api/admin/config/legal-entities?includeInactive=1", { cache: "no-store" }),
        configApiFetch("/api/admin/config/trade-units?includeInactive=1", { cache: "no-store" }),
        configApiFetch("/api/admin/config/billing-profiles?includeInactive=1", { cache: "no-store" })
      ]);

      const [branchesJson, legalJson, tradeJson, profilesJson] = await Promise.all([
        parseEnvelope<BranchRow[]>(branchesRes),
        parseEnvelope<LegalEntityRow[]>(legalRes),
        parseEnvelope<TradeUnitRow[]>(tradeRes),
        parseEnvelope<BillingProfileRow[]>(profilesRes)
      ]);

      if (!branchesRes.ok || branchesJson.ok === false) {
        throw new Error(buildErrorMessage(branchesJson, "No se pudieron cargar sucursales."));
      }

      const loadedBranches = branchesJson.data || [];
      setBranches(loadedBranches);

      const nextPending: PendingModuleState = {
        legalEntities: false,
        tradeUnits: false,
        billingProfiles: false
      };
      const nextPendingMessages = {
        legalEntities: DEFAULT_PENDING_MESSAGE,
        tradeUnits: DEFAULT_PENDING_MESSAGE,
        billingProfiles: DEFAULT_PENDING_MESSAGE
      };

      if (!legalRes.ok || legalJson.ok === false) {
        if (isDbNotReadyResponse(legalJson, legalRes.status)) {
          nextPending.legalEntities = true;
          nextPendingMessages.legalEntities = pendingMessage(legalJson);
          setLegalEntities([]);
        } else {
          throw new Error(buildErrorMessage(legalJson, "No se pudieron cargar entidades legales."));
        }
      } else {
        setLegalEntities(legalJson.data || []);
      }

      if (!tradeRes.ok || tradeJson.ok === false) {
        if (isDbNotReadyResponse(tradeJson, tradeRes.status)) {
          nextPending.tradeUnits = true;
          nextPendingMessages.tradeUnits = pendingMessage(tradeJson);
          setTradeUnits([]);
        } else {
          throw new Error(buildErrorMessage(tradeJson, "No se pudieron cargar unidades comerciales."));
        }
      } else {
        setTradeUnits(tradeJson.data || []);
      }

      if (!profilesRes.ok || profilesJson.ok === false) {
        if (isDbNotReadyResponse(profilesJson, profilesRes.status)) {
          nextPending.billingProfiles = true;
          nextPendingMessages.billingProfiles = pendingMessage(profilesJson);
          setBillingProfiles([]);
        } else {
          throw new Error(buildErrorMessage(profilesJson, "No se pudieron cargar perfiles fiscales."));
        }
      } else {
        setBillingProfiles(profilesJson.data || []);
      }

      setPendingModules(nextPending);
      setPendingModuleMessages(nextPendingMessages);

      const fallbackBranchId = loadedBranches.find((row) => row.isActive)?.id || loadedBranches[0]?.id || "";
      const loadedLegalEntities = (!nextPending.legalEntities ? legalJson.data : []) || [];
      const fallbackLegalId =
        loadedLegalEntities.find((row) => row.isActive)?.id || loadedLegalEntities[0]?.id || "";
      setTradeForm((prev) => ({ ...prev, branchId: prev.branchId || fallbackBranchId }));
      setTradeForm((prev) => ({ ...prev, legalEntityId: prev.legalEntityId || fallbackLegalId }));
      setBillingForm((prev) => ({ ...prev, branchId: prev.branchId || fallbackBranchId }));
      setBillingForm((prev) => ({ ...prev, legalEntityId: prev.legalEntityId || fallbackLegalId }));
    } catch (error) {
      showToast({
        tone: "error",
        title: "Error cargando facturación SAT",
        message: (error as Error).message
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (pendingModules.billingProfiles) {
      setSatOptions([]);
      return;
    }

    const branchId = billingForm.branchId.trim();
    if (!branchId) {
      setSatOptions([]);
      return;
    }
    void fetchSatOptions(branchId).catch((error) => {
      showToast({
        tone: "error",
        title: "Error cargando establecimientos",
        message: (error as Error).message
      });
      setSatOptions([]);
    });
  }, [billingForm.branchId, fetchSatOptions, pendingModules.billingProfiles, showToast]);

  async function saveLegalEntity() {
    const isEdit = Boolean(legalForm.id);
    const endpoint = isEdit
      ? `/api/admin/config/legal-entities/${legalForm.id}`
      : "/api/admin/config/legal-entities";
    const method = isEdit ? "PUT" : "POST";

    const response = await configApiFetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        legalName: legalForm.legalName,
        tradeName: legalForm.tradeName || null,
        nit: legalForm.nit || null,
        address: legalForm.address || null,
        isActive: legalForm.isActive
      })
    });
    const payload = await parseEnvelope<LegalEntityRow>(response);
    if (!response.ok || payload.ok === false) {
      throw new Error(buildErrorMessage(payload, "No se pudo guardar la entidad legal."));
    }

    showToast({
      tone: "success",
      title: isEdit ? "Entidad legal actualizada" : "Entidad legal creada"
    });
    setLegalForm(defaultLegalForm);
    await loadAll();
  }

  async function toggleLegalEntity(row: LegalEntityRow) {
    const response = await configApiFetch(`/api/admin/config/legal-entities/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !row.isActive })
    });
    const payload = await parseEnvelope<LegalEntityRow>(response);
    if (!response.ok || payload.ok === false) {
      throw new Error(buildErrorMessage(payload, "No se pudo actualizar estado de entidad legal."));
    }

    showToast({
      tone: "success",
      title: row.isActive ? "Entidad legal desactivada" : "Entidad legal activada"
    });
    await loadAll();
  }

  async function saveTradeUnit() {
    const isEdit = Boolean(tradeForm.id);
    const endpoint = isEdit ? `/api/admin/config/trade-units/${tradeForm.id}` : "/api/admin/config/trade-units";
    const method = isEdit ? "PUT" : "POST";

    const response = await configApiFetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: tradeForm.name,
        registrationNumber: tradeForm.registrationNumber || null,
        address: tradeForm.address || null,
        branchId: tradeForm.branchId,
        legalEntityId: tradeForm.legalEntityId,
        pdfAssetId: tradeForm.pdfAssetId || null,
        isActive: tradeForm.isActive
      })
    });
    const payload = await parseEnvelope<TradeUnitRow>(response);
    if (!response.ok || payload.ok === false) {
      throw new Error(buildErrorMessage(payload, "No se pudo guardar la unidad comercial."));
    }

    showToast({ tone: "success", title: isEdit ? "Unidad comercial actualizada" : "Unidad comercial creada" });
    setTradeForm((prev) => ({
      ...defaultTradeForm,
      branchId: prev.branchId || activeBranches[0]?.id || "",
      legalEntityId: prev.legalEntityId || activeLegalEntities[0]?.id || ""
    }));
    await loadAll();
  }

  async function toggleTradeUnit(row: TradeUnitRow) {
    const response = await configApiFetch(`/api/admin/config/trade-units/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !row.isActive })
    });
    const payload = await parseEnvelope<TradeUnitRow>(response);
    if (!response.ok || payload.ok === false) {
      throw new Error(buildErrorMessage(payload, "No se pudo actualizar estado de unidad comercial."));
    }

    showToast({ tone: "success", title: row.isActive ? "Unidad comercial desactivada" : "Unidad comercial activada" });
    await loadAll();
  }

  async function saveBillingProfile() {
    const isEdit = Boolean(billingForm.id);
    const endpoint = isEdit
      ? `/api/admin/config/billing-profiles/${billingForm.id}`
      : "/api/admin/config/billing-profiles";
    const method = isEdit ? "PUT" : "POST";

    let rulesJson: Record<string, unknown> | null = null;
    if (billingForm.rulesJsonText.trim().length > 0) {
      try {
        const parsed = JSON.parse(billingForm.rulesJsonText) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("rulesJson debe ser un objeto JSON.");
        }
        rulesJson = parsed as Record<string, unknown>;
      } catch (error) {
        throw new Error((error as Error).message || "rulesJson inválido.");
      }
    }

    const response = await configApiFetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId: billingForm.branchId,
        legalEntityId: billingForm.legalEntityId,
        establishmentId: billingForm.establishmentId || null,
        priority: Number.isFinite(billingForm.priority) ? billingForm.priority : 10,
        isActive: billingForm.isActive,
        rulesJson
      })
    });
    const payload = await parseEnvelope<BillingProfileRow>(response);
    if (!response.ok || payload.ok === false) {
      throw new Error(buildErrorMessage(payload, "No se pudo guardar el perfil fiscal."));
    }

    showToast({ tone: "success", title: isEdit ? "Perfil fiscal actualizado" : "Perfil fiscal creado" });
    setBillingForm((prev) => ({
      ...defaultBillingProfileForm,
      branchId: prev.branchId || activeBranches[0]?.id || "",
      legalEntityId: prev.legalEntityId || activeLegalEntities[0]?.id || ""
    }));
    await loadAll();
  }

  async function toggleBillingProfile(row: BillingProfileRow) {
    const response = await configApiFetch(`/api/admin/config/billing-profiles/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !row.isActive })
    });
    const payload = await parseEnvelope<BillingProfileRow>(response);
    if (!response.ok || payload.ok === false) {
      throw new Error(buildErrorMessage(payload, "No se pudo cambiar estado del perfil fiscal."));
    }

    showToast({ tone: "success", title: row.isActive ? "Perfil fiscal desactivado" : "Perfil fiscal activado" });
    await loadAll();
  }

  async function handleAction(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      showToast({ tone: "error", title: "Operación fallida", message: (error as Error).message });
    }
  }

  function renderPendingCard(message: string) {
    return (
      <div className="rounded-xl border border-[#4aadf5]/35 bg-[#eff8ff] p-4">
        <p className="text-sm font-semibold text-[#2e75ba]">Pendiente (beta)</p>
        <p className="mt-1 text-sm text-slate-700">{message}</p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />

      <Card>
        <CardHeader>
          <CardTitle className="text-[#2e75ba]">Facturación SAT / FEL</CardTitle>
          <p className="text-sm text-slate-600">
            Administra entidades legales, patentes (unidades comerciales) y perfiles fiscales por sucursal.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "legal_entities" as const, label: "Entidades legales" },
              { key: "trade_units" as const, label: "Unidades comerciales" },
              { key: "billing_profiles" as const, label: "Perfiles fiscales por sucursal" }
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                  tab === item.key
                    ? "border-[#2e75ba] bg-[#2e75ba] text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5]"
                )}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void loadAll()}
              className="ml-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5]"
            >
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>

          {tab === "legal_entities" && (
            pendingModules.legalEntities ? (
              renderPendingCard(pendingModuleMessages.legalEntities)
            ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base text-[#2e75ba]">Entidades legales</CardTitle>
                </CardHeader>
                <CardContent className="overflow-auto p-0">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Razón social</th>
                        <th className="px-3 py-2 text-left">NIT</th>
                        <th className="px-3 py-2 text-left">Estado</th>
                        <th className="px-3 py-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {legalEntities.map((row) => (
                        <tr key={row.id} className="odd:bg-white even:bg-slate-50/50">
                          <td className="px-3 py-2">
                            <p className="font-semibold text-slate-900">{row.legalName}</p>
                            <p className="text-xs text-slate-500">{row.tradeName || "—"}</p>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{row.nit || "—"}</td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                                row.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-200 text-slate-600"
                              )}
                            >
                              {row.isActive ? "Activa" : "Inactiva"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="text-xs font-semibold text-[#2e75ba] hover:underline"
                                onClick={() =>
                                  setLegalForm({
                                    id: row.id,
                                    legalName: row.legalName,
                                    tradeName: row.tradeName || "",
                                    nit: row.nit || "",
                                    address: row.address || "",
                                    isActive: row.isActive
                                  })
                                }
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="text-xs font-semibold text-[#4aa59c] hover:underline"
                                onClick={() => void handleAction(() => toggleLegalEntity(row))}
                              >
                                {row.isActive ? "Desactivar" : "Activar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!loading && legalEntities.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">
                            Aún no hay entidades legales registradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-[#2e75ba]">
                    {legalForm.id ? "Editar entidad" : "Nueva entidad"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-600">Razón social</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={legalForm.legalName}
                      onChange={(event) => setLegalForm((prev) => ({ ...prev, legalName: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Nombre comercial</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={legalForm.tradeName}
                      onChange={(event) => setLegalForm((prev) => ({ ...prev, tradeName: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">NIT</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={legalForm.nit}
                      onChange={(event) => setLegalForm((prev) => ({ ...prev, nit: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Dirección fiscal</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={legalForm.address}
                      onChange={(event) => setLegalForm((prev) => ({ ...prev, address: event.target.value }))}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={legalForm.isActive}
                      onChange={(event) => setLegalForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                    />
                    Activa
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleAction(saveLegalEntity)}
                      className="rounded-xl bg-[#4aa59c] px-3 py-2 text-sm font-semibold text-white shadow-sm"
                    >
                      {legalForm.id ? "Guardar entidad" : "Crear entidad"}
                    </button>
                    {legalForm.id ? (
                      <button
                        type="button"
                        onClick={() => setLegalForm(defaultLegalForm)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
            )
          )}

          {tab === "trade_units" && (
            pendingModules.tradeUnits ? (
              renderPendingCard(pendingModuleMessages.tradeUnits)
            ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base text-[#2e75ba]">Unidades comerciales (patentes)</CardTitle>
                </CardHeader>
                <CardContent className="overflow-auto p-0">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Unidad</th>
                        <th className="px-3 py-2 text-left">Sucursal</th>
                        <th className="px-3 py-2 text-left">Entidad legal</th>
                        <th className="px-3 py-2 text-left">Estado</th>
                        <th className="px-3 py-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tradeUnits.map((row) => (
                        <tr key={row.id} className="odd:bg-white even:bg-slate-50/50">
                          <td className="px-3 py-2">
                            <p className="font-semibold text-slate-900">{row.name}</p>
                            <p className="text-xs text-slate-500">{row.registrationNumber || "Sin registro mercantil"}</p>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{row.branch?.name || row.branchId}</td>
                          <td className="px-3 py-2 text-slate-700">{row.legalEntity?.legalName || row.legalEntityId}</td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                                row.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-200 text-slate-600"
                              )}
                            >
                              {row.isActive ? "Activa" : "Inactiva"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="text-xs font-semibold text-[#2e75ba] hover:underline"
                                onClick={() =>
                                  setTradeForm({
                                    id: row.id,
                                    name: row.name,
                                    registrationNumber: row.registrationNumber || "",
                                    address: row.address || "",
                                    branchId: row.branchId,
                                    legalEntityId: row.legalEntityId,
                                    pdfAssetId: row.pdfAssetId || "",
                                    isActive: row.isActive
                                  })
                                }
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="text-xs font-semibold text-[#4aa59c] hover:underline"
                                onClick={() => void handleAction(() => toggleTradeUnit(row))}
                              >
                                {row.isActive ? "Desactivar" : "Activar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!loading && tradeUnits.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                            Aún no hay unidades comerciales registradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-[#2e75ba]">
                    {tradeForm.id ? "Editar unidad" : "Nueva unidad"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-600">Nombre</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={tradeForm.name}
                      onChange={(event) => setTradeForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Registro mercantil (opcional)</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={tradeForm.registrationNumber}
                      onChange={(event) =>
                        setTradeForm((prev) => ({ ...prev, registrationNumber: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Sucursal operativa</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={tradeForm.branchId}
                      onChange={(event) => setTradeForm((prev) => ({ ...prev, branchId: event.target.value }))}
                    >
                      <option value="">Selecciona sucursal</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} {branch.isActive ? "" : "(Inactiva)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Entidad legal</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={tradeForm.legalEntityId}
                      onChange={(event) =>
                        setTradeForm((prev) => ({ ...prev, legalEntityId: event.target.value }))
                      }
                    >
                      <option value="">Selecciona entidad legal</option>
                      {legalEntities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.legalName} {entity.isActive ? "" : "(Inactiva)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">PDF / respaldo (assetId opcional)</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={tradeForm.pdfAssetId}
                      onChange={(event) => setTradeForm((prev) => ({ ...prev, pdfAssetId: event.target.value }))}
                      placeholder="cuid de FileAsset o vacío"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={tradeForm.isActive}
                      onChange={(event) => setTradeForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                    />
                    Activa
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleAction(saveTradeUnit)}
                      className="rounded-xl bg-[#4aa59c] px-3 py-2 text-sm font-semibold text-white shadow-sm"
                    >
                      {tradeForm.id ? "Guardar unidad" : "Crear unidad"}
                    </button>
                    {tradeForm.id ? (
                      <button
                        type="button"
                        onClick={() =>
                          setTradeForm({
                            ...defaultTradeForm,
                            branchId: activeBranches[0]?.id || "",
                            legalEntityId: activeLegalEntities[0]?.id || ""
                          })
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
            )
          )}

          {tab === "billing_profiles" && (
            pendingModules.billingProfiles ? (
              renderPendingCard(pendingModuleMessages.billingProfiles)
            ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base text-[#2e75ba]">Perfiles fiscales por sucursal</CardTitle>
                </CardHeader>
                <CardContent className="overflow-auto p-0">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Sucursal</th>
                        <th className="px-3 py-2 text-left">Entidad legal</th>
                        <th className="px-3 py-2 text-left">Establecimiento SAT</th>
                        <th className="px-3 py-2 text-left">Prioridad</th>
                        <th className="px-3 py-2 text-left">Estado</th>
                        <th className="px-3 py-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {billingProfiles.map((row) => (
                        <tr key={row.id} className="odd:bg-white even:bg-slate-50/50">
                          <td className="px-3 py-2 text-slate-700">{row.branch?.name || row.branchId}</td>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-slate-900">{row.legalEntity?.legalName || row.legalEntityId}</p>
                            <p className="text-xs text-slate-500">{row.legalEntity?.nit || "—"}</p>
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {row.establishment
                              ? `${row.establishment.satEstablishmentCode} · ${row.establishment.legalName}`
                              : "Sin establecimiento específico"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{row.priority}</td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                                row.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-200 text-slate-600"
                              )}
                            >
                              {row.isActive ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="text-xs font-semibold text-[#2e75ba] hover:underline"
                                onClick={() =>
                                  setBillingForm({
                                    id: row.id,
                                    branchId: row.branchId,
                                    legalEntityId: row.legalEntityId,
                                    establishmentId: row.establishmentId || "",
                                    priority: row.priority,
                                    isActive: row.isActive,
                                    rulesJsonText: row.rulesJson ? JSON.stringify(row.rulesJson, null, 2) : ""
                                  })
                                }
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="text-xs font-semibold text-[#4aa59c] hover:underline"
                                onClick={() => void handleAction(() => toggleBillingProfile(row))}
                              >
                                {row.isActive ? "Desactivar" : "Activar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!loading && billingProfiles.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
                            Aún no hay perfiles fiscales configurados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-[#2e75ba]">
                    {billingForm.id ? "Editar perfil" : "Nuevo perfil"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-600">Sucursal</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={billingForm.branchId}
                      onChange={(event) =>
                        setBillingForm((prev) => ({
                          ...prev,
                          branchId: event.target.value,
                          establishmentId: ""
                        }))
                      }
                    >
                      <option value="">Selecciona sucursal</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} {branch.isActive ? "" : "(Inactiva)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Entidad legal</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={billingForm.legalEntityId}
                      onChange={(event) =>
                        setBillingForm((prev) => ({ ...prev, legalEntityId: event.target.value }))
                      }
                    >
                      <option value="">Selecciona entidad legal</option>
                      {legalEntities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.legalName} {entity.isActive ? "" : "(Inactiva)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Establecimiento SAT (opcional)</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={billingForm.establishmentId}
                      onChange={(event) =>
                        setBillingForm((prev) => ({ ...prev, establishmentId: event.target.value }))
                      }
                    >
                      <option value="">Sin establecimiento específico</option>
                      {satOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.satEstablishmentCode} · {item.legalName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Prioridad (1 = mayor prioridad)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={billingForm.priority}
                      onChange={(event) =>
                        setBillingForm((prev) => ({ ...prev, priority: Number(event.target.value) || 10 }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Reglas (JSON opcional)</label>
                    <textarea
                      className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono"
                      value={billingForm.rulesJsonText}
                      onChange={(event) =>
                        setBillingForm((prev) => ({ ...prev, rulesJsonText: event.target.value }))
                      }
                      placeholder='{"payer":"EMPRESA"}'
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={billingForm.isActive}
                      onChange={(event) =>
                        setBillingForm((prev) => ({ ...prev, isActive: event.target.checked }))
                      }
                    />
                    Activo
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleAction(saveBillingProfile)}
                      className="rounded-xl bg-[#4aa59c] px-3 py-2 text-sm font-semibold text-white shadow-sm"
                    >
                      {billingForm.id ? "Guardar perfil" : "Crear perfil"}
                    </button>
                    {billingForm.id ? (
                      <button
                        type="button"
                        onClick={() =>
                          setBillingForm({
                            ...defaultBillingProfileForm,
                            branchId: activeBranches[0]?.id || "",
                            legalEntityId: activeLegalEntities[0]?.id || ""
                          })
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
            )
          )}
        </CardContent>
      </Card>
    </section>
  );
}
