"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type AppointmentTypeOption = {
  id: string;
  name: string;
  durationMin: number;
};

type BranchOption = {
  id: string;
  name: string;
};

type AvailabilityStatus = "GREEN" | "YELLOW" | "RED";

type AvailabilityPayload = {
  slots: Array<{
    startISO: string;
    endISO: string;
    status: AvailabilityStatus;
    remainingPercent: number;
    isOccupied: boolean;
  }>;
  daySummary: {
    totalSlots: number;
    occupiedSlots: number;
    remainingSlots: number;
    status: AvailabilityStatus;
  };
  rules: {
    slotMinutes: number;
    startHour: number;
    endHour: number;
  };
};

const DAY_OPTIONS_COUNT = 7;

function toDateKey(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const year = copy.getFullYear();
  const month = String(copy.getMonth() + 1).padStart(2, "0");
  const day = String(copy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDateOptions(count: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    return toDateKey(date);
  });
}

function toDateFromKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function formatDatePill(dateKey: string) {
  const date = toDateFromKey(dateKey);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString("es-GT", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  });
}

function formatTimeRange(startISO: string, endISO: string) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Horario";
  return `${start.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("es-GT", {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

function statusLabel(status: AvailabilityStatus) {
  if (status === "GREEN") return "Disponible";
  if (status === "YELLOW") return "Pocos espacios";
  return "Sin cupo";
}

function dayStatusBadgeClasses(status: AvailabilityStatus) {
  if (status === "GREEN") return "border-[#cde7e4] bg-[#eff8f7] text-[#1f6f68]";
  if (status === "YELLOW") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-red-200 bg-red-50 text-red-700";
}

function slotClasses(status: AvailabilityStatus, selected: boolean) {
  const selectedRing = selected ? "ring-2 ring-[#2e75ba] ring-offset-1" : "";
  if (status === "GREEN") {
    return `border-[#b8e1dc] bg-[#eff8f7] text-[#1f6f68] hover:bg-[#e1f3f1] ${selectedRing}`;
  }
  if (status === "YELLOW") {
    return `border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 ${selectedRing}`;
  }
  return "cursor-not-allowed border-red-200 bg-red-50 text-red-700 opacity-80";
}

function AvailabilityLegend() {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className="inline-flex items-center rounded-full border border-[#cde7e4] bg-[#eff8f7] px-3 py-1 text-[#1f6f68]">
        Verde: Disponible
      </span>
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">
        Amarillo: Pocos espacios
      </span>
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-700">
        Rojo: Sin cupo
      </span>
    </div>
  );
}

function AvailabilitySkeleton() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, index) => (
        <div
          key={`skeleton-slot-${index + 1}`}
          className="h-14 animate-pulse rounded-xl border border-[#e2ebf8] bg-[#f3f7fd]"
        />
      ))}
    </div>
  );
}

function usePortalAvailability(input: {
  typeId: string;
  branchId: string;
  dateKey: string;
  enabled: boolean;
}) {
  const [data, setData] = useState<AvailabilityPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input.enabled || !input.typeId || !input.branchId || !input.dateKey) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      typeId: input.typeId,
      branchId: input.branchId,
      date: input.dateKey
    });

    setLoading(true);
    setError(null);

    fetch(`/portal/api/appointments/availability?${params.toString()}`, {
      method: "GET",
      signal: controller.signal
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; data?: AvailabilityPayload } | null;
        if (!response.ok || !payload?.ok || !payload.data) {
          throw new Error(payload?.error || "No se pudo consultar disponibilidad.");
        }
        setData(payload.data);
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(cause instanceof Error ? cause.message : "No se pudo consultar disponibilidad.");
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
      });

    return () => controller.abort();
  }, [input.branchId, input.dateKey, input.enabled, input.typeId]);

  return { data, loading, error };
}

