"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClientPhoneCategory, ClientProfileType, InsurerBillingCutoffMode, InsurerBillingType } from "@prisma/client";
import { PlusCircle, Shield } from "lucide-react";
import {
  actionCreateInsurerClient,
  actionListClientAcquisitionDetailOptions,
  actionListClientAcquisitionSources
} from "@/app/admin/clientes/actions";
import ClientContactsEditor, { type ClientContactsDraft } from "@/components/clients/ClientContactsEditor";
import { ClientProfileLookup, type ClientProfileLookupItem } from "@/components/clients/ClientProfileLookup";
import GeoCascadeFieldset, { type GeoCascadeErrors, type GeoCascadeValue } from "@/components/clients/GeoCascadeFieldset";
import { useClientsCountryContext } from "@/components/clients/useClientsCountryContext";
import {
  applyDefaultsToDraft,
  type OperatingCountryDefaultsSnapshot
} from "@/lib/clients/operatingCountryDefaults";
import {
  isReferralAcquisitionSource,
  isSocialAcquisitionSource,
  requiresAcquisitionOtherNote
} from "@/lib/clients/acquisition";
import { cn } from "@/lib/utils";

type AcquisitionSource = {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  isActive: boolean;
};

type AcquisitionDetail = {
  id: string;
  sourceId: string;
  code: string;
  name: string;
  isActive: boolean;
};

type FormState = {
  legalName: string;
  tradeName: string;
  nit: string;
  address: string;
  geoCountryId: string;
  geoAdmin1Id: string;
  geoAdmin2Id: string;
  geoAdmin3Id: string;
  geoPostalCode: string;
  geoFreeState: string;
  geoFreeCity: string;
  acquisitionSourceId: string;
  acquisitionDetailOptionId: string;
  acquisitionOtherNote: string;
  insurerCutoffMode: InsurerBillingCutoffMode | "";
  insurerCutoffDay: string;
  insurerBillingType: InsurerBillingType | "";
  insurerManualRulePriority: boolean;
  globalDiscountPct: string;
  serviceDiscountPct: string;
  productDiscountPct: string;
  comboDiscountPct: string;
};

const DEFAULT_CONTACTS: ClientContactsDraft = {
  phones: [
    {
      id: "phone_primary",
      category: ClientPhoneCategory.PRIMARY,
      value: "",
      countryIso2: "",
      isPrimary: true,
      isActive: true
    }
  ],
  emails: []
};

function toPct(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(100, Math.max(0, parsed)) / 100;
}

