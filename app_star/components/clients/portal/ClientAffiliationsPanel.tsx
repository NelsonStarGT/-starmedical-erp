"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClientAffiliationPayerType, ClientAffiliationStatus, ClientProfileType } from "@prisma/client";
import { PlusCircle, Save, Trash2 } from "lucide-react";
import {
  actionAddClientAffiliation,
  actionDeleteClientAffiliation,
  actionUpdateClientAffiliation
} from "@/app/admin/clientes/actions";
import { ClientProfileLookup } from "@/components/clients/ClientProfileLookup";
import { CLIENT_TYPE_LABELS } from "@/lib/clients/constants";
import { cn } from "@/lib/utils";

export type ClientAffiliationRow = {
  id: string;
  entityId: string;
  entityType: ClientProfileType;
  entityLabel: string;
  role: string | null;
  status: ClientAffiliationStatus;
  payerType: ClientAffiliationPayerType;
  payerClientId: string | null;
  payerLabel: string | null;
  isPrimaryPayer: boolean;
};

type AddAffiliationState = {
  entityType: ClientProfileType;
  entityClientId: string;
  entityLabel: string;
  role: string;
  status: ClientAffiliationStatus;
  payerType: ClientAffiliationPayerType;
  payerClientId: string;
  payerLabel: string;
  isPrimaryPayer: boolean;
};

const ENTITY_TYPE_OPTIONS: Array<{ value: ClientProfileType; label: string }> = [
  { value: ClientProfileType.COMPANY, label: "Empresa" },
  { value: ClientProfileType.INSTITUTION, label: "Institución" },
  { value: ClientProfileType.INSURER, label: "Aseguradora" }
];

const PAYER_TYPE_OPTIONS: Array<{ value: ClientAffiliationPayerType; label: string }> = [
  { value: ClientAffiliationPayerType.PERSON, label: "Persona" },
  { value: ClientAffiliationPayerType.COMPANY, label: "Empresa" },
  { value: ClientAffiliationPayerType.INSTITUTION, label: "Institución" },
  { value: ClientAffiliationPayerType.INSURER, label: "Aseguradora" }
];

function payerTypeToClientProfileType(payerType: ClientAffiliationPayerType): ClientProfileType | null {
  if (payerType === ClientAffiliationPayerType.PERSON) return null;
  if (payerType === ClientAffiliationPayerType.COMPANY) return ClientProfileType.COMPANY;
  if (payerType === ClientAffiliationPayerType.INSTITUTION) return ClientProfileType.INSTITUTION;
  if (payerType === ClientAffiliationPayerType.INSURER) return ClientProfileType.INSURER;
  return null;
}

function buildEmptyAffiliationState(): AddAffiliationState {
  return {
    entityType: ClientProfileType.COMPANY,
    entityClientId: "",
    entityLabel: "",
    role: "",
    status: ClientAffiliationStatus.ACTIVE,
    payerType: ClientAffiliationPayerType.PERSON,
    payerClientId: "",
    payerLabel: "",
    isPrimaryPayer: false
  };
}

