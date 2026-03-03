"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClientCatalogType, ClientLocationType, ClientProfileType } from "@prisma/client";
import { Save, Tags, X } from "lucide-react";
import {
  actionCreateClientCatalogItem,
  actionUpdateClientBasics,
  actionUpdateClientProfilePhoto,
  actionUpdatePersonProfileSummary
} from "@/app/admin/clientes/actions";
import GeoCascadeFieldset, { type GeoCascadeErrors, type GeoCascadeValue } from "@/components/clients/GeoCascadeFieldset";
import ClientAffiliationsPanel, { type ClientAffiliationRow } from "@/components/clients/portal/ClientAffiliationsPanel";
import PhoneInput from "@/components/ui/PhoneInput";
import { ToastContainer } from "@/components/ui/Toast";
import UploadField from "@/components/ui/UploadField";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };

type ClientPrimaryLocation = {
  id: string;
  type: ClientLocationType;
  address: string | null;
  city: string | null;
  department: string | null;
  country: string | null;
  postalCode: string | null;
  geoCountryId: string | null;
  geoAdmin1Id: string | null;
  geoAdmin2Id: string | null;
  geoAdmin3Id: string | null;
  geoFreeState: string | null;
  geoFreeCity: string | null;
};

export type ClientBasics = {
  id: string;
  type: ClientProfileType;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  dpi: string | null;
  companyName: string | null;
  tradeName: string | null;
  institutionTypeId: string | null;
  nit: string | null;
  phone: string | null;
  phoneE164?: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  department: string | null;
  country: string | null;
  photoUrl: string | null;
  photoAssetId: string | null;
  statusId: string | null;
  primaryLocation?: ClientPrimaryLocation | null;
};

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((item) => !item.hasAttribute("disabled") && item.tabIndex !== -1);
}

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25";

