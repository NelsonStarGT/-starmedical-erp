"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClientProfileType } from "@prisma/client";
import { ArrowLeft, ArrowRight, CheckCircle2, IdCard, Mail, MapPin, PlusCircle, Trash2, UserPlus } from "lucide-react";
import { z } from "zod";
import { actionCheckPersonDpi, actionCreatePersonClient } from "@/app/admin/clientes/actions";
import { ClientProfileLookup } from "@/components/clients/ClientProfileLookup";
import GeoCascadeFieldset, { type GeoCascadeErrors, type GeoCascadeValue } from "@/components/clients/GeoCascadeFieldset";
import PhoneInput from "@/components/ui/PhoneInput";
import { CLIENT_TYPE_LABELS } from "@/lib/clients/constants";
import { cn } from "@/lib/utils";

type WizardStep = 1 | 2 | 3;

type FormState = {
  firstName: string;
  middleName: string;
  lastName: string;
  secondLastName: string;
  dpi: string;
  phone: string;
  phoneCountryIso2: string;
  email: string;
  addressGeneral: string;
  geoCountryId: string;
  geoAdmin1Id: string;
  geoAdmin2Id: string;
  geoAdmin3Id: string;
  geoPostalCode: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

type AffiliationDraft = {
  entityType: ClientProfileType;
  entityClientId: string;
  entityLabel: string;
};

type DpiStatus = {
  state: "idle" | "checking" | "available" | "duplicate" | "invalid";
  message?: string;
  clientId?: string;
  label?: string;
};

const step1Schema = z.object({
  firstName: z.string().trim().min(1, "Primer nombre requerido."),
  lastName: z.string().trim().min(1, "Primer apellido requerido."),
  dpi: z
    .string()
    .trim()
    .regex(/^\d{13}$/, "DPI debe tener 13 dígitos."),
  phone: z.string().trim().min(1, "Teléfono requerido.")
});

const ENTITY_OPTIONS: Array<{ value: ClientProfileType; label: string }> = [
  { value: ClientProfileType.COMPANY, label: "Empresa" },
  { value: ClientProfileType.INSTITUTION, label: "Institución" },
  { value: ClientProfileType.INSURER, label: "Aseguradora" }
];

const DEFAULT_FORM: FormState = {
  firstName: "",
  middleName: "",
  lastName: "",
  secondLastName: "",
  dpi: "",
  phone: "",
  phoneCountryIso2: "",
  email: "",
  addressGeneral: "",
  geoCountryId: "",
  geoAdmin1Id: "",
  geoAdmin2Id: "",
  geoAdmin3Id: "",
  geoPostalCode: ""
};

const DEFAULT_AFFILIATION: AffiliationDraft = {
  entityType: ClientProfileType.COMPANY,
  entityClientId: "",
  entityLabel: ""
};

export default function PersonCreateForm() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [geoErrors, setGeoErrors] = useState<GeoCascadeErrors>({});
  const [error, setError] = useState<string | null>(null);

  const [dpiStatus, setDpiStatus] = useState<DpiStatus>({ state: "idle" });
  const [lastCheckedDpi, setLastCheckedDpi] = useState("");

  const [affiliations, setAffiliations] = useState<AffiliationDraft[]>([]);
  const [affDraft, setAffDraft] = useState<AffiliationDraft>(DEFAULT_AFFILIATION);

  const geoValue: GeoCascadeValue = {
    geoCountryId: form.geoCountryId,
    geoAdmin1Id: form.geoAdmin1Id,
    geoAdmin2Id: form.geoAdmin2Id,
    geoAdmin3Id: form.geoAdmin3Id,
    geoPostalCode: form.geoPostalCode
  };

  const isDpiDuplicate = dpiStatus.state === "duplicate";
  const isDpiChecking = dpiStatus.state === "checking";

  const step1ValidBySchema = useMemo(() => {
    const parsed = step1Schema.safeParse({
      firstName: form.firstName,
      lastName: form.lastName,
      dpi: form.dpi,
      phone: form.phone
    });
    return parsed.success;
  }, [form.dpi, form.firstName, form.lastName, form.phone]);

  const canGoStep2 = step1ValidBySchema && !isDpiDuplicate && !isDpiChecking;

  const runDpiCheck = useCallback(
    async (candidate: string) => {
      const dpi = candidate.trim();
      if (!dpi || dpi === lastCheckedDpi) return;
      if (!/^\d{13}$/.test(dpi)) {
        setDpiStatus({ state: "invalid", message: "DPI debe tener 13 dígitos." });
        return;
      }

      setDpiStatus({ state: "checking", message: "Verificando DPI..." });
      try {
        const result = await actionCheckPersonDpi({ dpi });
        setLastCheckedDpi(dpi);
        if (result.exists && result.clientId) {
          setDpiStatus({
            state: "duplicate",
            message: "Este DPI ya existe en el sistema.",
            clientId: result.clientId,
            label: result.label ?? undefined
          });
        } else {
          setDpiStatus({ state: "available", message: "DPI disponible." });
        }
      } catch (err) {
        setDpiStatus({ state: "invalid", message: (err as Error)?.message || "No se pudo validar el DPI." });
      }
    },
    [lastCheckedDpi]
  );

  useEffect(() => {
    const dpi = form.dpi.trim();
    if (!dpi || dpi.length < 13) {
      setDpiStatus({ state: "idle" });
      setLastCheckedDpi("");
      return;
    }

    const timeout = setTimeout(() => {
      void runDpiCheck(dpi);
    }, 450);

    return () => clearTimeout(timeout);
  }, [form.dpi, runDpiCheck]);

  function validateStep1() {
    const parsed = step1Schema.safeParse({
      firstName: form.firstName,
      lastName: form.lastName,
      dpi: form.dpi,
      phone: form.phone
    });

    if (parsed.success) {
      setErrors((prev) => ({
        ...prev,
        firstName: undefined,
        lastName: undefined,
        dpi: undefined,
        phone: undefined
      }));
      return true;
    }

    const nextErrors: FieldErrors = {};
    parsed.error.issues.forEach((issue) => {
      const key = issue.path[0] as keyof FormState;
      nextErrors[key] = issue.message;
    });

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return false;
  }

  function handleNextFromStep1() {
    const valid = validateStep1();
    if (!valid) return;
    if (isDpiDuplicate || isDpiChecking) return;
    setStep(2);
  }

  function addAffiliation() {
    if (!affDraft.entityClientId) {
      setError("Selecciona una entidad antes de agregar.");
      return;
    }

    const duplicate = affiliations.some(
      (item) => item.entityType === affDraft.entityType && item.entityClientId === affDraft.entityClientId
    );
    if (duplicate) {
      setError("Esta afiliación ya fue agregada.");
      return;
    }

    setAffiliations((prev) => [...prev, affDraft]);
    setAffDraft(DEFAULT_AFFILIATION);
    setError(null);
  }

  function removeAffiliation(index: number) {
    setAffiliations((prev) => prev.filter((_, i) => i !== index));
  }

  function submit() {
    const valid = validateStep1();
    if (!valid || isDpiDuplicate || isDpiChecking) {
      setStep(1);
      return;
    }

    setError(null);
    setGeoErrors({});

    startTransition(async () => {
      try {
        const result = await actionCreatePersonClient({
          firstName: form.firstName,
          middleName: form.middleName,
          lastName: form.lastName,
          secondLastName: form.secondLastName,
          dpi: form.dpi,
          phone: form.phone,
          phoneCountryIso2: form.phoneCountryIso2 || undefined,
          email: form.email || undefined,
          addressGeneral: form.addressGeneral || undefined,
          geoCountryId: form.geoCountryId || undefined,
          geoAdmin1Id: form.geoAdmin1Id || undefined,
          geoAdmin2Id: form.geoAdmin2Id || undefined,
          geoAdmin3Id: form.geoAdmin3Id || undefined,
          geoPostalCode: form.geoPostalCode || undefined,
          affiliations: affiliations.map((item) => ({
            entityType: item.entityType,
            entityClientId: item.entityClientId
          }))
        });

        const nextTab = affiliations.length ? "afiliaciones" : "resumen";
        router.push(`/admin/clientes/${result.id}?tab=${nextTab}`);
      } catch (err) {
        const message = (err as Error)?.message || "No se pudo crear la persona.";
        setError(message);

        if (message.toLowerCase().includes("país")) {
          setGeoErrors((prev) => ({ ...prev, geoCountryId: message }));
          setStep(3);
        }
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2e75ba]">Crear cliente</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          Persona
        </h2>
        <p className="text-sm text-slate-600">Wizard por pasos con validación en tiempo real y pre-chequeo de DPI.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              if (n === 2 && !canGoStep2) return;
              if (n === 3 && !canGoStep2) return;
              setStep(n as WizardStep);
            }}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              step === n
                ? "border-[#2e75ba] bg-[#2e75ba] text-white shadow-sm"
                : canGoStep2 || n === 1
                  ? "border-slate-200 bg-white text-slate-700 hover:bg-[#f8fafc] hover:text-[#2e75ba]"
                  : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
            )}
          >
            {n === 1 ? "Identidad" : n === 2 ? "Afiliaciones" : "Contacto y ubicación"}
          </button>
        ))}
      </div>

      {step === 1 && (
        <section className="space-y-4 rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Paso 1 · Identidad (obligatorios)</p>
            <p className="mt-1 text-sm text-slate-600">Requerido: primer nombre, primer apellido, DPI y teléfono.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InputField
              value={form.firstName}
              onChange={(firstName) => setForm((prev) => ({ ...prev, firstName }))}
              placeholder="Primer nombre *"
              error={errors.firstName}
              bold
            />
            <InputField
              value={form.middleName}
              onChange={(middleName) => setForm((prev) => ({ ...prev, middleName }))}
              placeholder="Segundo nombre (opcional)"
            />
            <InputField
              value={form.lastName}
              onChange={(lastName) => setForm((prev) => ({ ...prev, lastName }))}
              placeholder="Primer apellido *"
              error={errors.lastName}
              bold
            />
            <InputField
              value={form.secondLastName}
              onChange={(secondLastName) => setForm((prev) => ({ ...prev, secondLastName }))}
              placeholder="Segundo apellido (opcional)"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <IconInput
                icon={<IdCard size={16} className="text-slate-400" />}
                value={form.dpi}
                onChange={(dpi) => {
                  setForm((prev) => ({ ...prev, dpi: dpi.replace(/\D/g, "") }));
                  setErrors((prev) => ({ ...prev, dpi: undefined }));
                }}
                onBlur={() => {
                  void runDpiCheck(form.dpi);
                }}
                placeholder="DPI (13 dígitos) *"
                error={errors.dpi}
              />

              {dpiStatus.state !== "idle" && (
                <div className="mt-1 text-xs">
                  {dpiStatus.state === "duplicate" && dpiStatus.clientId ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
                      <p>{dpiStatus.message}</p>
                      <p className="mt-1">{dpiStatus.label || "Cliente existente"}</p>
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/clientes/${dpiStatus.clientId}`)}
                        className="mt-1 font-semibold underline"
                      >
                        Abrir perfil
                      </button>
                    </div>
                  ) : (
                    <p className={cn(dpiStatus.state === "available" ? "text-emerald-700" : "text-slate-500")}>
                      {dpiStatus.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            <PhoneInput
              value={form.phone}
              preferredGeoCountryId={form.geoCountryId || null}
              required
              label="Teléfono"
              onChange={(phone, meta) => {
                setForm((prev) => ({
                  ...prev,
                  phone,
                  phoneCountryIso2: meta.selectedIso2 ?? ""
                }));
                setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              error={errors.phone}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleNextFromStep1}
              disabled={!canGoStep2 || isPending}
              className={cn(
                "inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4aadf5]",
                (!canGoStep2 || isPending) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
              )}
            >
              Siguiente
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4 rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Paso 2 · Afiliaciones</p>
            <p className="mt-1 text-sm text-slate-600">
              Afiliar persona a empresa, institución o aseguradora. Se crea automáticamente una afiliación interna principal al registrar la persona.
            </p>
          </div>

          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
            <select
              value={affDraft.entityType}
              onChange={(e) =>
                setAffDraft({
                  entityType: e.target.value as ClientProfileType,
                  entityClientId: "",
                  entityLabel: ""
                })
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              disabled={isPending}
            >
              {ENTITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <ClientProfileLookup
              label="Buscar entidad"
              types={[affDraft.entityType]}
              value={
                affDraft.entityClientId
                  ? { id: affDraft.entityClientId, type: affDraft.entityType, label: affDraft.entityLabel }
                  : null
              }
              onChange={(item) => {
                setAffDraft((prev) => ({
                  ...prev,
                  entityClientId: item?.id ?? "",
                  entityLabel: item?.label ?? ""
                }));
              }}
              disabled={isPending}
              placeholder="Escribe para buscar..."
            />

            <button
              type="button"
              onClick={addAffiliation}
              disabled={!affDraft.entityClientId || isPending}
              className={cn(
                "inline-flex w-fit items-center gap-2 rounded-full border border-[#4aa59c]/30 bg-[#4aa59c]/10 px-4 py-2 text-sm font-semibold text-[#2e75ba] hover:border-[#4aa59c]",
                (!affDraft.entityClientId || isPending) && "cursor-not-allowed opacity-60"
              )}
            >
              <PlusCircle size={16} />
              Agregar
            </button>
          </div>

          {affiliations.length > 0 ? (
            <div className="space-y-2">
              {affiliations.map((item, index) => (
                <div key={`${item.entityType}-${item.entityClientId}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.entityLabel}</p>
                    <p className="text-xs text-slate-500">{CLIENT_TYPE_LABELS[item.entityType]}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAffiliation(index)}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                  >
                    <Trash2 size={14} />
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Sin afiliaciones todavía.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              <ArrowLeft size={16} />
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white"
            >
              Siguiente
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4 rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Paso 3 · Contacto y ubicación</p>
            <p className="mt-1 text-sm text-slate-600">Email y dirección son opcionales. La ubicación usa selects en cascada.</p>
          </div>

          <IconInput
            icon={<Mail size={16} className="text-slate-400" />}
            value={form.email}
            onChange={(email) => setForm((prev) => ({ ...prev, email }))}
            placeholder="Email (opcional)"
          />

          <IconInput
            icon={<MapPin size={16} className="text-slate-400" />}
            value={form.addressGeneral}
            onChange={(addressGeneral) => setForm((prev) => ({ ...prev, addressGeneral }))}
            placeholder="Dirección general (opcional)"
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
              geoPostalCode: next.geoPostalCode
            }))
          }
            errors={geoErrors}
            disabled={isPending}
            title="Ubicación"
            subtitle="País → Departamento → Municipio"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              <ArrowLeft size={16} />
              Anterior
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canGoStep2 || isPending}
              className={cn(
                "inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4aadf5]",
                (!canGoStep2 || isPending) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
              )}
            >
              <UserPlus size={16} />
              Finalizar creación
            </button>
          </div>
        </section>
      )}

      {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      {!error && step === 3 && canGoStep2 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="inline-flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} />
            Identidad validada y DPI disponible.
          </p>
        </div>
      )}

      <p className="text-xs text-slate-500">
        ¿Ya existe este cliente? Usa <Link href="/admin/clientes/personas" className="font-semibold text-[#2e75ba]">Personas</Link> para buscar y abrir el perfil.
      </p>
    </div>
  );
}

function InputField({
  value,
  onChange,
  placeholder,
  error,
  bold
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  bold?: boolean;
}) {
  return (
    <div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25",
          bold && "font-semibold",
          error && "border-rose-300 focus:border-rose-300 focus:ring-rose-200"
        )}
      />
      {error && <p className="mt-1 text-xs text-rose-700">{error}</p>}
    </div>
  );
}

function IconInput({
  icon,
  value,
  onChange,
  placeholder,
  onBlur,
  error
}: {
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onBlur?: () => void;
  error?: string;
}) {
  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-[#4aa59c] focus-within:ring-2 focus-within:ring-[#4aa59c]/25",
          error && "border-rose-300 focus-within:border-rose-300 focus-within:ring-rose-200"
        )}
      >
        {icon}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-slate-700 outline-none"
        />
      </div>
      {error && <p className="mt-1 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
