"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, Ticket, Users } from "lucide-react";
import { AreaPills } from "@/components/reception/AreaPills";
import { ActionButton } from "@/components/reception/ActionButtons";
import VitalsWizardModal from "@/components/reception/VitalsWizardModal";
import { DateField } from "@/components/ui/DateField";
import { PRIORITY_LABELS, VISIT_PRIORITIES, type ReceptionArea, type ReceptionPriority } from "@/lib/reception/constants";
import {
  actionCreateAdmission,
  actionSearchPatients
} from "@/app/admin/reception/actions";
import { useReceptionBranch } from "@/app/admin/reception/BranchContext";
import { cn } from "@/lib/utils";
import type { ReceptionCapability } from "@/lib/reception/permissions";

type Patient = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dpi: string | null;
  nit: string | null;
};

type Props = {
  siteId: string | null;
  capabilities: ReceptionCapability[];
  mode: "new" | "existing";
  initialQuery?: string;
};

type NewPatientForm = {
  firstName: string;
  lastName: string;
  phone: string;
  sex: "" | "M" | "F";
  birthDate: string;
  dpi: string;
  nit: string;
};

export function CheckInForm({ siteId, capabilities, mode, initialQuery = "" }: Props) {
  const isNewMode = mode === "new";
  const headerTitle = isNewMode ? "Admisión nueva" : "Admisión existente";
  const headerSubtitle = isNewMode ? "Registro de paciente" : "Registro de visita";

  const { activeBranchId } = useReceptionBranch();
  const effectiveSiteId = activeBranchId ?? siteId;

  const [searchQuery, setSearchQuery] = useState(() => initialQuery);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [newPatient, setNewPatient] = useState<NewPatientForm>({
    firstName: "",
    lastName: "",
    phone: "",
    sex: "",
    birthDate: "",
    dpi: "",
    nit: ""
  });
  const [area, setArea] = useState<ReceptionArea>("CONSULTATION");
  const [priority, setPriority] = useState<ReceptionPriority>("NORMAL");
  const [notes, setNotes] = useState("");
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
  const [vitalsSaved, setVitalsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const canCreate = capabilities.includes("VISIT_CREATE");
  const canCheckIn = capabilities.includes("VISIT_CHECKIN");
  const canEnqueue = capabilities.includes("QUEUE_ENQUEUE");
  const canSubmit = canCreate && canCheckIn && canEnqueue;
  const canOperate = Boolean(effectiveSiteId);

  const effectiveSearchQuery = searchQuery.trim();
  const existingModeLink = useMemo(() => {
    const params = new URLSearchParams();
    params.set("mode", "existing");
    if (effectiveSearchQuery) params.set("q", effectiveSearchQuery);
    return `/admin/recepcion/check-in?${params.toString()}`;
  }, [effectiveSearchQuery]);

  useEffect(() => {
    const focusSearch = () => searchInputRef.current?.focus();
    window.addEventListener("reception:focus-search", focusSearch as EventListener);
    return () => window.removeEventListener("reception:focus-search", focusSearch as EventListener);
  }, []);

  const runSearch = () => {
    if (!canCreate) {
      setError("No autorizado para buscar pacientes.");
      return;
    }
    startTransition(async () => {
      try {
        const results = await actionSearchPatients(effectiveSearchQuery);
        setSearchResults(results);
        setError(null);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo buscar pacientes.");
      }
    });
  };

  const createAdmission = () => {
    if (!canSubmit) {
      setError("No autorizado para crear admisiones y encolar.");
      return;
    }
    if (!canOperate) {
      setError("Selecciona una sede activa para continuar.");
      return;
    }
    if (!effectiveSiteId) return;

    if (!isNewMode && !selectedPatient) {
      setError("Selecciona un paciente para continuar.");
      return;
    }

    const firstName = newPatient.firstName.trim();
    const phone = newPatient.phone.trim();
    const dpi = newPatient.dpi.trim();
    if (isNewMode && (!firstName || !phone || !dpi)) {
      setError("Nombre(s), teléfono y DPI son requeridos para admisión nueva.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await actionCreateAdmission(
          isNewMode
            ? {
              mode: "new",
              siteId: effectiveSiteId,
              area,
              priority,
              notes,
              patientData: {
                firstName,
                lastName: newPatient.lastName.trim() || undefined,
                phone,
                sex: newPatient.sex ? newPatient.sex : null,
                birthDate: newPatient.birthDate || undefined,
                dpi,
                nit: newPatient.nit.trim() || undefined
              }
            }
            : {
              mode: "existing",
              siteId: effectiveSiteId,
              patientId: selectedPatient?.id,
              area,
              priority,
              notes
            }
        );

        setTicketCode(result.ticketCode ?? null);
        setVisitId(result.visitId);
        setVitalsSaved(false);
        setVitalsModalOpen(true);
        setError(null);
        setSearchResults([]);
        if (isNewMode) {
          setSelectedPatient(null);
          setNewPatient({
            firstName: "",
            lastName: "",
            phone: "",
            sex: "",
            birthDate: "",
            dpi: "",
            nit: ""
          });
        } else {
          setSelectedPatient(null);
        }
      } catch (err) {
        setError((err as Error)?.message || "No se pudo crear la admisión.");
      }
    });
  };

  const searchHelp = isNewMode
    ? "Busca por nombre, teléfono, DPI o NIT para evitar duplicados."
    : "Busca y selecciona un paciente existente para crear la visita.";

  const primaryDisabled = useMemo(() => {
    if (isPending || !canSubmit || !canOperate) return true;
    if (isNewMode) return !newPatient.firstName.trim() || !newPatient.phone.trim() || !newPatient.dpi.trim();
    return !selectedPatient;
  }, [canOperate, canSubmit, isNewMode, isPending, newPatient.firstName, newPatient.phone, newPatient.dpi, selectedPatient]);

  const selectedPatientLabel = useMemo(() => {
    if (!selectedPatient) return null;
    const name = [selectedPatient.firstName, selectedPatient.lastName].filter(Boolean).join(" ") || "Paciente";
    const idLine = selectedPatient.dpi || selectedPatient.nit || selectedPatient.phone;
    return idLine ? `${name} · ${idLine}` : name;
  }, [selectedPatient]);

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <div className="rounded-xl border border-[#e5edf8] bg-white/95 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Admisión</p>
              <h2 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
                {headerTitle} <span className="text-slate-500 font-medium">– {headerSubtitle}</span>
              </h2>
              <p className="mt-1 text-sm text-slate-600">{searchHelp}</p>
            </div>
          </div>

          {!canOperate && (
            <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Selecciona una sede activa para continuar.
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nombre, teléfono, DPI o NIT"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
              aria-label="Buscar paciente por nombre, teléfono, DPI o NIT"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (!effectiveSearchQuery.trim()) return;
                runSearch();
              }}
            />
            <ActionButton
              label="Buscar"
              icon={<Search size={14} />}
              variant="secondary"
              disabled={isPending || !effectiveSearchQuery || !canCreate}
              onClick={runSearch}
            />
          </div>

          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition",
                    selectedPatient?.id === patient.id
                      ? "border-[#4aa59c] bg-[#4aa59c]/10 text-[#2e75ba]"
                      : "border-slate-200 bg-white hover:border-[#4aadf5]"
                  )}
                  onClick={() => setSelectedPatient(patient)}
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {[patient.firstName, patient.lastName].filter(Boolean).join(" ") || "Paciente"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {patient.phone || patient.dpi || patient.nit || "Sin contacto"}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">Seleccionar</span>
                </button>
              ))}
            </div>
          )}

          {isNewMode ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Nuevo paciente</p>
              {selectedPatient && (
                <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Paciente encontrado: <span className="font-semibold">{selectedPatientLabel}</span>. Para evitar duplicados, usa{" "}
                  <Link href={existingModeLink} className="font-semibold text-[#2e75ba] hover:text-[#4aadf5]">
                    Admisión existente
                  </Link>
                  .
                </div>
              )}
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <input
                  value={newPatient.firstName}
                  onChange={(e) => setNewPatient((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Nombre(s) *"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
                <input
                  value={newPatient.lastName}
                  onChange={(e) => setNewPatient((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Apellido(s)"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
                <input
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Teléfono *"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
                <select
                  value={newPatient.sex}
                  onChange={(e) => setNewPatient((prev) => ({ ...prev, sex: e.target.value as NewPatientForm["sex"] }))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="">Sexo (opcional)</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
                <DateField
                  value={newPatient.birthDate}
                  onChange={(birthDate) => setNewPatient((prev) => ({ ...prev, birthDate }))}
                  className="space-y-0"
                  maxDate={new Date().toISOString().slice(0, 10)}
                  inputClassName="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:col-span-2">
                  <input
                    value={newPatient.dpi}
                    onChange={(e) => setNewPatient((prev) => ({ ...prev, dpi: e.target.value }))}
                    placeholder="DPI *"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  />
                  <input
                    value={newPatient.nit}
                    onChange={(e) => setNewPatient((prev) => ({ ...prev, nit: e.target.value }))}
                    placeholder="NIT (opcional)"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                * Campos mínimos: nombre(s), teléfono y DPI.
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Paciente seleccionado</p>
              {selectedPatient ? (
                <div className="mt-2 rounded-lg border border-[#4aadf5]/30 bg-[#4aadf5]/10 p-3 text-sm text-[#2e75ba]">
                  <p className="font-semibold">
                    {[selectedPatient.firstName, selectedPatient.lastName].filter(Boolean).join(" ") || "Paciente"}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {selectedPatient.phone ? `Tel: ${selectedPatient.phone}` : "Tel: —"}
                    {selectedPatient.dpi ? ` · DPI: ${selectedPatient.dpi}` : ""}
                    {selectedPatient.nit ? ` · NIT: ${selectedPatient.nit}` : ""}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">Datos del paciente en solo lectura desde Admisión.</p>
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-600">
                  Busca y selecciona un paciente para continuar.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-[#e5edf8] bg-white/95 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Visita</p>
          <h2 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
            Crear admisión y encolar
          </h2>

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Área inicial</p>
              <AreaPills value={area} onChange={(next) => next && setArea(next)} />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Prioridad</p>
              <div className="flex flex-wrap gap-2">
                {VISIT_PRIORITIES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition",
                      priority === option
                        ? "border-[#4aa59c] bg-[#4aa59c] text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                    )}
                    onClick={() => setPriority(option)}
                  >
                    {PRIORITY_LABELS[option]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Notas operativas</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones rápidas (opcional)"
                className="min-h-[90px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
            </div>

            <ActionButton
              label="Crear admisión y encolar"
              icon={<Ticket size={14} />}
              variant="primary"
              disabled={primaryDisabled}
              onClick={createAdmission}
            />
            {!isNewMode && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-[#4aadf5]" />
                  <span>Admisión existente requiere seleccionar un paciente.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {ticketCode && visitId && (
          <div className="rounded-xl border border-[#4aa59c]/40 bg-[#4aa59c]/10 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Admisión creada</p>
            <p className="mt-1 text-2xl font-semibold text-[#2e75ba]" style={{ fontFamily: "var(--font-reception-heading)" }}>
              {ticketCode}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Signos vitales: <span className="font-semibold">{vitalsSaved ? "completos" : "pendientes"}</span>
            </p>
            <button
              type="button"
              onClick={() => setVitalsModalOpen(true)}
              className="mt-2 rounded-lg border border-[#4aa59c]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#2e75ba] hover:bg-[#4aa59c]/10"
            >
              {vitalsSaved ? "Ver signos" : "Registrar signos (obligatorio)"}
            </button>
            <Link
              href={`/admin/recepcion/visit/${visitId}`}
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#2e75ba] hover:text-[#4aadf5]"
            >
              Ver detalle <ArrowUpRight size={16} />
            </Link>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
        )}
      </div>

      <VitalsWizardModal
        open={vitalsModalOpen}
        onClose={() => setVitalsModalOpen(false)}
        required={Boolean(visitId && !vitalsSaved)}
        target={
          visitId
            ? {
                mode: "visit",
                visitId,
                siteId: effectiveSiteId,
                ticketCode: ticketCode ?? undefined,
                patientLabel: selectedPatientLabel ?? undefined
              }
            : null
        }
        onSaved={() => {
          setVitalsSaved(true);
        }}
      />
    </section>
  );
}
