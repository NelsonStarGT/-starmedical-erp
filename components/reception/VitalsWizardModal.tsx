"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Activity } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { actionSaveReceptionAppointmentVitals, actionSaveReceptionVisitVitals } from "@/app/admin/reception/actions";
import { cn } from "@/lib/utils";

type Mode = "visit" | "appointment";

type VitalsTarget = {
  mode: Mode;
  visitId?: string | null;
  appointmentId?: string | null;
  siteId?: string | null;
  patientLabel?: string | null;
  ticketCode?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  target: VitalsTarget | null;
  required?: boolean;
  autoCloseOnSave?: boolean;
  onSaved?: () => void | Promise<void>;
};

type VitalsForm = {
  systolicBp: string;
  diastolicBp: string;
  heartRate: string;
  temperatureC: string;
  weightKg: string;
  heightCm: string;
  observations: string;
};

const DEFAULT_FORM: VitalsForm = {
  systolicBp: "",
  diastolicBp: "",
  heartRate: "",
  temperatureC: "",
  weightKg: "",
  heightCm: "",
  observations: ""
};

function fieldClasses(disabled = false) {
  return cn(
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm",
    "focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30",
    disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
  );
}

export default function VitalsWizardModal({
  open,
  onClose,
  target,
  required = false,
  autoCloseOnSave = false,
  onSaved
}: Props) {
  const [form, setForm] = useState<VitalsForm>(DEFAULT_FORM);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setForm(DEFAULT_FORM);
    setSaved(false);
    setError(null);
    setSuccess(null);
  }, [open, target?.appointmentId, target?.visitId]);

  const title = useMemo(() => {
    if (target?.mode === "appointment") return "Signos vitales de cita";
    return "Signos vitales de admisión";
  }, [target?.mode]);

  const subtitle = useMemo(() => {
    if (!target) return "Recepción";
    const context = [target.ticketCode, target.patientLabel].filter(Boolean).join(" · ");
    return context || "Recepción";
  }, [target]);

  const guardClose = () => {
    if (required && !saved) {
      setError("Debes guardar signos vitales para completar este flujo.");
      return;
    }
    onClose();
  };

  const saveVitals = () => {
    if (!target) {
      setError("No hay contexto para guardar signos vitales.");
      return;
    }

    const systolicBp = Number(form.systolicBp);
    const diastolicBp = Number(form.diastolicBp);
    if (!Number.isFinite(systolicBp) || !Number.isFinite(diastolicBp)) {
      setError("PA sistólica y diastólica son obligatorias.");
      return;
    }

    startTransition(async () => {
      try {
        if (target.mode === "appointment") {
          if (!target.appointmentId) throw new Error("Cita requerida para guardar signos.");
          await actionSaveReceptionAppointmentVitals({
            appointmentId: target.appointmentId,
            siteId: target.siteId ?? undefined,
            systolicBp,
            diastolicBp,
            heartRate: form.heartRate ? Number(form.heartRate) : null,
            temperatureC: form.temperatureC ? Number(form.temperatureC) : null,
            weightKg: form.weightKg ? Number(form.weightKg) : null,
            heightCm: form.heightCm ? Number(form.heightCm) : null,
            observations: form.observations.trim() || null
          });
        } else {
          if (!target.visitId) throw new Error("Visita requerida para guardar signos.");
          await actionSaveReceptionVisitVitals({
            visitId: target.visitId,
            siteId: target.siteId ?? undefined,
            systolicBp,
            diastolicBp,
            heartRate: form.heartRate ? Number(form.heartRate) : null,
            temperatureC: form.temperatureC ? Number(form.temperatureC) : null,
            weightKg: form.weightKg ? Number(form.weightKg) : null,
            heightCm: form.heightCm ? Number(form.heightCm) : null,
            observations: form.observations.trim() || null
          });
        }

        setSaved(true);
        setSuccess("Signos vitales guardados correctamente.");
        setError(null);
        if (onSaved) await onSaved();
        if (autoCloseOnSave) onClose();
      } catch (err) {
        setError((err as Error)?.message || "No se pudieron guardar signos vitales.");
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={guardClose}
      title={title}
      subtitle={subtitle}
      className="max-w-3xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            {required && !saved ? "Paso obligatorio para continuar." : "Puedes cerrar cuando termines."}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={guardClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={saveVitals}
              disabled={isPending}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg bg-[#2e75ba] px-4 py-2 text-sm font-semibold text-white shadow-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c] focus-visible:ring-offset-2",
                isPending && "opacity-60"
              )}
            >
              <Activity size={15} /> Guardar signos
            </button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500">PA sistólica *</label>
          <input
            type="number"
            value={form.systolicBp}
            onChange={(e) => setForm((prev) => ({ ...prev, systolicBp: e.target.value }))}
            className={fieldClasses(isPending)}
            placeholder="120"
            aria-label="Presión arterial sistólica"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500">PA diastólica *</label>
          <input
            type="number"
            value={form.diastolicBp}
            onChange={(e) => setForm((prev) => ({ ...prev, diastolicBp: e.target.value }))}
            className={fieldClasses(isPending)}
            placeholder="80"
            aria-label="Presión arterial diastólica"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500">FC</label>
          <input
            type="number"
            value={form.heartRate}
            onChange={(e) => setForm((prev) => ({ ...prev, heartRate: e.target.value }))}
            className={fieldClasses(isPending)}
            placeholder="72"
            aria-label="Frecuencia cardíaca"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500">Temp (°C)</label>
          <input
            type="number"
            step="0.1"
            value={form.temperatureC}
            onChange={(e) => setForm((prev) => ({ ...prev, temperatureC: e.target.value }))}
            className={fieldClasses(isPending)}
            placeholder="36.8"
            aria-label="Temperatura"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500">Peso (kg)</label>
          <input
            type="number"
            step="0.1"
            value={form.weightKg}
            onChange={(e) => setForm((prev) => ({ ...prev, weightKg: e.target.value }))}
            className={fieldClasses(isPending)}
            placeholder="70.5"
            aria-label="Peso"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500">Talla (cm)</label>
          <input
            type="number"
            step="0.1"
            value={form.heightCm}
            onChange={(e) => setForm((prev) => ({ ...prev, heightCm: e.target.value }))}
            className={fieldClasses(isPending)}
            placeholder="170"
            aria-label="Talla"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-semibold text-slate-500">Observaciones</label>
          <textarea
            value={form.observations}
            onChange={(e) => setForm((prev) => ({ ...prev, observations: e.target.value }))}
            className={cn(fieldClasses(isPending), "min-h-[90px]")}
            placeholder="Observaciones iniciales de recepción"
            aria-label="Observaciones"
          />
        </div>
      </div>

      {success ? (
        <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>
      ) : null}
      {error ? <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
    </Modal>
  );
}
