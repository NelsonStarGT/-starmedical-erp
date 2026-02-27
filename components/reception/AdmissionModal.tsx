"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OperationalArea, VisitPriority } from "@prisma/client";
import { Search, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useReceptionBranch } from "@/app/admin/reception/BranchContext";
import { actionCreateAdmission, actionCreatePatient, actionSearchPatients } from "@/app/admin/reception/actions";
import { PRIORITY_LABELS, RECEPTION_AREAS, RECEPTION_AREA_LABELS } from "@/lib/reception/constants";
import { cn } from "@/lib/utils";
import { useAdmissionModal } from "@/components/reception/useAdmissionModal";

type PatientResult = Awaited<ReturnType<typeof actionSearchPatients>>[number];

type QuickPatientForm = {
  firstName: string;
  lastName: string;
  phone: string;
  dpi: string;
  nit: string;
};

const PRIORITY_OPTIONS: VisitPriority[] = ["NORMAL", "PREFERENTIAL", "COMPANY", "URGENT"];
const DEFAULT_QUICK_FORM: QuickPatientForm = { firstName: "", lastName: "", phone: "", dpi: "", nit: "" };

function fieldClasses(disabled = false) {
  return cn(
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm",
    "focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/30",
    disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
  );
}

export default function AdmissionModal() {
  const router = useRouter();
  const { activeBranchId } = useReceptionBranch();
  const { state, closeAdmission } = useAdmissionModal();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickPatient, setQuickPatient] = useState<QuickPatientForm>(DEFAULT_QUICK_FORM);
  const [area, setArea] = useState<OperationalArea>("CONSULTATION");
  const [priority, setPriority] = useState<VisitPriority>("NORMAL");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!state.open) return;
    setQuery(state.initialQuery || "");
    setResults([]);
    setSelectedPatient(null);
    setShowQuickCreate(false);
    setQuickPatient(DEFAULT_QUICK_FORM);
    setArea("CONSULTATION");
    setPriority("NORMAL");
    setNotes("");
    setError(null);
  }, [state.initialQuery, state.open]);

  useEffect(() => {
    if (!state.open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      startTransition(async () => {
        try {
          const found = await actionSearchPatients(q);
          setResults(found);
          setError(null);
        } catch (err) {
          setError((err as Error)?.message || "No se pudo buscar pacientes.");
        }
      });
    }, 350);

    return () => clearTimeout(timeout);
  }, [query, state.open]);

  const selectedPatientLabel = useMemo(() => {
    if (!selectedPatient) return "Sin paciente seleccionado";
    const name = [selectedPatient.firstName, selectedPatient.lastName].filter(Boolean).join(" ") || "Paciente";
    const identity = selectedPatient.clientCode || selectedPatient.dpi || selectedPatient.phone || selectedPatient.nit || "Sin identificador";
    return `${name} · ${identity}`;
  }, [selectedPatient]);

  const canSave = Boolean(activeBranchId && selectedPatient && !isPending);

  const handleCreateQuickPatient = () => {
    const firstName = quickPatient.firstName.trim();
    const phone = quickPatient.phone.trim();
    const dpi = quickPatient.dpi.trim();

    if (!firstName || !phone || !dpi) {
      setError("Nombre, teléfono y DPI son requeridos para crear paciente rápido.");
      return;
    }

    startTransition(async () => {
      try {
        const saved = await actionCreatePatient({
          firstName,
          lastName: quickPatient.lastName.trim() || undefined,
          phone,
          dpi,
          nit: quickPatient.nit.trim() || undefined
        });
        setSelectedPatient(saved);
        setShowQuickCreate(false);
        setQuickPatient(DEFAULT_QUICK_FORM);
        setError(null);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo crear paciente.");
      }
    });
  };

  const handleSaveAdmission = () => {
    if (!activeBranchId) {
      setError("Selecciona una sede activa para guardar la admisión.");
      return;
    }
    if (!selectedPatient?.id) {
      setError("Selecciona un paciente para continuar.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await actionCreateAdmission({
          mode: "existing",
          siteId: activeBranchId,
          patientId: selectedPatient.id,
          area,
          priority,
          notes: notes.trim() || undefined
        });
        closeAdmission();
        router.push(`/admin/reception/visit/${result.visitId}`);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo registrar la admisión.");
      }
    });
  };

  return (
    <Modal
      open={state.open}
      onClose={closeAdmission}
      title="Admisión rápida"
      subtitle="Recepción V2"
      className="max-w-5xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Origen: <span className="font-semibold text-[#2e75ba]">{state.source}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeAdmission}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSaveAdmission}
              disabled={!canSave}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition",
                canSave ? "bg-[#4aa59c] hover:bg-[#3f988f]" : "cursor-not-allowed bg-slate-300 text-slate-600"
              )}
            >
              Guardar admisión
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {!activeBranchId && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Selecciona una sede activa en el encabezado para continuar.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-3 rounded-xl border border-[#dce7f5] bg-[#f8fafc] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Paciente</p>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por código, nombre, DPI o teléfono"
                className={cn(fieldClasses(isPending), "pl-9")}
                aria-label="Buscar paciente por código, nombre, DPI o teléfono"
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              Seleccionado: <span className="font-semibold text-slate-800">{selectedPatientLabel}</span>
            </div>

            <div className="max-h-64 space-y-2 overflow-auto">
              {results.map((patient) => {
                const active = selectedPatient?.id === patient.id;
                const name = [patient.firstName, patient.lastName].filter(Boolean).join(" ") || "Paciente";
                const meta = patient.clientCode || patient.dpi || patient.phone || patient.nit || "Sin identificador";
                return (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatient(patient);
                      setError(null);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition",
                      active
                        ? "border-[#2e75ba] bg-[#4aadf5]/10 text-[#2e75ba]"
                        : "border-slate-200 bg-white hover:border-[#4aadf5]"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-800">{name}</span>
                      <span className="block truncate text-xs text-slate-500">{meta}</span>
                    </span>
                    {active && <span className="text-xs font-semibold text-[#2e75ba]">Activo</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowQuickCreate((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
              >
                <UserPlus size={14} />
                Crear paciente rápido
              </button>
              <span className="text-xs text-slate-500">Usa este flujo si la búsqueda no devuelve resultados.</span>
            </div>

            {showQuickCreate && (
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-2">
                <input
                  value={quickPatient.firstName}
                  onChange={(e) => setQuickPatient((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Nombre(s) *"
                  className={fieldClasses(isPending)}
                />
                <input
                  value={quickPatient.lastName}
                  onChange={(e) => setQuickPatient((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Apellido(s)"
                  className={fieldClasses(isPending)}
                />
                <input
                  value={quickPatient.phone}
                  onChange={(e) => setQuickPatient((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Teléfono *"
                  className={fieldClasses(isPending)}
                />
                <input
                  value={quickPatient.dpi}
                  onChange={(e) => setQuickPatient((prev) => ({ ...prev, dpi: e.target.value }))}
                  placeholder="DPI *"
                  className={fieldClasses(isPending)}
                />
                <input
                  value={quickPatient.nit}
                  onChange={(e) => setQuickPatient((prev) => ({ ...prev, nit: e.target.value }))}
                  placeholder="NIT"
                  className={cn(fieldClasses(isPending), "md:col-span-2")}
                />
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={handleCreateQuickPatient}
                    disabled={isPending}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm",
                      isPending ? "cursor-not-allowed bg-slate-300 text-slate-600" : "bg-[#2e75ba] hover:bg-[#255f99]"
                    )}
                  >
                    Guardar paciente rápido
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-xl border border-[#dce7f5] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Datos de admisión</p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Área operativa</label>
              <select value={area} onChange={(e) => setArea(e.target.value as OperationalArea)} className={fieldClasses(isPending)}>
                {RECEPTION_AREAS.map((item) => (
                  <option key={item} value={item}>
                    {RECEPTION_AREA_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Prioridad</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as VisitPriority)}
                className={fieldClasses(isPending)}
              >
                {PRIORITY_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {PRIORITY_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Notas (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={cn(fieldClasses(isPending), "min-h-[110px]")}
                placeholder="Observaciones administrativas de recepción."
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-[#f8fafc] px-3 py-2 text-xs text-slate-600">
              Guardar admisión crea visita y encola automáticamente según área/prioridad.
            </div>
          </section>
        </div>

        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      </div>
    </Modal>
  );
}
