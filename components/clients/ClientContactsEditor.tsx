"use client";

import { type ReactNode } from "react";
import { ClientEmailCategory, ClientPhoneCategory, ClientPhoneRelationType } from "@prisma/client";
import { PlusCircle, Trash2 } from "lucide-react";
import PhoneInput, { type PhoneInputMeta } from "@/components/ui/PhoneInput";
import { cn } from "@/lib/utils";

export type ClientPhoneDraft = {
  id: string;
  category: ClientPhoneCategory;
  relationType?: ClientPhoneRelationType;
  value: string;
  countryIso2: string;
  canCall?: boolean;
  canWhatsapp?: boolean;
  isPrimary: boolean;
  isActive: boolean;
};

export type ClientEmailDraft = {
  id: string;
  category: ClientEmailCategory;
  value: string;
  isPrimary: boolean;
  isActive: boolean;
};

export type ClientContactsDraft = {
  phones: ClientPhoneDraft[];
  emails: ClientEmailDraft[];
};

const PHONE_CATEGORY_OPTIONS: Array<{ value: ClientPhoneCategory; label: string }> = [
  { value: ClientPhoneCategory.PRIMARY, label: "Principal" },
  { value: ClientPhoneCategory.MOBILE, label: "Móvil" },
  { value: ClientPhoneCategory.WORK, label: "Trabajo" },
  { value: ClientPhoneCategory.OTHER, label: "Otro" }
];

const PHONE_RELATION_OPTIONS: Array<{ value: ClientPhoneRelationType; label: string }> = [
  { value: ClientPhoneRelationType.TITULAR, label: "Titular" },
  { value: ClientPhoneRelationType.CONYUGE, label: "Cónyuge" },
  { value: ClientPhoneRelationType.HIJO_A, label: "Hijo(a)" },
  { value: ClientPhoneRelationType.MADRE, label: "Madre" },
  { value: ClientPhoneRelationType.PADRE, label: "Padre" },
  { value: ClientPhoneRelationType.ENCARGADO, label: "Encargado" },
  { value: ClientPhoneRelationType.OTRO, label: "Otro" }
];

const EMAIL_CATEGORY_OPTIONS: Array<{ value: ClientEmailCategory; label: string }> = [
  { value: ClientEmailCategory.PRIMARY, label: "Personal" },
  { value: ClientEmailCategory.WORK, label: "Trabajo" },
  { value: ClientEmailCategory.BILLING, label: "Facturación" },
  { value: ClientEmailCategory.OTHER, label: "Otro" }
];

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function ensureSinglePrimaryPhone(rows: ClientPhoneDraft[]): ClientPhoneDraft[] {
  if (!rows.length) return [];
  const activeRows = rows.filter((row) => row.isActive !== false);
  const hasPrimary = activeRows.some((row) => row.isPrimary);
  if (hasPrimary) return rows;
  const firstActiveId = activeRows[0]?.id;
  return rows.map((row) => ({
    ...row,
    isPrimary: row.id === firstActiveId
  }));
}

