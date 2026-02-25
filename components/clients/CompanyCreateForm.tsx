"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClientCatalogType, ClientPhoneCategory, ClientProfileType } from "@prisma/client";
import { Building2, PlusCircle } from "lucide-react";
import {
  actionCreateCompanyClient,
  actionListClientAcquisitionDetailOptions,
  actionListClientAcquisitionSources,
  actionListClientCatalogItems
} from "@/app/admin/clientes/actions";
import ClientContactsEditor, { type ClientContactsDraft } from "@/components/clients/ClientContactsEditor";
import { ClientProfileLookup, type ClientProfileLookupItem } from "@/components/clients/ClientProfileLookup";
import GeoCascadeFieldset, { type GeoCascadeErrors, type GeoCascadeValue } from "@/components/clients/GeoCascadeFieldset";
import { useClientsCountryContext } from "@/components/clients/useClientsCountryContext";
import {
  isReferralAcquisitionSource,
  isSocialAcquisitionSource,
  requiresAcquisitionOtherNote
} from "@/lib/clients/acquisition";
import { cn } from "@/lib/utils";

type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

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
  companyCategoryId: string;
  acquisitionSourceId: string;
  acquisitionDetailOptionId: string;
  acquisitionOtherNote: string;
  address: string;
  geoCountryId: string;
  geoAdmin1Id: string;
  geoAdmin2Id: string;
  geoAdmin3Id: string;
  geoPostalCode: string;
  geoFreeState: string;
  geoFreeCity: string;
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