function AvailabilityBlock({
  title,
  helperText,
  dateOptions,
  selectedDate,
  onChangeDate,
  selectedSlotISO,
  onSelectSlotISO,
  availability,
  loading,
  error
}: {
  title: string;
  helperText: string;
  dateOptions: string[];
  selectedDate: string;
  onChangeDate: (dateKey: string) => void;
  selectedSlotISO: string;
  onSelectSlotISO: (slotISO: string) => void;
  availability: AvailabilityPayload | null;
  loading: boolean;
  error: string | null;
}) {
  const selectableSlots = (availability?.slots || []).filter((slot) => slot.status !== "RED");

  return (
    <div className="space-y-4 rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">{title}</p>
          <p className="mt-1 text-sm text-slate-600">{helperText}</p>
        </div>
        {availability?.daySummary ? (
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${dayStatusBadgeClasses(availability.daySummary.status)}`}
          >
            {statusLabel(availability.daySummary.status)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {dateOptions.map((option) => {
          const selected = option === selectedDate;
          return (
            <button
              key={`${title}-${option}`}
              type="button"
              onClick={() => onChangeDate(option)}
              className={
                selected
                  ? "rounded-xl border border-[#2e75ba] bg-[#eaf3ff] px-3 py-2 text-sm font-semibold text-[#2e75ba]"
                  : "rounded-xl border border-[#d7e6f8] bg-[#f8fbff] px-3 py-2 text-sm font-medium text-slate-700 hover:border-[#4aadf5]"
              }
            >
              {formatDatePill(option)}
            </button>
          );
        })}
      </div>

      {availability?.daySummary ? (
        <p className="text-xs text-slate-600">
          Espacios: <span className="font-semibold text-slate-900">{availability.daySummary.remainingSlots}</span> disponibles de{" "}
          <span className="font-semibold text-slate-900">{availability.daySummary.totalSlots}</span>.
        </p>
      ) : null}

      {loading ? (
        <AvailabilitySkeleton />
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : !availability?.slots.length ? (
        <p className="rounded-xl border border-dashed border-[#d7e6f8] bg-[#f8fbff] px-3 py-3 text-sm text-slate-600">
          No hay reglas de horario configuradas para esta fecha.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {availability.slots.map((slot) => {
            const disabled = slot.status === "RED";
            const selected = selectedSlotISO === slot.startISO;
            return (
              <button
                key={`${title}-${slot.startISO}`}
                type="button"
                disabled={disabled}
                onClick={() => onSelectSlotISO(slot.startISO)}
                className={`rounded-xl border px-3 py-2 text-left transition ${slotClasses(slot.status, selected)}`}
              >
                <p className="text-sm font-semibold">{formatTimeRange(slot.startISO, slot.endISO)}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em]">{statusLabel(slot.status)}</p>
              </button>
            );
          })}
        </div>
      )}

      {!loading && availability?.slots.length && selectableSlots.length === 0 ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Sin cupo hoy. Prueba otro día o sede.
        </p>
      ) : null}
    </div>
  );
}

export function PortalAppointmentRequestForm({
  appointmentTypes,
  branches
}: {
  appointmentTypes: AppointmentTypeOption[];
  branches: BranchOption[];
}) {
  const dateOptions = useMemo(() => buildDateOptions(DAY_OPTIONS_COUNT), []);
  const [typeId, setTypeId] = useState(appointmentTypes[0]?.id ?? "");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [primaryDate, setPrimaryDate] = useState(dateOptions[0] ?? "");
  const [primarySlotISO, setPrimarySlotISO] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const primaryAvailability = usePortalAvailability({
    typeId,
    branchId,
    dateKey: primaryDate,
    enabled: Boolean(typeId && branchId && primaryDate)
  });

  useEffect(() => {
    setPrimarySlotISO("");
  }, [primaryDate, typeId, branchId]);

  useEffect(() => {
    if (!primarySlotISO || !primaryAvailability.data) return;
    const selected = primaryAvailability.data.slots.find((slot) => slot.startISO === primarySlotISO);
    if (!selected || selected.status === "RED") {
      setPrimarySlotISO("");
    }
  }, [primaryAvailability.data, primarySlotISO]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    const primarySelection = primaryAvailability.data?.slots.find((slot) => slot.startISO === primarySlotISO);
    if (!primarySlotISO) {
      setError("Selecciona un horario para tu preferencia principal.");
      return;
    }
    if (!primarySelection || primarySelection.status === "RED") {
      setError("El horario principal ya no está disponible. Selecciona otro.");
      return;
    }
    if (!trimmedReason) {
      setError("Describe brevemente el motivo de tu cita.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/portal/api/appointments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeId,
          branchId,
          reason: trimmedReason,
          preferredDate1: primarySlotISO,
          preferredDate2: null
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(payload?.error || "No se pudo enviar la solicitud de cita."));
      }
      setSuccessMessage("Solicitud enviada. Recepción confirmará tu cita en breve.");
      setReason("");
      setPrimarySlotISO("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la solicitud de cita.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Paso 1</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">Tipo de cita y sede</h3>
        <p className="mt-1 text-sm text-slate-600">Selecciona el servicio y la sede para consultar cupos en tiempo real.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Tipo de cita
            <select
              value={typeId}
              onChange={(event) => setTypeId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#d7e6f8] bg-white px-3 py-2 text-sm text-slate-900"
              required
            >
              {appointmentTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.durationMin} min)
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Sede
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#d7e6f8] bg-white px-3 py-2 text-sm text-slate-900"
              required
            >
              {branches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Paso 2 y 3</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Fecha y horario preferido</h3>
          <p className="mt-1 text-sm text-slate-600">Elige tu fecha y horario preferido. Recepción confirmará.</p>
          <div className="mt-3">
            <AvailabilityLegend />
          </div>
        </div>

        <AvailabilityBlock
          title="Preferencia principal"
          helperText="Selecciona la fecha y el horario principal para tu cita."
          dateOptions={dateOptions}
          selectedDate={primaryDate}
          onChangeDate={setPrimaryDate}
          selectedSlotISO={primarySlotISO}
          onSelectSlotISO={setPrimarySlotISO}
          availability={primaryAvailability.data}
          loading={primaryAvailability.loading}
          error={primaryAvailability.error}
        />
      </div>

      <div className="rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Motivo</p>
        <label className="mt-2 block text-sm font-medium text-slate-700">
          Describe brevemente tu motivo de consulta
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            rows={4}
            className="mt-1 w-full rounded-xl border border-[#d7e6f8] bg-white px-3 py-2 text-sm text-slate-900"
            placeholder="Ejemplo: Dolor persistente en espalda baja desde hace 3 días."
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={loading || !primarySlotISO}
        className="inline-flex items-center rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3b8f86] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Enviando solicitud..." : "Solicitar cita"}
      </button>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {successMessage && (
        <p className="rounded-xl border border-[#cde7e4] bg-[#eff8f7] px-3 py-2 text-sm text-[#1f6f68]">{successMessage}</p>
      )}
    </form>
  );
}