export default function InsurerCreateForm({
  initialOperatingDefaults
}: {
  initialOperatingDefaults?: OperatingCountryDefaultsSnapshot;
}) {
  const router = useRouter();
  const { country: countryContext } = useClientsCountryContext();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [geoErrors, setGeoErrors] = useState<GeoCascadeErrors>({});

  const [sources, setSources] = useState<AcquisitionSource[]>([]);
  const [detailOptions, setDetailOptions] = useState<AcquisitionDetail[]>([]);
  const [referrer, setReferrer] = useState<ClientProfileLookupItem | null>(null);

  const [form, setForm] = useState<FormState>({
    legalName: "",
    tradeName: "",
    nit: "",
    address: "",
    geoCountryId: "",
    geoAdmin1Id: "",
    geoAdmin2Id: "",
    geoAdmin3Id: "",
    geoPostalCode: "",
    geoFreeState: "",
    geoFreeCity: "",
    acquisitionSourceId: "",
    acquisitionDetailOptionId: "",
    acquisitionOtherNote: "",
    insurerCutoffMode: "",
    insurerCutoffDay: "",
    insurerBillingType: "",
    insurerManualRulePriority: false,
    globalDiscountPct: "",
    serviceDiscountPct: "",
    productDiscountPct: "",
    comboDiscountPct: ""
  });
  const [contacts, setContacts] = useState<ClientContactsDraft>(DEFAULT_CONTACTS);

  const geoValue: GeoCascadeValue = {
    geoCountryId: form.geoCountryId,
    geoAdmin1Id: form.geoAdmin1Id,
    geoAdmin2Id: form.geoAdmin2Id,
    geoAdmin3Id: form.geoAdmin3Id,
    geoPostalCode: form.geoPostalCode,
    geoFreeState: form.geoFreeState,
    geoFreeCity: form.geoFreeCity
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const result = await actionListClientAcquisitionSources();
        if (!mounted) return;
        setSources(result.items as AcquisitionSource[]);
      } catch (err) {
        if (!mounted) return;
        setError((err as Error)?.message || "No se pudieron cargar canales de adquisición.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (initialOperatingDefaults?.isOperatingCountryPinned) return;
    if (!countryContext?.countryId) return;
    setForm((prev) => (prev.geoCountryId ? prev : { ...prev, geoCountryId: countryContext.countryId }));
  }, [countryContext?.countryId, initialOperatingDefaults?.isOperatingCountryPinned]);

  useEffect(() => {
    if (!initialOperatingDefaults?.isOperatingCountryPinned) return;
    const countryId = initialOperatingDefaults.operatingCountryId;
    if (!countryId) return;

    if (initialOperatingDefaults.scopes.geo) {
      setForm((prev) =>
        applyDefaultsToDraft(prev, {
          geoCountryId: countryId
        })
      );
    }

    const defaultIso2 = initialOperatingDefaults.operatingCountryCode?.trim().toUpperCase();
    if (initialOperatingDefaults.scopes.phone && defaultIso2) {
      setContacts((prev) => {
        const primaryIndex = prev.phones.findIndex((row) => row.isPrimary && row.isActive !== false);
        if (primaryIndex < 0) return prev;
        if (prev.phones[primaryIndex].countryIso2.trim()) return prev;
        const nextPhones = [...prev.phones];
        nextPhones[primaryIndex] = { ...nextPhones[primaryIndex], countryIso2: defaultIso2 };
        return { ...prev, phones: nextPhones };
      });
    }
  }, [initialOperatingDefaults]);

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === form.acquisitionSourceId) ?? null,
    [sources, form.acquisitionSourceId]
  );

  const requiresReferral = useMemo(() => isReferralAcquisitionSource(selectedSource), [selectedSource]);
  const requiresSocialDetail = useMemo(() => isSocialAcquisitionSource(selectedSource), [selectedSource]);
  const selectedDetail = useMemo(
    () => detailOptions.find((detail) => detail.id === form.acquisitionDetailOptionId) ?? null,
    [detailOptions, form.acquisitionDetailOptionId]
  );
  const requiresOtherNote = useMemo(
    () =>
      requiresAcquisitionOtherNote({
        sourceCode: selectedSource?.code,
        sourceName: selectedSource?.name,
        detailCode: selectedDetail?.code,
        detailName: selectedDetail?.name
      }),
    [selectedDetail, selectedSource]
  );

  useEffect(() => {
    let mounted = true;

    if (!requiresSocialDetail || !form.acquisitionSourceId) {
      setDetailOptions([]);
      setForm((prev) => ({ ...prev, acquisitionDetailOptionId: "" }));
      return () => {
        mounted = false;
      };
    }

    (async () => {
      try {
        const result = await actionListClientAcquisitionDetailOptions({ sourceId: form.acquisitionSourceId });
        if (!mounted) return;
        setDetailOptions(result.items as AcquisitionDetail[]);
      } catch (err) {
        if (!mounted) return;
        setError((err as Error)?.message || "No se pudo cargar detalle de canal.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [form.acquisitionSourceId, requiresSocialDetail]);

  useEffect(() => {
    if (!requiresReferral) setReferrer(null);
  }, [requiresReferral]);

  useEffect(() => {
    if (!requiresOtherNote && form.acquisitionOtherNote) {
      setForm((prev) => ({ ...prev, acquisitionOtherNote: "" }));
    }
  }, [requiresOtherNote, form.acquisitionOtherNote]);

  const canSubmit = useMemo(() => {
    if (!form.legalName.trim()) return false;
    if (!form.nit.trim()) return false;
    if (!form.geoCountryId.trim()) return false;
    if (!form.geoAdmin1Id.trim() && !form.geoFreeState.trim()) return false;
    if (!form.geoAdmin2Id.trim() && !form.geoFreeCity.trim()) return false;
    if (!contacts.phones.some((row) => row.isActive && row.value.trim().length > 0)) return false;

    if (form.insurerCutoffMode === InsurerBillingCutoffMode.DAY_OF_MONTH) {
      const day = Number(form.insurerCutoffDay);
      if (!Number.isFinite(day) || day < 1 || day > 31) return false;
    }

    if (requiresSocialDetail && !form.acquisitionDetailOptionId) return false;
    if (requiresOtherNote && !form.acquisitionOtherNote.trim()) return false;
    if (requiresOtherNote && form.acquisitionOtherNote.trim().length > 150) return false;
    if (requiresReferral && !referrer?.id) return false;

    return true;
  }, [contacts.phones, form, referrer?.id, requiresOtherNote, requiresReferral, requiresSocialDetail]);

  const submit = () => {
    if (!canSubmit) return;

    const globalDiscountPct = toPct(form.globalDiscountPct);
    const serviceDiscountPct = toPct(form.serviceDiscountPct);
    const productDiscountPct = toPct(form.productDiscountPct);
    const comboDiscountPct = toPct(form.comboDiscountPct);

    const categoryDiscounts: Array<{ categoryKey: string; discountPct: number }> = [];
    if (serviceDiscountPct !== null) categoryDiscounts.push({ categoryKey: "SERVICE", discountPct: serviceDiscountPct });
    if (productDiscountPct !== null) categoryDiscounts.push({ categoryKey: "PRODUCT", discountPct: productDiscountPct });
    if (comboDiscountPct !== null) categoryDiscounts.push({ categoryKey: "COMBO", discountPct: comboDiscountPct });

    const insurerDiscountRules =
      globalDiscountPct !== null || categoryDiscounts.length
        ? {
            mode: "DISCOUNT",
            globalDiscountPct,
            categoryDiscounts,
            conflictPolicy: "LOWEST_DISCOUNT_WINS"
          }
        : undefined;

    startTransition(async () => {
      try {
        setGeoErrors({});
        const phones = contacts.phones
          .map((row) => ({
            category: row.category,
            value: row.value.trim(),
            countryIso2: row.countryIso2 || undefined,
            isPrimary: row.isPrimary,
            isActive: row.isActive
          }))
          .filter((row) => row.value.length > 0);
        const emails = contacts.emails
          .map((row) => ({
            category: row.category,
            value: row.value.trim().toLowerCase(),
            isPrimary: row.isPrimary,
            isActive: row.isActive
          }))
          .filter((row) => row.value.length > 0);
        const primaryPhone = phones.find((row) => row.isPrimary) ?? phones[0];
        const primaryEmail = emails.find((row) => row.isPrimary) ?? emails[0];

        const result = await actionCreateInsurerClient({
          legalName: form.legalName,
          tradeName: form.tradeName || undefined,
          nit: form.nit,
          country: undefined,
          address: form.address || undefined,
          phone: primaryPhone?.value || undefined,
          phoneCountryIso2: primaryPhone?.countryIso2 || undefined,
          email: primaryEmail?.value || undefined,
          phones,
          emails,
          acquisitionSourceId: form.acquisitionSourceId || undefined,
          acquisitionDetailOptionId: requiresSocialDetail ? form.acquisitionDetailOptionId || undefined : undefined,
          acquisitionOtherNote: requiresOtherNote ? form.acquisitionOtherNote : undefined,
          referredByClientId: requiresReferral ? referrer?.id : undefined,
          geoCountryId: form.geoCountryId || undefined,
          geoAdmin1Id: form.geoAdmin1Id || undefined,
          geoAdmin2Id: form.geoAdmin2Id || undefined,
          geoAdmin3Id: form.geoAdmin3Id || undefined,
          geoPostalCode: form.geoPostalCode || undefined,
          geoFreeState: form.geoFreeState || undefined,
          geoFreeCity: form.geoFreeCity || undefined,
          insurerCutoffMode: form.insurerCutoffMode || null,
          insurerCutoffDay:
            form.insurerCutoffMode === InsurerBillingCutoffMode.DAY_OF_MONTH ? Number(form.insurerCutoffDay || 0) : null,
          insurerBillingType: form.insurerBillingType || null,
          insurerDiscountRules,
          insurerManualRulePriority: form.insurerManualRulePriority
        });

        router.push(`/admin/clientes/${result.id}?tab=relaciones`);
      } catch (err) {
        const message = (err as Error)?.message || "No se pudo crear la aseguradora.";
        setError(message);
        if (message.toLowerCase().includes("país")) {
          setGeoErrors((prev) => ({ ...prev, geoCountryId: message }));
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2e75ba]">Crear cliente</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          Aseguradora
        </h2>
        <p className="text-sm text-slate-600">Empresa pagadora con reglas de corte y descuentos, sin contabilidad en esta etapa.</p>
      </div>

      <section className="space-y-5 rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <div className="rounded-xl border border-[#4aadf5]/40 bg-[#4aadf5]/10 px-4 py-3 text-sm text-slate-700">
          <p className="font-semibold text-[#2e75ba]">Aseguradora = pagador externo.</p>
          <p className="mt-1">
            La liquidación/factura real se gestiona en la ficha del cliente. Catálogos globales en{" "}
            <Link href="/admin/clientes/configuracion" className="font-semibold text-[#2e75ba] hover:text-[#4aadf5]">
              Configuración de Clientes
            </Link>
            .
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">A) Identificación fiscal/legal</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="relative md:col-span-2">
              <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={form.legalName}
                onChange={(e) => setForm((prev) => ({ ...prev, legalName: e.target.value }))}
                placeholder="Razón social *"
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
              />
            </div>

            <input
              value={form.tradeName}
              onChange={(e) => setForm((prev) => ({ ...prev, tradeName: e.target.value }))}
              placeholder="Nombre comercial (opcional)"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            />

            <input
              value={form.nit}
              onChange={(e) => setForm((prev) => ({ ...prev, nit: e.target.value }))}
              placeholder="Documento fiscal *"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            />

            <select
              value={form.acquisitionSourceId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  acquisitionSourceId: e.target.value,
                  acquisitionDetailOptionId: "",
                  acquisitionOtherNote: ""
                }))
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            >
              <option value="">Canal de adquisición (opcional)</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>

            {requiresSocialDetail && (
              <select
                value={form.acquisitionDetailOptionId}
                onChange={(e) => setForm((prev) => ({ ...prev, acquisitionDetailOptionId: e.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
              >
                <option value="">¿Cuál red social? *</option>
                {detailOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            )}

            {requiresOtherNote && (
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-semibold text-slate-500">
                  {requiresSocialDetail ? "Describe la red social (obligatorio)" : "Describe cómo nos conoció (obligatorio)"}
                </p>
                <textarea
                  value={form.acquisitionOtherNote}
                  onChange={(e) => setForm((prev) => ({ ...prev, acquisitionOtherNote: e.target.value.slice(0, 150) }))}
                  placeholder={
                    requiresSocialDetail
                      ? "Ej: campaña Meta Ads, influencer local, otra red... (máx 150)"
                      : "Describe cómo nos conoció (máx 150)"
                  }
                  className="min-h-[82px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
                />
                <p className="text-right text-xs text-slate-500">{form.acquisitionOtherNote.length}/150</p>
              </div>
            )}

            {requiresReferral && (
              <div className="md:col-span-2">
                <ClientProfileLookup
                  label="Cliente referente *"
                  types={[
                    ClientProfileType.PERSON,
                    ClientProfileType.COMPANY,
                    ClientProfileType.INSTITUTION,
                    ClientProfileType.INSURER
                  ]}
                  value={referrer}
                  onChange={setReferrer}
                  disabled={isPending}
                  placeholder="Buscar referente"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">B) Convenio de facturación (configuración base)</p>

          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={form.insurerCutoffMode}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  insurerCutoffMode: e.target.value as InsurerBillingCutoffMode | "",
                  insurerCutoffDay: e.target.value === InsurerBillingCutoffMode.DAY_OF_MONTH ? prev.insurerCutoffDay : ""
                }))
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              <option value="">Modo corte (opcional)</option>
              <option value={InsurerBillingCutoffMode.DAY_OF_MONTH}>Día fijo del mes</option>
              <option value={InsurerBillingCutoffMode.LAST_DAY_OF_MONTH}>Último día del mes</option>
            </select>

            <input
              type="number"
              min={1}
              max={31}
              disabled={form.insurerCutoffMode !== InsurerBillingCutoffMode.DAY_OF_MONTH}
              value={form.insurerCutoffDay}
              onChange={(e) => setForm((prev) => ({ ...prev, insurerCutoffDay: e.target.value }))}
              placeholder="Día de corte (1-31)"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:bg-slate-100"
            />

            <select
              value={form.insurerBillingType}
              onChange={(e) => setForm((prev) => ({ ...prev, insurerBillingType: e.target.value as InsurerBillingType | "" }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              <option value="">Tipo facturación (opcional)</option>
              <option value={InsurerBillingType.FIXED}>Fija</option>
              <option value={InsurerBillingType.VARIABLE}>Variable</option>
            </select>

            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.insurerManualRulePriority}
                onChange={(e) => setForm((prev) => ({ ...prev, insurerManualRulePriority: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-[#4aa59c]"
              />
              Prioridad manual en conflictos
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">C) Reglas de descuento (preview)</p>
          <p className="text-xs text-slate-500">Si hay conflicto entre reglas, prevalece el menor descuento.</p>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.globalDiscountPct}
              onChange={(e) => setForm((prev) => ({ ...prev, globalDiscountPct: e.target.value }))}
              placeholder="Descuento global %"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            />
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.serviceDiscountPct}
              onChange={(e) => setForm((prev) => ({ ...prev, serviceDiscountPct: e.target.value }))}
              placeholder="Descuento servicios %"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            />
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.productDiscountPct}
              onChange={(e) => setForm((prev) => ({ ...prev, productDiscountPct: e.target.value }))}
              placeholder="Descuento productos %"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            />
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.comboDiscountPct}
              onChange={(e) => setForm((prev) => ({ ...prev, comboDiscountPct: e.target.value }))}
              placeholder="Descuento combo %"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">D) Ubicación principal</p>
          <div className="grid gap-3">
            <input
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Dirección de aseguradora *"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            />

            <GeoCascadeFieldset
              value={geoValue}
              onChange={(next) =>
                setForm((prev) => ({
                  ...prev,
                  geoCountryId: next.geoCountryId,
                  geoAdmin1Id: next.geoAdmin1Id,
                  geoAdmin2Id: next.geoAdmin2Id,
                  geoAdmin3Id: next.geoAdmin3Id,
                  geoPostalCode: next.geoPostalCode,
                  geoFreeState: next.geoFreeState ?? "",
                  geoFreeCity: next.geoFreeCity ?? ""
                }))
              }
              errors={geoErrors}
              disabled={isPending}
              title="Ubicación de operación"
              subtitle="País + divisiones administrativas. Fallback texto libre si el país no tiene catálogo."
              requireCountry
              requireAdmin1
              requireAdmin2
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">E) Contactos</p>
          <ClientContactsEditor
            value={contacts}
            onChange={setContacts}
            preferredGeoCountryId={form.geoCountryId || countryContext?.countryId || null}
            disabled={isPending}
            requirePhone
          />
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || isPending}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#4aa59c] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4aadf5]",
            (!canSubmit || isPending) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
          )}
        >
          <PlusCircle size={16} />
          Crear aseguradora
        </button>

        {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      </section>
    </div>
  );
}