export default function CompanyCreateForm() {
  const router = useRouter();
  const { country: countryContext } = useClientsCountryContext();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [geoErrors, setGeoErrors] = useState<GeoCascadeErrors>({});

  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [sources, setSources] = useState<AcquisitionSource[]>([]);
  const [detailOptions, setDetailOptions] = useState<AcquisitionDetail[]>([]);
  const [referrer, setReferrer] = useState<ClientProfileLookupItem | null>(null);

  const [form, setForm] = useState<FormState>({
    legalName: "",
    tradeName: "",
    nit: "",
    companyCategoryId: "",
    acquisitionSourceId: "",
    acquisitionDetailOptionId: "",
    acquisitionOtherNote: "",
    address: "",
    geoCountryId: "",
    geoAdmin1Id: "",
    geoAdmin2Id: "",
    geoAdmin3Id: "",
    geoPostalCode: "",
    geoFreeState: "",
    geoFreeCity: ""
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
        const [categoriesRes, sourcesRes] = await Promise.all([
          actionListClientCatalogItems({ type: ClientCatalogType.COMPANY_CATEGORY }),
          actionListClientAcquisitionSources()
        ]);
        if (!mounted) return;

        setCategories(categoriesRes.items as CatalogItem[]);
        setSources(sourcesRes.items as AcquisitionSource[]);
        setForm((prev) => ({
          ...prev,
          companyCategoryId: prev.companyCategoryId || categoriesRes.items[0]?.id || ""
        }));
      } catch (err) {
        if (!mounted) return;
        setError((err as Error)?.message || "No se pudo cargar catálogos iniciales.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!countryContext?.countryId) return;
    setForm((prev) => (prev.geoCountryId ? prev : { ...prev, geoCountryId: countryContext.countryId }));
  }, [countryContext?.countryId]);

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === form.acquisitionSourceId) ?? null,
    [sources, form.acquisitionSourceId]
  );

  const sourceNeedsReferral = useMemo(() => isReferralAcquisitionSource(selectedSource), [selectedSource]);
  const sourceNeedsSocialDetail = useMemo(() => isSocialAcquisitionSource(selectedSource), [selectedSource]);
  const selectedDetail = useMemo(
    () => detailOptions.find((detail) => detail.id === form.acquisitionDetailOptionId) ?? null,
    [detailOptions, form.acquisitionDetailOptionId]
  );
  const sourceNeedsOtherNote = useMemo(
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

    if (!sourceNeedsSocialDetail || !form.acquisitionSourceId) {
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
        setError((err as Error)?.message || "No se pudo cargar detalles del canal.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [form.acquisitionSourceId, sourceNeedsSocialDetail]);

  useEffect(() => {
    if (!sourceNeedsReferral) {
      setReferrer(null);
    }
  }, [sourceNeedsReferral]);

  useEffect(() => {
    if (!sourceNeedsOtherNote && form.acquisitionOtherNote) {
      setForm((prev) => ({ ...prev, acquisitionOtherNote: "" }));
    }
  }, [sourceNeedsOtherNote, form.acquisitionOtherNote]);

  const canSubmit = useMemo(() => {
    if (!form.legalName.trim()) return false;
    if (!form.tradeName.trim()) return false;
    if (!form.nit.trim()) return false;
    if (!form.companyCategoryId.trim()) return false;
    if (!form.address.trim()) return false;
    if (!form.geoCountryId.trim()) return false;
    if (!form.geoAdmin1Id.trim() && !form.geoFreeState.trim()) return false;
    if (!form.geoAdmin2Id.trim() && !form.geoFreeCity.trim()) return false;
    if (!contacts.phones.some((row) => row.isActive && row.value.trim().length > 0)) return false;

    if (sourceNeedsSocialDetail && !form.acquisitionDetailOptionId) return false;
    if (sourceNeedsOtherNote && form.acquisitionOtherNote.trim().length === 0) return false;
    if (sourceNeedsOtherNote && form.acquisitionOtherNote.trim().length > 150) return false;
    if (sourceNeedsReferral && !referrer?.id) return false;

    return true;
  }, [contacts.phones, form, referrer?.id, sourceNeedsOtherNote, sourceNeedsReferral, sourceNeedsSocialDetail]);

  const submit = () => {
    if (!canSubmit) return;

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

        const result = await actionCreateCompanyClient({
          legalName: form.legalName,
          tradeName: form.tradeName,
          country: undefined,
          nit: form.nit,
          companyCategoryId: form.companyCategoryId,
          acquisitionSourceId: form.acquisitionSourceId || undefined,
          acquisitionDetailOptionId: sourceNeedsSocialDetail ? form.acquisitionDetailOptionId || undefined : undefined,
          acquisitionOtherNote: sourceNeedsOtherNote ? form.acquisitionOtherNote : undefined,
          referredByClientId: sourceNeedsReferral ? referrer?.id : undefined,
          phone: primaryPhone?.value || undefined,
          phoneCountryIso2: primaryPhone?.countryIso2 || undefined,
          email: primaryEmail?.value || undefined,
          phones,
          emails,
          address: form.address,
          geoCountryId: form.geoCountryId || undefined,
          geoAdmin1Id: form.geoAdmin1Id || undefined,
          geoAdmin2Id: form.geoAdmin2Id || undefined,
          geoAdmin3Id: form.geoAdmin3Id || undefined,
          geoPostalCode: form.geoPostalCode || undefined,
          geoFreeState: form.geoFreeState || undefined,
          geoFreeCity: form.geoFreeCity || undefined
        });

        router.push(`/admin/clientes/${result.id}?tab=ubicaciones`);
      } catch (err) {
        const message = (err as Error)?.message || "No se pudo crear la empresa.";
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
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-diagnostics-corporate">Crear cliente</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          Empresa
        </h2>
        <p className="text-sm text-slate-600">Alta empresarial coherente con identidad fiscal, canal y ubicación principal.</p>
      </div>

      <section className="space-y-5 rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">A) Identificación fiscal y ubicación del cliente</p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="relative">
              <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
              placeholder="Nombre comercial *"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            />

            <input
              value={form.nit}
              onChange={(e) => setForm((prev) => ({ ...prev, nit: e.target.value }))}
              placeholder="Documento fiscal (NIT) *"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            />

            <select
              value={form.companyCategoryId}
              onChange={(e) => setForm((prev) => ({ ...prev, companyCategoryId: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            >
              <option value="">Categoría de empresa *</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={form.acquisitionSourceId}
              onChange={(e) => {
                const nextSourceId = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  acquisitionSourceId: nextSourceId,
                  acquisitionDetailOptionId: "",
                  acquisitionOtherNote: ""
                }));
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            >
              <option value="">¿Cómo nos conoció? (opcional)</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>

            {sourceNeedsSocialDetail && (
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

            {sourceNeedsOtherNote && (
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-semibold text-slate-500">
                  {sourceNeedsSocialDetail ? "Describe la red social (obligatorio)" : "Describe cómo nos conoció (obligatorio)"}
                </p>
                <textarea
                  value={form.acquisitionOtherNote}
                  onChange={(e) => {
                    const next = e.target.value.slice(0, 150);
                    setForm((prev) => ({ ...prev, acquisitionOtherNote: next }));
                  }}
                  placeholder={
                    sourceNeedsSocialDetail
                      ? "Ej: campaña Meta Ads, influencer local, otra red... (máx 150)"
                      : "Describe cómo nos conoció (máx 150)"
                  }
                  className="min-h-[82px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
                />
                <p className="text-right text-xs text-slate-500">{form.acquisitionOtherNote.length}/150</p>
              </div>
            )}

            {sourceNeedsReferral && (
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
                  placeholder="Buscar por nombre, documento, teléfono o email"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">B) Ubicación</p>
          <p className="text-xs text-slate-500">Recomendado para facturación y reportería.</p>

          <div className="grid gap-3">
            <input
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Ej: 2a calle 13-04 zona 14, Colonia Tecún Umán, Guatemala *"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
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
              title="Ubicación principal"
              subtitle="País + divisiones administrativas; fallback texto libre si el país no tiene catálogo cargado."
              requireCountry
              requireAdmin1
              requireAdmin2
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">C) Contactos</p>
          <ClientContactsEditor
            value={contacts}
            onChange={setContacts}
            preferredGeoCountryId={form.geoCountryId || countryContext?.countryId || null}
            disabled={isPending}
            requirePhone
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || isPending}
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4aadf5]",
              (!canSubmit || isPending) && "cursor-not-allowed opacity-60"
            )}
          >
            <PlusCircle size={16} />
            Crear empresa
          </button>
        </div>

        {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      </section>
    </div>
  );
}