export default function ClientBasicsEditor({
  client,
  statusOptions,
  institutionTypeOptions,
  personAffiliations = [],
  initialOpen = false,
  closeHref
}: {
  client: ClientBasics;
  statusOptions: Option[];
  institutionTypeOptions: Option[];
  personAffiliations?: ClientAffiliationRow[];
  initialOpen?: boolean;
  closeHref?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPhotoPending, startPhotoTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newInstitutionType, setNewInstitutionType] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(client.type === ClientProfileType.PERSON && initialOpen);
  const [hasDivisionCatalog, setHasDivisionCatalog] = useState(true);
  const [geoErrors, setGeoErrors] = useState<GeoCascadeErrors>({});
  const drawerRef = useRef<HTMLElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const { toasts, showToast, dismiss } = useToast();

  const [form, setForm] = useState(() => ({
    firstName: client.firstName ?? "",
    middleName: client.middleName ?? "",
    lastName: client.lastName ?? "",
    secondLastName: client.secondLastName ?? "",
    dpi: client.dpi ?? "",
    companyName: client.companyName ?? "",
    tradeName: client.tradeName ?? "",
    institutionTypeId: client.institutionTypeId ?? "",
    nit: client.nit ?? "",
    phone: client.phoneE164 ?? client.phone ?? "",
    phoneCountryIso2: "",
    email: client.email ?? "",
    address: client.primaryLocation?.address ?? client.address ?? "",
    city: client.primaryLocation?.city ?? client.city ?? "",
    department: client.primaryLocation?.department ?? client.department ?? "",
    country: client.primaryLocation?.country ?? client.country ?? "",
    geoCountryId: client.primaryLocation?.geoCountryId ?? "",
    geoAdmin1Id: client.primaryLocation?.geoAdmin1Id ?? "",
    geoAdmin2Id: client.primaryLocation?.geoAdmin2Id ?? "",
    geoAdmin3Id: client.primaryLocation?.geoAdmin3Id ?? "",
    geoPostalCode: client.primaryLocation?.postalCode ?? "",
    geoFreeState: client.primaryLocation?.geoFreeState ?? "",
    geoFreeCity: client.primaryLocation?.geoFreeCity ?? "",
    photoUrl: client.photoUrl ?? "",
    photoAssetId: client.photoAssetId ?? "",
    photoOriginalName: "",
    statusId: client.statusId ?? ""
  }));

  useEffect(() => {
    if (client.type !== ClientProfileType.PERSON) return;
    if (initialOpen) setIsDrawerOpen(true);
  }, [client.type, initialOpen]);

  const handleCloseDrawer = useCallback(() => {
    if (isPending) return;
    setIsDrawerOpen(false);
    setError(null);
    setGeoErrors({});
    if (closeHref) {
      router.replace(closeHref, { scroll: false });
    }
  }, [closeHref, isPending, router]);

  useEffect(() => {
    if (!isDrawerOpen || client.type !== ClientProfileType.PERSON) return;

    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => {
      const first = getFocusableElements(drawerRef.current)[0];
      first?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCloseDrawer();
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

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [isDrawerOpen, client.type, handleCloseDrawer]);

  const photoInitials = useMemo(() => {
    const baseLabel =
      client.type === ClientProfileType.PERSON
        ? [form.firstName, form.lastName].filter(Boolean).join(" ")
        : form.companyName || form.tradeName;
    const letters = baseLabel
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
    return letters || "CL";
  }, [client.type, form.companyName, form.firstName, form.lastName, form.tradeName]);

  const geoValue: GeoCascadeValue = {
    geoCountryId: form.geoCountryId,
    geoAdmin1Id: form.geoAdmin1Id,
    geoAdmin2Id: form.geoAdmin2Id,
    geoAdmin3Id: form.geoAdmin3Id,
    geoPostalCode: form.geoPostalCode,
    geoFreeState: form.geoFreeState,
    geoFreeCity: form.geoFreeCity
  };

  function handleOpenDrawer() {
    if (client.type !== ClientProfileType.PERSON) return;
    setIsDrawerOpen(true);
  }

  const createInstitutionType = () => {
    const name = newInstitutionType.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        const result = await actionCreateClientCatalogItem({ type: ClientCatalogType.INSTITUTION_TYPE, name });
        setForm((prev) => ({ ...prev, institutionTypeId: result.id }));
        setNewInstitutionType("");
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo crear el tipo.");
      }
    });
  };

  const submit = () => {
    const savingToastId = showToast({
      tone: "info",
      title: "Guardando...",
      message: "Actualizando datos del perfil.",
      durationMs: 2000
    });

    startTransition(async () => {
      try {
        if (client.type === ClientProfileType.PERSON) {
          await actionUpdatePersonProfileSummary({
            clientId: client.id,
            firstName: form.firstName,
            middleName: form.middleName,
            lastName: form.lastName,
            secondLastName: form.secondLastName,
            dpi: form.dpi,
            phone: form.phone,
            phoneCountryIso2: form.phoneCountryIso2 || undefined,
            email: form.email,
            address: form.address,
            city: form.city,
            department: form.department,
            country: form.country,
            geoCountryId: form.geoCountryId || undefined,
            geoAdmin1Id: form.geoAdmin1Id || undefined,
            geoAdmin2Id: form.geoAdmin2Id || undefined,
            geoAdmin3Id: form.geoAdmin3Id || undefined,
            geoPostalCode: form.geoPostalCode || undefined,
            geoFreeState: form.geoFreeState || undefined,
            geoFreeCity: form.geoFreeCity || undefined,
            statusId: form.statusId || undefined
          });
        } else {
          await actionUpdateClientBasics({
            clientId: client.id,
            type: client.type,
            firstName: form.firstName,
            middleName: form.middleName,
            lastName: form.lastName,
            secondLastName: form.secondLastName,
            dpi: form.dpi,
            companyName: form.companyName,
            tradeName: form.tradeName,
            institutionTypeId: form.institutionTypeId,
            nit: form.nit,
            phone: form.phone,
            phoneCountryIso2: form.phoneCountryIso2 || undefined,
            email: form.email,
            address: form.address,
            city: form.city,
            department: form.department,
            country: form.country,
            statusId: form.statusId
          });
        }

        setError(null);
        setGeoErrors({});
        dismiss(savingToastId);
        showToast({
          tone: "success",
          title: "Cambios guardados ✅",
          durationMs: 2500
        });
        router.refresh();
        if (client.type === ClientProfileType.PERSON) {
          setIsDrawerOpen(false);
          if (closeHref) {
            router.replace(closeHref, { scroll: false });
          }
        }
      } catch (err) {
        const message = (err as Error)?.message || "No se pudo guardar.";
        setError(message);
        dismiss(savingToastId);
        showToast({
          tone: "error",
          title: "No se pudo guardar ❌",
          message,
          durationMs: 4000
        });

        const normalized = message.toLowerCase();
        if (normalized.includes("país")) {
          setGeoErrors((prev) => ({ ...prev, geoCountryId: message }));
        }
        if (normalized.includes("departamento") || normalized.includes("región")) {
          setGeoErrors((prev) => ({ ...prev, geoAdmin1Id: message }));
        }
        if (normalized.includes("municipio") || normalized.includes("ciudad")) {
          setGeoErrors((prev) => ({ ...prev, geoAdmin2Id: message }));
        }
      }
    });
  };

  const savePhoto = () => {
    const savingToastId = showToast({
      tone: "info",
      title: "Guardando...",
      message: "Actualizando foto del perfil.",
      durationMs: 2000
    });

    startPhotoTransition(async () => {
      try {
        await actionUpdateClientProfilePhoto({
          clientId: client.id,
          photoUrl: form.photoUrl,
          photoAssetId: form.photoAssetId,
          originalName: form.photoOriginalName
        });
        setError(null);
        dismiss(savingToastId);
        showToast({
          tone: "success",
          title: "Foto guardada ✅",
          durationMs: 2500
        });
        router.refresh();
      } catch (err) {
        const message = (err as Error)?.message || "No se pudo guardar la foto.";
        setError(message);
        dismiss(savingToastId);
        showToast({
          tone: "error",
          title: "No se pudo guardar ❌",
          message,
          durationMs: 4000
        });
      }
    });
  };

  const canSave = useMemo(() => !isPending, [isPending]);

  if (client.type === ClientProfileType.PERSON) {
    return (
      <div className="space-y-3">
        <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Edición de perfil</p>
            <p className="text-sm text-slate-600">Edita identidad, contacto, ubicación GEO y vinculación empresarial en un solo flujo.</p>
          </div>
          <button
            type="button"
            onClick={handleOpenDrawer}
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
          >
            Editar cliente
          </button>
        </div>

        {isDrawerOpen ? (
          <div className="fixed inset-0 z-[90]">
            <button
              type="button"
              onClick={handleCloseDrawer}
              className="absolute inset-0 bg-slate-900/40"
              aria-label="Cerrar editor de cliente"
            />

            <aside
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Editar cliente"
              className="absolute right-0 top-0 flex h-full w-full max-w-[980px] flex-col border-l border-slate-200 bg-white shadow-xl"
            >
              <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Cliente · Persona</p>
                  <h3 className="text-base font-semibold text-slate-900">Editar cliente</h3>
                  <p className="text-xs text-slate-500">Los cambios se aplican al perfil y a la ubicación principal.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                >
                  <X size={14} /> Cerrar
                </button>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto bg-[#f8fafc] p-5 pb-28">
                <section className="rounded-xl border border-[#dce7f5] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Foto de perfil</p>
                  <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-lg font-semibold text-slate-500 shadow-sm">
                      {form.photoUrl ? (
                        <Image
                          src={form.photoUrl}
                          alt="Foto del cliente"
                          width={96}
                          height={96}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span>{photoInitials}</span>
                      )}
                    </div>

                    <div className="flex-1 space-y-3">
                      <UploadField
                        value={form.photoUrl}
                        accept="image/*"
                        helperText="JPG, PNG o WEBP"
                        disabled={isPhotoPending}
                        onChange={(url, info) =>
                          setForm((prev) => ({
                            ...prev,
                            photoUrl: url,
                            photoAssetId: url ? info?.assetId ?? "" : "",
                            photoOriginalName: url ? info?.name ?? prev.photoOriginalName : ""
                          }))
                        }
                      />
                      <button
                        type="button"
                        onClick={savePhoto}
                        disabled={isPhotoPending}
                        className={cn(
                          "inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]",
                          isPhotoPending && "cursor-not-allowed opacity-60"
                        )}
                      >
                        {isPhotoPending ? "Guardando foto..." : "Guardar foto"}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-[#dce7f5] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Identidad</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      value={form.firstName}
                      onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Primer nombre"
                      className={inputClass}
                    />
                    <input
                      value={form.middleName}
                      onChange={(e) => setForm((prev) => ({ ...prev, middleName: e.target.value }))}
                      placeholder="Segundo nombre"
                      className={inputClass}
                    />
                    <input
                      value={form.lastName}
                      onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Primer apellido"
                      className={inputClass}
                    />
                    <input
                      value={form.secondLastName}
                      onChange={(e) => setForm((prev) => ({ ...prev, secondLastName: e.target.value }))}
                      placeholder="Segundo apellido"
                      className={inputClass}
                    />
                    <input
                      value={form.dpi}
                      onChange={(e) => setForm((prev) => ({ ...prev, dpi: e.target.value }))}
                      placeholder="Número de identificación (DPI)"
                      className={cn(inputClass, "md:col-span-2")}
                    />
                  </div>
                </section>

                <section className="rounded-xl border border-[#dce7f5] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Contacto principal</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <PhoneInput
                      value={form.phone}
                      preferredCountryText={form.country}
                      label="Teléfono"
                      autoComplete="section-company tel"
                      onChange={(phone, meta) =>
                        setForm((prev) => ({
                          ...prev,
                          phone,
                          phoneCountryIso2: meta.selectedIso2 ?? prev.phoneCountryIso2
                        }))
                      }
                    />
                    <label className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500">Correo principal</span>
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="section-company email"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="Correo"
                        className={inputClass}
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-xl border border-[#dce7f5] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Ubicación principal</p>
                  <p className="mt-1 text-xs text-slate-500">País, departamento y municipio con el mismo selector GEO del formulario de creación.</p>
                  <div className="mt-3 grid gap-3">
                    <input
                      value={form.address}
                      onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Dirección"
                      className={inputClass}
                    />

                    <GeoCascadeFieldset
                      idPrefix="client-person-profile-edit"
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
                          geoFreeCity: next.geoFreeCity ?? "",
                          department: next.geoFreeState ?? prev.department,
                          city: next.geoFreeCity ?? prev.city
                        }))
                      }
                      errors={geoErrors}
                      onHasDivisionCatalogChange={setHasDivisionCatalog}
                      subtitle="Selecciona país, departamento y municipio"
                      autofillSection="company"
                      autofillFieldNames={{
                        country: "country",
                        department: "department",
                        city: "city"
                      }}
                    />

                    {!hasDivisionCatalog ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <input
                          value={form.department}
                          onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                          placeholder="Departamento (manual)"
                          className={inputClass}
                        />
                        <input
                          value={form.city}
                          onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                          placeholder="Municipio / ciudad (manual)"
                          className={inputClass}
                        />
                      </div>
                    ) : null}

                    {statusOptions.length > 0 ? (
                      <label className="space-y-1">
                        <span className="text-xs font-semibold text-slate-500">Estado</span>
                        <select
                          value={form.statusId}
                          onChange={(e) => setForm((prev) => ({ ...prev, statusId: e.target.value }))}
                          className={inputClass}
                        >
                          <option value="">Estado (sin asignar)</option>
                          {statusOptions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-xl border border-[#dce7f5] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Vinculación empresarial</p>
                  <p className="mt-1 text-xs text-slate-500">Administra empresas vinculadas, rol y estado del vínculo.</p>
                  <div className="mt-3">
                    <ClientAffiliationsPanel clientId={client.id} affiliations={personAffiliations} />
                  </div>
                </section>

                {error ? <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
              </div>

              <footer className="sticky bottom-0 z-10 border-t border-slate-200 bg-white px-5 py-3">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseDrawer}
                    disabled={isPending}
                    className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!canSave}
                    className={cn(
                      "inline-flex h-10 items-center gap-2 rounded-lg bg-[#4aa59c] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#4aadf5]",
                      !canSave && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
                    )}
                  >
                    {isPending ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <Save size={16} />
                    )}
                    {isPending ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </footer>
            </aside>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />
      <section className="rounded-xl border border-[#dce7f5] bg-[#f8fafc] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Foto</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-lg font-semibold text-slate-500 shadow-sm">
            {form.photoUrl ? (
              <Image
                src={form.photoUrl}
                alt="Foto de empresa"
                width={96}
                height={96}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span>{photoInitials}</span>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <UploadField
              value={form.photoUrl}
              accept="image/*"
              helperText="JPG o PNG para perfil del cliente"
              disabled={isPhotoPending}
              onChange={(url, info) =>
                setForm((prev) => ({
                  ...prev,
                  photoUrl: url,
                  photoAssetId: url ? info?.assetId ?? "" : "",
                  photoOriginalName: url ? info?.name ?? prev.photoOriginalName : ""
                }))
              }
            />
            <button
              type="button"
              onClick={savePhoto}
              disabled={isPhotoPending}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-diagnostics-secondary hover:text-diagnostics-corporate",
                isPhotoPending && "cursor-not-allowed opacity-60"
              )}
            >
              {isPhotoPending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#2e75ba]/30 border-t-[#2e75ba]" />
                  Guardando...
                </>
              ) : (
                "Guardar foto"
              )}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <>
            <input
              value={form.companyName}
              onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
              placeholder={
                client.type === ClientProfileType.INSTITUTION
                  ? "Nombre de institución"
                  : client.type === ClientProfileType.INSURER
                    ? "Nombre de aseguradora"
                    : "Razón social"
              }
              className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            />
            {(client.type === ClientProfileType.COMPANY || client.type === ClientProfileType.INSURER) && (
              <input
                value={form.tradeName}
                onChange={(e) => setForm((prev) => ({ ...prev, tradeName: e.target.value }))}
                placeholder="Nombre comercial"
                className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
              />
            )}

            {client.type === ClientProfileType.INSTITUTION && (
              <div className="md:col-span-2 space-y-2">
                <p className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                  <Tags size={14} className="text-diagnostics-secondary" />
                  Tipo de institución
                </p>
                <select
                  value={form.institutionTypeId}
                  onChange={(e) => setForm((prev) => ({ ...prev, institutionTypeId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
                >
                  <option value="">Selecciona un tipo…</option>
                  {institutionTypeOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    value={newInstitutionType}
                    onChange={(e) => setNewInstitutionType(e.target.value)}
                    placeholder="Agregar tipo…"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
                  />
                  <button
                    type="button"
                    onClick={createInstitutionType}
                    disabled={!newInstitutionType.trim() || isPending}
                    className={cn(
                      "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-diagnostics-secondary hover:text-diagnostics-corporate",
                      (!newInstitutionType.trim() || isPending) && "cursor-not-allowed opacity-60"
                    )}
                  >
                    Crear
                  </button>
                </div>
              </div>
            )}

            <input
              value={form.nit}
              onChange={(e) => setForm((prev) => ({ ...prev, nit: e.target.value }))}
              placeholder={client.type === ClientProfileType.INSTITUTION ? "NIT (si aplica)" : "NIT"}
              className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            />
        </>

        <PhoneInput
          value={form.phone}
          preferredCountryText={form.country}
          label="Teléfono"
          onChange={(phone, meta) =>
            setForm((prev) => ({
              ...prev,
              phone,
              phoneCountryIso2: meta.selectedIso2 ?? prev.phoneCountryIso2
            }))
          }
        />
        <input
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          placeholder="Correo"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
        />

        <input
          value={form.address}
          onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
          placeholder="Dirección"
          className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
        />

        <input
          value={form.city}
          onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
          placeholder="Ciudad"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
        />
        <input
          value={form.department}
          onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
          placeholder="Departamento"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
        />
        <input
          value={form.country}
          onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
          placeholder="País"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
        />

        {statusOptions.length > 0 && (
          <select
            value={form.statusId}
            onChange={(e) => setForm((prev) => ({ ...prev, statusId: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          >
            <option value="">Estado (sin asignar)</option>
            {statusOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!canSave}
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-diagnostics-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-diagnostics-primary/90",
          !canSave && "cursor-not-allowed opacity-60 hover:bg-diagnostics-primary"
        )}
      >
        {isPending ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <Save size={16} />
        )}
        {isPending ? "Guardando..." : "Guardar cambios"}
      </button>

      {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
    </div>
  );
}
