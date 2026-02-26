"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClientCatalogType, ClientPhoneCategory, ClientProfileType } from "@prisma/client";
import { Landmark, PlusCircle, Tags } from "lucide-react";
import {
  actionCreateClientCatalogItem,
  actionCreateInstitutionClient,
  actionListClientAcquisitionDetailOptions,
  actionListClientAcquisitionSources,
  actionListClientCatalogItems
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

type Option = { id: string; name: string };

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

type RelationMode = "FACTURA_DIRECTO" | "CONVENIO_SIN_FACTURA" | "PATROCINADOR" | "MIXTO";

type FormState = {
  name: string;
  nit: string;
  institutionCategoryId: string;
  institutionTypeId: string;
  institutionVisibility: "" | "PUBLICA" | "PRIVADA";
  relationMode: RelationMode;
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

function modeToFlags(mode: RelationMode) {
  if (mode === "FACTURA_DIRECTO") {
    return { institutionIsPayer: true, institutionIsGroupOrganizer: false, institutionIsSponsor: false };
  }
  if (mode === "PATROCINADOR") {
    return { institutionIsPayer: false, institutionIsGroupOrganizer: false, institutionIsSponsor: true };
  }
  if (mode === "MIXTO") {
    return { institutionIsPayer: true, institutionIsGroupOrganizer: true, institutionIsSponsor: true };
  }
  return { institutionIsPayer: false, institutionIsGroupOrganizer: true, institutionIsSponsor: false };
}

export default function InstitutionCreateForm({
  initialTypes,
  initialOperatingDefaults
}: {
  initialTypes: Option[];
  initialOperatingDefaults?: OperatingCountryDefaultsSnapshot;
}) {
  const router = useRouter();
  const { country: countryContext } = useClientsCountryContext();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [geoErrors, setGeoErrors] = useState<GeoCascadeErrors>({});

  const [types, setTypes] = useState<Option[]>(() => initialTypes);
  const [newTypeName, setNewTypeName] = useState("");
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [sources, setSources] = useState<AcquisitionSource[]>([]);
  const [detailOptions, setDetailOptions] = useState<AcquisitionDetail[]>([]);
  const [referrer, setReferrer] = useState<ClientProfileLookupItem | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    nit: "",
    institutionCategoryId: "",
    institutionTypeId: initialTypes[0]?.id ?? "",
    institutionVisibility: "",
    relationMode: "CONVENIO_SIN_FACTURA",
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
        const [categoryRes, sourcesRes] = await Promise.all([
          actionListClientCatalogItems({ type: ClientCatalogType.INSTITUTION_CATEGORY }),
          actionListClientAcquisitionSources()
        ]);
        if (!mounted) return;
        setCategories(categoryRes.items as CatalogItem[]);
        setSources(sourcesRes.items as AcquisitionSource[]);
        setForm((prev) => ({
          ...prev,
          institutionCategoryId: prev.institutionCategoryId || categoryRes.items[0]?.id || ""
        }));
      } catch (err) {
        if (!mounted) return;
        setError((err as Error)?.message || "No se pudieron cargar catálogos.");
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

  const requiresFiscalIdentity = form.relationMode === "FACTURA_DIRECTO" || form.relationMode === "MIXTO";

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
    if (!form.name.trim()) return false;
    if (!form.institutionCategoryId.trim()) return false;
    if (!form.institutionTypeId.trim()) return false;
    if (!form.address.trim()) return false;
    if (!form.geoCountryId.trim()) return false;
    if (!form.geoAdmin1Id.trim() && !form.geoFreeState.trim()) return false;
    if (!form.geoAdmin2Id.trim() && !form.geoFreeCity.trim()) return false;
    if (!contacts.phones.some((row) => row.isActive && row.value.trim().length > 0)) return false;

    if (requiresFiscalIdentity && !form.nit.trim()) return false;
    if (requiresSocialDetail && !form.acquisitionDetailOptionId) return false;
    if (requiresOtherNote && !form.acquisitionOtherNote.trim()) return false;
    if (requiresOtherNote && form.acquisitionOtherNote.trim().length > 150) return false;
    if (requiresReferral && !referrer?.id) return false;

    return true;
  }, [contacts.phones, form, referrer?.id, requiresFiscalIdentity, requiresOtherNote, requiresReferral, requiresSocialDetail]);

  const createType = () => {
    const name = newTypeName.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        const result = await actionCreateClientCatalogItem({ type: ClientCatalogType.INSTITUTION_TYPE, name });
        const next = { id: result.id, name };
        setTypes((prev) => [next, ...prev]);
        setForm((prev) => ({ ...prev, institutionTypeId: result.id }));
        setNewTypeName("");
      } catch (err) {
        setError((err as Error)?.message || "No se pudo crear tipo institucional.");
      }
    });
  };

  const submit = () => {
    if (!canSubmit) return;
    const flags = modeToFlags(form.relationMode);

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

        const result = await actionCreateInstitutionClient({
          name: form.name,
          country: undefined,
          nit: form.nit || undefined,
          institutionCategoryId: form.institutionCategoryId,
          institutionTypeId: form.institutionTypeId,
          institutionIsPublic:
            form.institutionVisibility === ""
              ? undefined
              : form.institutionVisibility === "PUBLICA",
          ...flags,
          acquisitionSourceId: form.acquisitionSourceId || undefined,
          acquisitionDetailOptionId: requiresSocialDetail ? form.acquisitionDetailOptionId || undefined : undefined,
          acquisitionOtherNote: requiresOtherNote ? form.acquisitionOtherNote : undefined,
          referredByClientId: requiresReferral ? referrer?.id : undefined,
          address: form.address,
          phone: primaryPhone?.value || undefined,
          phoneCountryIso2: primaryPhone?.countryIso2 || undefined,
          email: primaryEmail?.value || undefined,
          phones,
          emails,
          geoCountryId: form.geoCountryId || undefined,
          geoAdmin1Id: form.geoAdmin1Id || undefined,
          geoAdmin2Id: form.geoAdmin2Id || undefined,
          geoAdmin3Id: form.geoAdmin3Id || undefined,
          geoPostalCode: form.geoPostalCode || undefined,
          geoFreeState: form.geoFreeState || undefined,
          geoFreeCity: form.geoFreeCity || undefined
        });

        router.push(`/admin/clientes/${result.id}`);
      } catch (err) {
        const message = (err as Error)?.message || "No se pudo crear la institución.";
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
          Institución
        </h2>
        <p className="text-sm text-slate-600">Alta institucional con modelo de relación claro y fiscalidad condicional.</p>
      </div>

      <section className="space-y-5 rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        {types.length === 0 && (
          <div className="rounded-xl border border-[#4aadf5]/40 bg-[#4aadf5]/10 px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-[#2e75ba]">No hay tipos institucionales configurados.</p>
            <p className="mt-1">
              Puedes crearlos aquí o en{" "}
              <Link href="/admin/clientes/configuracion" className="font-semibold text-[#2e75ba] hover:text-[#4aadf5]">
                Configuración de Clientes
              </Link>
              .
            </p>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">A) Identificación fiscal/legal</p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="relative md:col-span-2">
              <Landmark size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre institución *"
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
              />
            </div>

            <select
              value={form.relationMode}
              onChange={(e) => setForm((prev) => ({ ...prev, relationMode: e.target.value as RelationMode }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            >
              <option value="FACTURA_DIRECTO">Modelo: Factura directo</option>
              <option value="CONVENIO_SIN_FACTURA">Modelo: Convenio sin factura</option>
              <option value="PATROCINADOR">Modelo: Patrocinador</option>
              <option value="MIXTO">Modelo: Mixto</option>
            </select>

            <select
              value={form.institutionVisibility}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  institutionVisibility: e.target.value as FormState["institutionVisibility"]
                }))
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            >
              <option value="">Naturaleza: no definida (opcional)</option>
              <option value="PUBLICA">Naturaleza: Pública</option>
              <option value="PRIVADA">Naturaleza: Privada</option>
            </select>

            <input
              value={form.nit}
              onChange={(e) => setForm((prev) => ({ ...prev, nit: e.target.value }))}
              placeholder={requiresFiscalIdentity ? "Documento fiscal (obligatorio) *" : "Documento fiscal (opcional)"}
              className={cn(
                "rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2",
                requiresFiscalIdentity
                  ? "border-[#4aa59c] focus:border-[#4aa59c] focus:ring-[#4aa59c]/20"
                  : "border-slate-200 focus:border-diagnostics-primary focus:ring-diagnostics-primary/30"
              )}
            />

            <select
              value={form.institutionCategoryId}
              onChange={(e) => setForm((prev) => ({ ...prev, institutionCategoryId: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            >
              <option value="">Categoría institución *</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                <Tags size={14} className="text-diagnostics-secondary" />
                Tipo institucional
              </p>
              <select
                value={form.institutionTypeId}
                onChange={(e) => setForm((prev) => ({ ...prev, institutionTypeId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
              >
                <option value="" disabled>
                  {types.length ? "Selecciona un tipo..." : "No hay tipos configurados"}
                </option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex gap-2">
                <input
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="Crear tipo rápido (opcional)"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
                />
                <button
                  type="button"
                  onClick={createType}
                  disabled={!newTypeName.trim() || isPending}
                  className={cn(
                    "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]",
                    (!newTypeName.trim() || isPending) && "cursor-not-allowed opacity-60"
                  )}
                >
                  Crear
                </button>
              </div>
            </div>

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
                  {requiresSocialDetail ? "Describe la red social (obligatorio)" : "Describe cómo se enteró (obligatorio)"}
                </p>
                <textarea
                  value={form.acquisitionOtherNote}
                  onChange={(e) => setForm((prev) => ({ ...prev, acquisitionOtherNote: e.target.value.slice(0, 150) }))}
                  placeholder={
                    requiresSocialDetail
                      ? "Ej: campaña Meta Ads, influencer local, otra red... (máx 150)"
                      : "Describe cómo se enteró (máx 150 chars)"
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
                  placeholder="Buscar referente por nombre/documento/teléfono/email"
                />
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 md:col-span-2">
              {requiresFiscalIdentity
                ? "Modelo seleccionado: el documento fiscal es obligatorio para guardar."
                : "Modelo seleccionado: puedes guardar sin documento fiscal y completarlo luego."}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">B) Ubicación</p>
          <div className="grid gap-3">
            <input
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Ej: 2a calle 13-04 zona 14, Colonia Tecún Umán, Guatemala *"
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
              title="Ubicación principal"
              subtitle="País + divisiones administrativas; fallback texto libre si no hay catálogo."
              requireCountry
              requireAdmin1
              requireAdmin2
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">C) Contactos</p>
          <ClientContactsEditor
            value={contacts}
            onChange={setContacts}
            preferredGeoCountryId={form.geoCountryId || countryContext?.countryId || null}
            disabled={isPending}
            requirePhone
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">D) Observaciones / estado</p>
          <p className="text-xs text-slate-500">Estado y convenios avanzados se gestionan en la ficha 360.</p>
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
          Crear institución
        </button>

        {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      </section>
    </div>
  );
}
