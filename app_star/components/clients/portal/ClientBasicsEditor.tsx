"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClientCatalogType, ClientProfileType } from "@prisma/client";
import { Save, Tags } from "lucide-react";
import { actionCreateClientCatalogItem, actionUpdateClientBasics, actionUpdateClientProfilePhoto } from "@/app/admin/clientes/actions";
import PhoneInput from "@/components/ui/PhoneInput";
import { ToastContainer } from "@/components/ui/Toast";
import UploadField from "@/components/ui/UploadField";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };

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
  phoneE164: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  department: string | null;
  country: string | null;
  photoUrl: string | null;
  photoAssetId: string | null;
  statusId: string | null;
};

export default function ClientBasicsEditor({
  client,
  statusOptions,
  institutionTypeOptions
}: {
  client: ClientBasics;
  statusOptions: Option[];
  institutionTypeOptions: Option[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPhotoPending, startPhotoTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newInstitutionType, setNewInstitutionType] = useState("");
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
    address: client.address ?? "",
    city: client.city ?? "",
    department: client.department ?? "",
    country: client.country ?? "",
    photoUrl: client.photoUrl ?? "",
    photoAssetId: client.photoAssetId ?? "",
    photoOriginalName: "",
    statusId: client.statusId ?? ""
  }));

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
        setError(null);
        dismiss(savingToastId);
        showToast({
          tone: "success",
          title: "Cambios guardados ✅",
          durationMs: 2500
        });
        router.refresh();
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
          title: "Cambios guardados ✅",
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
                alt={`Foto de ${client.type === ClientProfileType.PERSON ? "cliente" : "empresa"}`}
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
        {client.type === ClientProfileType.PERSON ? (
          <>
            <input
              value={form.firstName}
              onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
              placeholder="Primer nombre"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            />
            <input
              value={form.middleName}
              onChange={(e) => setForm((prev) => ({ ...prev, middleName: e.target.value }))}
              placeholder="Segundo nombre"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            />
            <input
              value={form.lastName}
              onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
              placeholder="Primer apellido"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            />
            <input
              value={form.secondLastName}
              onChange={(e) => setForm((prev) => ({ ...prev, secondLastName: e.target.value }))}
              placeholder="Segundo apellido"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            />
            <input
              value={form.dpi}
              onChange={(e) => setForm((prev) => ({ ...prev, dpi: e.target.value }))}
              placeholder="DPI (13 dígitos)"
              className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            />
          </>
        ) : (
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
        )}

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
