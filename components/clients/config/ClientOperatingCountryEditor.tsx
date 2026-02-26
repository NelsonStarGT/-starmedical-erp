"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { actionUpdateClientsOperatingCountryConfig } from "@/app/admin/clientes/actions";
import CountryPicker, { type CountryPickerOption } from "@/components/clients/CountryPicker";
import {
  normalizeOperatingCountryScopes,
  type OperatingCountryDefaultsSnapshot
} from "@/lib/clients/operatingCountryDefaults";
import { cn } from "@/lib/utils";

export default function ClientOperatingCountryEditor({
  initialConfig,
  countryOptions
}: {
  initialConfig: OperatingCountryDefaultsSnapshot;
  countryOptions: CountryPickerOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [isPinned, setIsPinned] = useState(initialConfig.isOperatingCountryPinned);
  const [operatingCountryId, setOperatingCountryId] = useState(
    initialConfig.operatingCountryId || countryOptions.find((item) => item.code.toUpperCase() === "GT")?.id || countryOptions[0]?.id || ""
  );
  const [scopes, setScopes] = useState(() => normalizeOperatingCountryScopes(initialConfig.scopes));

  const hasChanges = useMemo(() => {
    return (
      isPinned !== initialConfig.isOperatingCountryPinned ||
      operatingCountryId !== (initialConfig.operatingCountryId ?? "") ||
      scopes.phone !== initialConfig.scopes.phone ||
      scopes.identity !== initialConfig.scopes.identity ||
      scopes.residence !== initialConfig.scopes.residence ||
      scopes.geo !== initialConfig.scopes.geo
    );
  }, [initialConfig, isPinned, operatingCountryId, scopes.geo, scopes.identity, scopes.phone, scopes.residence]);

  const canSave = !isPending && hasChanges && (!!operatingCountryId || !isPinned);

  const selectedCountryName = useMemo(() => {
    return countryOptions.find((item) => item.id === operatingCountryId)?.name ?? "Sin país";
  }, [countryOptions, operatingCountryId]);

  const save = () => {
    if (!canSave) return;
    startTransition(async () => {
      try {
        await actionUpdateClientsOperatingCountryConfig({
          isOperatingCountryPinned: isPinned,
          operatingCountryId: operatingCountryId || null,
          operatingCountryDefaultsScopes: scopes
        });
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo guardar configuración de país operativo.");
      }
    });
  };

  return (
    <section className="space-y-3 rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">País operativo</p>
      <h3 className="text-sm font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
        País de operación fijo
      </h3>
      <p className="text-xs text-slate-500">
        Si está activo, preselecciona por defecto país de identidad/residencia, prefijo telefónico y contexto GEO en altas nuevas.
      </p>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-[#f8fafc] p-3 lg:grid-cols-[minmax(220px,320px)_1fr]">
        <CountryPicker
          label="País operativo"
          value={operatingCountryId}
          options={countryOptions}
          disabled={isPending}
          onChange={setOperatingCountryId}
        />

        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(event) => setIsPinned(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aadf5]"
            />
            Fijar país de operación
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <ScopeToggle label="Teléfono" checked={scopes.phone} onChange={(checked) => setScopes((prev) => ({ ...prev, phone: checked }))} />
            <ScopeToggle label="Identidad" checked={scopes.identity} onChange={(checked) => setScopes((prev) => ({ ...prev, identity: checked }))} />
            <ScopeToggle label="Residencia" checked={scopes.residence} onChange={(checked) => setScopes((prev) => ({ ...prev, residence: checked }))} />
            <ScopeToggle label="GEO" checked={scopes.geo} onChange={(checked) => setScopes((prev) => ({ ...prev, geo: checked }))} />
          </div>

          <p className="text-xs text-slate-500">
            Aplicará solo si el campo está vacío. El operador siempre puede cambiar el país por cliente.
          </p>
          <p className="text-xs font-semibold text-[#2e75ba]">Actual: {selectedCountryName}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4aadf5]",
            !canSave && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
          )}
        >
          <Save size={14} />
          Guardar
        </button>
      </div>

      {error ? <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
    </section>
  );
}

function ScopeToggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aadf5]"
      />
      {label}
    </label>
  );
}