export default function ClientAffiliationsPanel({
  clientId,
  affiliations
}: {
  clientId: string;
  affiliations: ClientAffiliationRow[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">Afiliaciones</p>

        {affiliations.length ? (
          <div className="space-y-2">
            {affiliations.map((row) => (
              <AffiliationRow key={row.id} clientId={clientId} row={row} onChanged={() => router.refresh()} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-diagnostics-background px-4 py-3 text-sm text-slate-700">
            No hay afiliaciones registradas. Agrega la primera abajo.
          </div>
        )}
      </section>

      <AddAffiliationForm clientId={clientId} onCreated={() => router.refresh()} />
    </div>
  );
}

function AffiliationRow({ clientId, row, onChanged }: { clientId: string; row: ClientAffiliationRow; onChanged: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(() => ({
    role: row.role ?? "",
    status: row.status,
    payerType: row.payerType,
    payerClientId: row.payerClientId ?? "",
    payerLabel: row.payerLabel ?? "",
    isPrimaryPayer: row.isPrimaryPayer
  }));

  const statusBadgeTone = row.status === ClientAffiliationStatus.ACTIVE ? "ok" : "muted";

  const canSave = useMemo(() => !isPending, [isPending]);

  const submit = () => {
    startTransition(async () => {
      try {
        await actionUpdateClientAffiliation({
          affiliationId: row.id,
          personClientId: clientId,
          role: form.role,
          status: form.status,
          payerType: form.payerType,
          payerClientId: form.payerType === ClientAffiliationPayerType.PERSON ? undefined : form.payerClientId || undefined,
          isPrimaryPayer: form.status === ClientAffiliationStatus.ACTIVE ? form.isPrimaryPayer : false
        });
        setError(null);
        onChanged();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo guardar la afiliación.");
      }
    });
  };

  const remove = () => {
    startTransition(async () => {
      try {
        await actionDeleteClientAffiliation({ affiliationId: row.id, personClientId: clientId });
        setError(null);
        onChanged();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo eliminar la afiliación.");
      }
    });
  };

  return (
    <details className="group rounded-xl border border-slate-200 bg-white p-4">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-semibold text-slate-900">{row.entityLabel}</p>
          <p className="text-xs text-slate-500">
            {CLIENT_TYPE_LABELS[row.entityType]} {row.role ? `· ${row.role}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              statusBadgeTone === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
            )}
          >
            {row.status === ClientAffiliationStatus.ACTIVE ? "Activa" : "Inactiva"}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            Responsable de pago:{" "}
            {row.payerType === ClientAffiliationPayerType.PERSON
              ? "Persona"
              : row.payerLabel
                ? row.payerLabel
                : row.entityLabel}
          </span>
          {row.status === ClientAffiliationStatus.ACTIVE && row.isPrimaryPayer && (
            <span className="rounded-full border border-[#4aadf5]/50 bg-[#4aadf5]/10 px-3 py-1 text-xs font-semibold text-[#2e75ba]">
              Responsable principal
            </span>
          )}
          <span className="text-slate-400 transition group-open:rotate-180">⌄</span>
        </div>
      </summary>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          value={form.role}
          onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
          placeholder="Rol (opcional) · ej. Empleado, Paciente corporativo…"
          className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
        />

        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500">Estado</p>
          <select
            value={form.status}
            onChange={(e) =>
              setForm((prev) => {
                const nextStatus = e.target.value as ClientAffiliationStatus;
                return {
                  ...prev,
                  status: nextStatus,
                  isPrimaryPayer: nextStatus === ClientAffiliationStatus.ACTIVE ? prev.isPrimaryPayer : false
                };
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          >
            <option value={ClientAffiliationStatus.ACTIVE}>Activa</option>
            <option value={ClientAffiliationStatus.INACTIVE}>Inactiva</option>
          </select>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500">Responsable de pago</p>
          <select
            value={form.payerType}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                payerType: e.target.value as ClientAffiliationPayerType,
                payerClientId: "",
                payerLabel: ""
              }))
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          >
            {PAYER_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {form.payerType !== ClientAffiliationPayerType.PERSON && (
          <div className="md:col-span-2">
            {(() => {
              const payerProfileType = payerTypeToClientProfileType(form.payerType);
              if (!payerProfileType) return null;
              return (
                <ClientProfileLookup
                  label="Selecciona Responsable de pago"
                  types={[payerProfileType]}
                  value={form.payerClientId ? { id: form.payerClientId, type: payerProfileType, label: form.payerLabel } : null}
                  onChange={(item) =>
                    setForm((prev) => ({
                      ...prev,
                      payerClientId: item?.id ?? "",
                      payerLabel: item?.label ?? ""
                    }))
                  }
                  disabled={isPending}
                />
              );
            })()}
          </div>
        )}

        <label className="md:col-span-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.isPrimaryPayer}
            disabled={isPending || form.status !== ClientAffiliationStatus.ACTIVE}
            onChange={(e) => setForm((prev) => ({ ...prev, isPrimaryPayer: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aadf5]"
          />
          Responsable de pago principal
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!canSave}
          className={cn(
            "inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4aadf5]",
            !canSave && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
          )}
        >
          <Save size={16} />
          Guardar
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={isPending}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:border-rose-300",
            isPending && "cursor-not-allowed opacity-60"
          )}
        >
          <Trash2 size={16} />
          Eliminar
        </button>
      </div>

      {error && <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
    </details>
  );
}

function AddAffiliationForm({ clientId, onCreated }: { clientId: string; onCreated: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<AddAffiliationState>(() => buildEmptyAffiliationState());

  const canSubmit = useMemo(() => Boolean(form.entityClientId && (!isPending)), [form.entityClientId, isPending]);

  const submit = () => {
    if (!canSubmit) return;
    startTransition(async () => {
      try {
        await actionAddClientAffiliation({
          personClientId: clientId,
          entityType: form.entityType,
          entityClientId: form.entityClientId,
          role: form.role,
          status: form.status,
          payerType: form.payerType,
          payerClientId: form.payerType === ClientAffiliationPayerType.PERSON ? undefined : form.payerClientId || undefined,
          isPrimaryPayer: form.status === ClientAffiliationStatus.ACTIVE ? form.isPrimaryPayer : false
        });
        setForm(buildEmptyAffiliationState());
        setError(null);
        router.refresh();
        onCreated();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo agregar la afiliación.");
      }
    });
  };

  return (
    <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">Agregar afiliación</p>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500">Tipo de entidad</p>
          <select
            value={form.entityType}
            onChange={(e) => {
              const nextType = e.target.value as ClientProfileType;
              setForm((prev) => ({
                ...prev,
                entityType: nextType,
                entityClientId: "",
                entityLabel: "",
                payerClientId: "",
                payerLabel: ""
              }));
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          >
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-1">
          <ClientProfileLookup
            label="Entidad afiliada"
            types={[form.entityType]}
            value={form.entityClientId ? { id: form.entityClientId, type: form.entityType, label: form.entityLabel } : null}
            onChange={(item) => {
              if (!item) {
                setForm((prev) => ({ ...prev, entityClientId: "", entityLabel: "" }));
                return;
              }
              setForm((prev) => ({
                ...prev,
                entityClientId: item.id,
                entityLabel: item.label,
                payerClientId: payerTypeToClientProfileType(prev.payerType) === item.type ? item.id : prev.payerClientId,
                payerLabel: payerTypeToClientProfileType(prev.payerType) === item.type ? item.label : prev.payerLabel
              }));
            }}
            disabled={isPending}
          />
        </div>

        <input
          value={form.role}
          onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
          placeholder="Rol (opcional)"
          className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
        />

        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500">Estado</p>
          <select
            value={form.status}
            onChange={(e) =>
              setForm((prev) => {
                const nextStatus = e.target.value as ClientAffiliationStatus;
                return {
                  ...prev,
                  status: nextStatus,
                  isPrimaryPayer: nextStatus === ClientAffiliationStatus.ACTIVE ? prev.isPrimaryPayer : false
                };
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          >
            <option value={ClientAffiliationStatus.ACTIVE}>Activa</option>
            <option value={ClientAffiliationStatus.INACTIVE}>Inactiva</option>
          </select>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500">Responsable de pago</p>
          <select
            value={form.payerType}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                payerType: e.target.value as ClientAffiliationPayerType,
                payerClientId: "",
                payerLabel: ""
              }))
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          >
            {PAYER_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {form.payerType !== ClientAffiliationPayerType.PERSON && (
          <div className="md:col-span-2">
            {(() => {
              const payerProfileType = payerTypeToClientProfileType(form.payerType);
              if (!payerProfileType) return null;
              return (
                <ClientProfileLookup
                  label="Selecciona Responsable de pago"
                  types={[payerProfileType]}
                  value={form.payerClientId ? { id: form.payerClientId, type: payerProfileType, label: form.payerLabel } : null}
                  onChange={(item) =>
                    setForm((prev) => ({
                      ...prev,
                      payerClientId: item?.id ?? "",
                      payerLabel: item?.label ?? ""
                    }))
                  }
                  disabled={isPending}
                />
              );
            })()}
          </div>
        )}

        <label className="md:col-span-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.isPrimaryPayer}
            disabled={isPending || form.status !== ClientAffiliationStatus.ACTIVE}
            onChange={(e) => setForm((prev) => ({ ...prev, isPrimaryPayer: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aadf5]"
          />
          Responsable de pago principal
        </label>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit || isPending}
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4aadf5]",
          (!canSubmit || isPending) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
        )}
      >
        <PlusCircle size={16} />
        Agregar afiliación
      </button>

      {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
    </section>
  );
}