function ensureSinglePrimaryEmail(rows: ClientEmailDraft[]): ClientEmailDraft[] {
  if (!rows.length) return [];
  const activeRows = rows.filter((row) => row.isActive !== false && row.value.trim().length > 0);
  const hasPrimary = activeRows.some((row) => row.isPrimary);
  if (hasPrimary) return rows;
  const firstActiveId = activeRows[0]?.id;
  return rows.map((row) => ({
    ...row,
    isPrimary: row.id === firstActiveId
  }));
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function AppleRow({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-2 last:border-b-0 sm:grid-cols-[148px_1fr] sm:items-center">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div>{children}</div>
    </div>
  );
}

function UsageToggle({
  active,
  onClick,
  disabled,
  label
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
        active
          ? "border-[#4aa59c] bg-[#4aa59c]/12 text-[#2e75ba]"
          : "border-slate-200 bg-white text-slate-600 hover:border-[#4aadf5]/50",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      {label}
    </button>
  );
}

export default function ClientContactsEditor({
  value,
  onChange,
  preferredGeoCountryId,
  disabled,
  className,
  requirePhone = true,
  showExtendedPhoneFields = false,
  title = "Contactos",
  subtitle = "Teléfonos y correos múltiples con un único principal por tipo.",
  showPhones = true,
  showEmails = true
}: {
  value: ClientContactsDraft;
  onChange: (next: ClientContactsDraft) => void;
  preferredGeoCountryId?: string | null;
  disabled?: boolean;
  className?: string;
  requirePhone?: boolean;
  showExtendedPhoneFields?: boolean;
  title?: string;
  subtitle?: string;
  showPhones?: boolean;
  showEmails?: boolean;
}) {
  function updatePhones(nextPhones: ClientPhoneDraft[]) {
    onChange({
      ...value,
      phones: ensureSinglePrimaryPhone(nextPhones)
    });
  }

  function updateEmails(nextEmails: ClientEmailDraft[]) {
    onChange({
      ...value,
      emails: ensureSinglePrimaryEmail(nextEmails)
    });
  }

  function setPhoneMeta(index: number, meta: PhoneInputMeta) {
    if (!meta.selectedIso2) return;
    const next = [...value.phones];
    next[index] = {
      ...next[index],
      countryIso2: meta.selectedIso2
    };
    updatePhones(next);
  }

  function setPhonePrimary(targetId: string) {
    updatePhones(
      value.phones.map((row) => ({
        ...row,
        isPrimary: row.id === targetId
      }))
    );
  }

  function setEmailPrimary(targetId: string) {
    updateEmails(
      value.emails.map((row) => ({
        ...row,
        isPrimary: row.id === targetId
      }))
    );
  }

  const primaryPhoneMissing = requirePhone && !value.phones.some((row) => row.isActive && row.isPrimary && row.value.trim());

  return (
    <section className={cn("space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm", className)}>
      {(title || subtitle) && (
        <div>
          {title ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">{title}</p> : null}
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
      )}

      {showPhones ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Teléfonos ({value.phones.length})</p>
            <button
              type="button"
              onClick={() => {
                updatePhones([
                  ...value.phones,
                  {
                    id: randomId("phone"),
                    category: ClientPhoneCategory.MOBILE,
                    relationType: ClientPhoneRelationType.TITULAR,
                    value: "",
                    countryIso2: "",
                    canCall: true,
                    canWhatsapp: false,
                    isPrimary: value.phones.length === 0,
                    isActive: true
                  }
                ]);
              }}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-lg border border-[#4aa59c]/30 bg-[#4aa59c]/10 px-3 py-1.5 text-xs font-semibold text-[#2e75ba] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusCircle size={14} />
              Agregar teléfono
            </button>
          </div>

          {value.phones.map((row, index) => (
            <article key={row.id} className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-600">Teléfono #{index + 1}</p>
                <button
                  type="button"
                  onClick={() => {
                    const next = value.phones.filter((_, itemIndex) => itemIndex !== index);
                    updatePhones(next);
                  }}
                  disabled={disabled || value.phones.length <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={13} />
                  Quitar
                </button>
              </div>

              <AppleRow label="Categoría">
                <select
                  value={row.category}
                  onChange={(event) => {
                    const next = [...value.phones];
                    next[index] = { ...row, category: event.target.value as ClientPhoneCategory };
                    updatePhones(next);
                  }}
                  disabled={disabled}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  {PHONE_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </AppleRow>

              {showExtendedPhoneFields ? (
                <AppleRow label="Relación">
                  <select
                    value={row.relationType ?? ClientPhoneRelationType.TITULAR}
                    onChange={(event) => {
                      const next = [...value.phones];
                      next[index] = { ...row, relationType: event.target.value as ClientPhoneRelationType };
                      updatePhones(next);
                    }}
                    disabled={disabled}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    {PHONE_RELATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </AppleRow>
              ) : null}

              <AppleRow label="Número">
                <PhoneInput
                  label=""
                  value={row.value}
                  preferredGeoCountryId={preferredGeoCountryId ?? null}
                  localOnly
                  onChange={(nextValue, meta) => {
                    const next = [...value.phones];
                    next[index] = { ...row, value: nextValue };
                    updatePhones(next);
                    setPhoneMeta(index, meta);
                  }}
                  disabled={disabled}
                  placeholder="Solo número local"
                  className="space-y-0"
                />
              </AppleRow>

              {showExtendedPhoneFields ? (
                <AppleRow label="Uso">
                  <div className="flex flex-wrap gap-2">
                    <UsageToggle
                      label="Llamar"
                      active={row.canCall !== false}
                      onClick={() => {
                        const nextCanCall = !(row.canCall !== false);
                        if (!nextCanCall && row.canWhatsapp !== true) return;
                        const next = [...value.phones];
                        next[index] = { ...row, canCall: nextCanCall };
                        updatePhones(next);
                      }}
                      disabled={disabled}
                    />
                    <UsageToggle
                      label="WhatsApp"
                      active={row.canWhatsapp === true}
                      onClick={() => {
                        const nextCanWhatsapp = !(row.canWhatsapp === true);
                        if (!nextCanWhatsapp && row.canCall === false) return;
                        const next = [...value.phones];
                        next[index] = { ...row, canWhatsapp: nextCanWhatsapp };
                        updatePhones(next);
                      }}
                      disabled={disabled}
                    />
                  </div>
                </AppleRow>
              ) : null}

              <AppleRow label="Principal">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="phones-primary"
                    checked={row.isPrimary}
                    onChange={() => setPhonePrimary(row.id)}
                    disabled={disabled || !row.isActive}
                    className="h-4 w-4 border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                  />
                  Principal
                </label>
              </AppleRow>
            </article>
          ))}

          {!value.phones.length ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Sin teléfonos. Agrega al menos uno.
            </p>
          ) : null}
          {primaryPhoneMissing ? <p className="text-xs text-rose-700">Debes definir un teléfono principal válido.</p> : null}
        </div>
      ) : null}

      {showEmails ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Correos ({value.emails.length})</p>
            <button
              type="button"
              onClick={() => {
                updateEmails([
                  ...value.emails,
                  {
                    id: randomId("email"),
                    category: ClientEmailCategory.PRIMARY,
                    value: "",
                    isPrimary: value.emails.length === 0,
                    isActive: true
                  }
                ]);
              }}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-lg border border-[#4aa59c]/30 bg-[#4aa59c]/10 px-3 py-1.5 text-xs font-semibold text-[#2e75ba] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusCircle size={14} />
              Agregar correo
            </button>
          </div>

          {!value.emails.length ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Sin correos registrados. Agrega uno si deseas contacto por email.
            </p>
          ) : null}

          {value.emails.map((row, index) => (
            <article key={row.id} className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-600">Correo #{index + 1}</p>
                <button
                  type="button"
                  onClick={() => {
                    const next = value.emails.filter((_, itemIndex) => itemIndex !== index);
                    updateEmails(next);
                  }}
                  disabled={disabled}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={13} />
                  Quitar
                </button>
              </div>

              <AppleRow label="Categoría">
                <select
                  value={row.category}
                  onChange={(event) => {
                    const next = [...value.emails];
                    next[index] = { ...row, category: event.target.value as ClientEmailCategory };
                    updateEmails(next);
                  }}
                  disabled={disabled}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  {EMAIL_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </AppleRow>

              <AppleRow label="Correo">
                <input
                  value={row.value}
                  onChange={(event) => {
                    const next = [...value.emails];
                    next[index] = { ...row, value: normalizeEmail(event.target.value) };
                    updateEmails(next);
                  }}
                  disabled={disabled}
                  placeholder="correo@dominio.com"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </AppleRow>

              <AppleRow label="Principal">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="emails-primary"
                    checked={row.isPrimary}
                    onChange={() => setEmailPrimary(row.id)}
                    disabled={disabled || !row.value.trim()}
                    className="h-4 w-4 border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
                  />
                  Principal
                </label>
              </AppleRow>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
