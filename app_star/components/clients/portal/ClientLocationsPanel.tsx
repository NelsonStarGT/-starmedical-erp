"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClientLocationType } from "@prisma/client";
import { MapPin, PlusCircle } from "lucide-react";
import { actionAddClientLocation } from "@/app/admin/clientes/actions";
import GeoCascadeFieldset, { type GeoCascadeErrors, type GeoCascadeValue } from "@/components/clients/GeoCascadeFieldset";
import { cn } from "@/lib/utils";

type LocationRow = {
  id: string;
  type: ClientLocationType;
  label: string | null;
  address: string;
  postalCode: string | null;
  city: string | null;
  department: string | null;
  country: string | null;
  isPrimary: boolean;
};

const LOCATION_LABELS: Record<ClientLocationType, string> = {
  GENERAL: "General",
  FISCAL: "Fiscal",
  HOME: "Vivienda",
  WORK: "Trabajo",
  BUSINESS: "Empresa/Institución",
  OTHER: "Otro"
};

export default function ClientLocationsPanel({ clientId, locations }: { clientId: string; locations: LocationRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [geoErrors, setGeoErrors] = useState<GeoCascadeErrors>({});
  const [form, setForm] = useState<{
    type: ClientLocationType;
    label: string;
    address: string;
    geoCountryId: string;
    geoAdmin1Id: string;
    geoAdmin2Id: string;
    geoAdmin3Id: string;
    geoPostalCode: string;
    isPrimary: boolean;
  }>(() => ({
    type: ClientLocationType.GENERAL,
    label: "",
    address: "",
    geoCountryId: "",
    geoAdmin1Id: "",
    geoAdmin2Id: "",
    geoAdmin3Id: "",
    geoPostalCode: "",
    isPrimary: false
  }));

  const canSubmit = useMemo(() => Boolean(form.address.trim()), [form.address]);

  const geoValue: GeoCascadeValue = {
    geoCountryId: form.geoCountryId,
    geoAdmin1Id: form.geoAdmin1Id,
    geoAdmin2Id: form.geoAdmin2Id,
    geoAdmin3Id: form.geoAdmin3Id,
    geoPostalCode: form.geoPostalCode
  };

  const submit = () => {
    if (!canSubmit) return;
    const trimmedPostal = form.geoPostalCode.trim();
    if (form.type === ClientLocationType.FISCAL && !form.geoCountryId) {
      setGeoErrors((prev) => ({ ...prev, geoCountryId: "País requerido para ubicación fiscal." }));
      setError("La ubicación fiscal requiere país y código postal.");
      return;
    }
    if (form.type === ClientLocationType.FISCAL && !trimmedPostal) {
      setGeoErrors((prev) => ({ ...prev, geoPostalCode: "Código postal requerido para ubicación fiscal." }));
      setError("La ubicación fiscal requiere código postal.");
      return;
    }

    if (form.isPrimary && !trimmedPostal && form.type !== ClientLocationType.FISCAL) {
      setWarning("Recomendación: agrega código postal para la ubicación principal.");
    } else {
      setWarning(null);
    }

    startTransition(async () => {
      try {
        await actionAddClientLocation({
          clientId,
          type: form.type,
          label: form.label,
          address: form.address,
          geoCountryId: form.geoCountryId || undefined,
          geoAdmin1Id: form.geoAdmin1Id || undefined,
          geoAdmin2Id: form.geoAdmin2Id || undefined,
          geoAdmin3Id: form.geoAdmin3Id || undefined,
          postalCode: trimmedPostal || undefined,
          isPrimary: form.isPrimary
        });
        setForm({
          type: ClientLocationType.GENERAL,
          label: "",
          address: "",
          geoCountryId: "",
          geoAdmin1Id: "",
          geoAdmin2Id: "",
          geoAdmin3Id: "",
          geoPostalCode: "",
          isPrimary: false
        });
        setGeoErrors({});
        setError(null);
        setWarning(null);
        router.refresh();
      } catch (err) {
        const message = (err as Error)?.message || "No se pudo agregar la ubicación.";
        setError(message);
        if (message.toLowerCase().includes("país")) {
          setGeoErrors((prev) => ({ ...prev, geoCountryId: message }));
        }
        if (message.toLowerCase().includes("postal")) {
          setGeoErrors((prev) => ({ ...prev, geoPostalCode: message }));
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Ubicaciones</p>

        {locations.length ? (
          <div className="mt-4 space-y-2">
            {locations.map((loc) => (
              <div key={loc.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <MapPin size={16} className="text-diagnostics-secondary" />
                    {LOCATION_LABELS[loc.type]}
                    {loc.label ? ` · ${loc.label}` : ""}
                  </p>
                  {loc.isPrimary && (
                    <span className="rounded-full border border-diagnostics-secondary/30 bg-diagnostics-background px-3 py-1 text-xs font-semibold text-diagnostics-corporate">
                      Principal
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-700">{loc.address}</p>
                <p className="mt-1 text-xs text-slate-500">{[loc.city, loc.department, loc.country].filter(Boolean).join(", ") || "—"}</p>
                {loc.postalCode ? <p className="mt-1 text-xs text-slate-500">CP: {loc.postalCode}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-diagnostics-background px-4 py-3 text-sm text-slate-700">
            No hay ubicaciones guardadas todavía.
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Agregar ubicación</p>
        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as ClientLocationType }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          >
            {Object.values(ClientLocationType).map((value) => (
              <option key={value} value={value}>
                {LOCATION_LABELS[value]}
              </option>
            ))}
          </select>
          <input
            value={form.label}
            onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
            placeholder="Etiqueta (opcional)"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          />
          <input
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            placeholder="Dirección *"
            className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          />
        </div>

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
          disabled={isPending}
          errors={geoErrors}
          subtitle="País → Departamento → Municipio"
        />

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.isPrimary}
            onChange={(e) => setForm((prev) => ({ ...prev, isPrimary: e.target.checked }))}
          />
          Marcar como principal
        </label>

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || isPending}
          className={cn(
            "inline-flex items-center gap-2 rounded-full bg-diagnostics-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-diagnostics-primary/90",
            (!canSubmit || isPending) && "cursor-not-allowed opacity-60 hover:bg-diagnostics-primary"
          )}
        >
          <PlusCircle size={16} />
          Agregar ubicación
        </button>

        {warning && <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">{warning}</div>}
        {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      </section>
    </div>
  );
}
