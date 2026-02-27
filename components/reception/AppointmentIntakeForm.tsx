"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CalendarPlus, CheckCircle2, Search, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { DateField } from "@/components/ui/DateField";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { cn } from "@/lib/utils";
import { useReceptionBranch } from "@/app/admin/reception/BranchContext";
import {
  actionCreatePatient,
  actionCreateReceptionAppointment,
  actionListReceptionAppointmentServices,
  actionListReceptionDoctors,
  actionSearchPatients
} from "@/app/admin/reception/actions";
import type { ReceptionCapability } from "@/lib/reception/permissions";
import type { ReceptionAppointmentCreateResult } from "@/lib/reception/appointments.types";
import VitalsWizardModal from "@/components/reception/VitalsWizardModal";

type PatientResult = Awaited<ReturnType<typeof actionSearchPatients>>[number];
type ServiceOption = Awaited<ReturnType<typeof actionListReceptionAppointmentServices>>[number];
type DoctorOption = Awaited<ReturnType<typeof actionListReceptionDoctors>>[number];

type NewPatientForm = {
  firstName: string;
  lastName: string;
  phone: string;
  sex: "" | "M" | "F";
  birthDate: string;
  dpi: string;
  nit: string;
};

const DEFAULT_NEW_PATIENT: NewPatientForm = {
  firstName: "",
  lastName: "",
  phone: "",
  sex: "",
  birthDate: "",
  dpi: "",
  nit: ""
};

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fieldClasses(disabled = false) {
  return cn(
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm",
    "focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30",
    disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
  );
}

export default function AppointmentIntakeForm({
  siteId,
  capabilities
}: {
  siteId: string | null;
  capabilities: ReceptionCapability[];
}) {
  const { activeBranchId } = useReceptionBranch();
  const effectiveSiteId = activeBranchId ?? siteId;
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const canCreateAppointment = capabilities.includes("VISIT_CREATE");
  const canArriveFromAppointment =
    capabilities.includes("VISIT_CREATE") && capabilities.includes("VISIT_CHECKIN") && capabilities.includes("QUEUE_ENQUEUE");

  const [date, setDate] = useState(() => todayKey());
  const [time, setTime] = useState("09:00");
  const [reasonText, setReasonText] = useState("");
  const [arrivedToday, setArrivedToday] = useState(false);

  const isToday = date === todayKey();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);

  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");

  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [newPatient, setNewPatient] = useState<NewPatientForm>(DEFAULT_NEW_PATIENT);

  const [createdAppointment, setCreatedAppointment] = useState<ReceptionAppointmentCreateResult | null>(null);
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
  const [vitalsSaved, setVitalsSaved] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedPatientLabel = useMemo(() => {
    if (!selectedPatient) return "—";
    const name = [selectedPatient.firstName, selectedPatient.lastName].filter(Boolean).join(" ") || "Paciente";
    const idLine = selectedPatient.clientCode || selectedPatient.dpi || selectedPatient.nit || selectedPatient.phone;
    return idLine ? `${name} · ${idLine}` : name;
  }, [selectedPatient]);

  useEffect(() => {
    startTransition(async () => {
      try {
        const services = await actionListReceptionAppointmentServices();
        setServiceOptions(services);
        setSelectedServiceIds((prev) => (prev.length ? prev : services[0] ? [services[0].id] : []));
      } catch (err) {
        setError((err as Error)?.message || "No se pudieron cargar servicios.");
      }
    });
  }, []);

  useEffect(() => {
    if (!effectiveSiteId) {
      setDoctorOptions([]);
      setSelectedDoctorId("");
      return;
    }
    startTransition(async () => {
      try {
        const doctors = await actionListReceptionDoctors(effectiveSiteId);
        setDoctorOptions(doctors);
        setSelectedDoctorId((prev) => (prev && doctors.some((d) => d.id === prev) ? prev : doctors[0]?.id ?? ""));
      } catch (err) {
        setError((err as Error)?.message || "No se pudieron cargar médicos.");
      }
    });
  }, [effectiveSiteId]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      startTransition(async () => {
        try {
          const results = await actionSearchPatients(q);
          setSearchResults(results);
          setError(null);
        } catch (err) {
          setError((err as Error)?.message || "No se pudo buscar pacientes.");
        }
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    const focusSearch = () => searchInputRef.current?.focus();
    window.addEventListener("reception:focus-search", focusSearch as EventListener);
    return () => window.removeEventListener("reception:focus-search", focusSearch as EventListener);
  }, []);

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const createPatient = () => {
    if (!canCreateAppointment) {
      setError("No autorizado para crear pacientes.");
      return;
    }

    const firstName = newPatient.firstName.trim();
    const phone = newPatient.phone.trim();
    const dpi = newPatient.dpi.trim();

    if (!firstName || !phone || !dpi) {
      setError("Nombre, teléfono y DPI son requeridos.");
      return;
    }

    startTransition(async () => {
      try {
        const saved = await actionCreatePatient({
          firstName,
          lastName: newPatient.lastName.trim() || undefined,
          phone,
          sex: newPatient.sex ? newPatient.sex : null,
          birthDate: newPatient.birthDate || undefined,
          dpi,
          nit: newPatient.nit.trim() || undefined
        });
        setSelectedPatient(saved as PatientResult);
        setSearchQuery([saved.firstName, saved.lastName].filter(Boolean).join(" "));
        setNewPatientOpen(false);
        setNewPatient(DEFAULT_NEW_PATIENT);
        setError(null);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo crear el paciente.");
      }
    });
  };

  const createAppointment = () => {
    if (!canCreateAppointment) {
      setError("No autorizado para crear citas.");
      return;
    }
    if (!effectiveSiteId) {
      setError("Selecciona una sede activa para continuar.");
      return;
    }
    if (!selectedPatient) {
      setError("Selecciona o crea un paciente.");
      return;
    }
    if (selectedServiceIds.length === 0) {
      setError("Selecciona al menos un servicio.");
      return;
    }
    if (!selectedDoctorId) {
      setError("Selecciona un médico.");
      return;
    }
    if (!reasonText.trim()) {
      setError("Motivo requerido.");
      return;
    }
    if (!date || !time) {
      setError("Fecha y hora requeridas.");
      return;
    }
    if (arrivedToday && !isToday) {
      setError("Solo se puede registrar llegada para citas del día.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await actionCreateReceptionAppointment({
          patientId: selectedPatient.id,
          siteId: effectiveSiteId,
          serviceTypeIds: selectedServiceIds,
          specialistId: selectedDoctorId,
          date,
          time,
          reasonText: reasonText.trim(),
          arrivedToday: Boolean(arrivedToday && isToday && canArriveFromAppointment)
        });

        setCreatedAppointment(result);
        setVitalsSaved(false);
        setVitalsModalOpen(true);
        setSuccess("Cita creada. Paso 2 obligatorio: registrar signos vitales.");
        setError(null);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo crear la cita.");
      }
    });
  };

  const resetFlow = () => {
    setCreatedAppointment(null);
    setVitalsSaved(false);
    setVitalsModalOpen(false);
    setReasonText("");
    setArrivedToday(false);
    setSuccess(null);
    setError(null);
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-[#e5edf8] bg-white/95 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Recepción</p>
            <h2 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
              Agenda de citas
            </h2>
            <p className="mt-1 text-sm text-slate-600">Paso 1: crear cita · Paso 2 obligatorio: signos vitales.</p>
          </div>
          <button
            type="button"
            onClick={() => setNewPatientOpen(true)}
            disabled={isPending || !canCreateAppointment}
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-[#2e75ba] px-4 py-2 text-sm font-semibold text-white shadow-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c] focus-visible:ring-offset-2",
              isPending || !canCreateAppointment ? "cursor-not-allowed opacity-60" : "hover:bg-[#245d93]"
            )}
          >
            <UserPlus size={14} /> Nuevo paciente
          </button>
        </div>

        {!effectiveSiteId ? (
          <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Selecciona una sede activa para operar.
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Paciente</p>
              <div className="relative mt-3">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por código, nombre, DPI o teléfono"
                  className={cn(fieldClasses(isPending), "pl-9")}
                  aria-label="Buscar paciente por nombre, DPI o teléfono"
                />
              </div>

              <div className="mt-3 text-xs text-slate-500">
                Seleccionado: <span className="font-semibold text-slate-700">{selectedPatientLabel}</span>
              </div>

              {searchResults.length > 0 ? (
                <div className="mt-3 max-h-56 space-y-2 overflow-auto">
                  {searchResults.map((patient) => {
                    const active = selectedPatient?.id === patient.id;
                    const name = [patient.firstName, patient.lastName].filter(Boolean).join(" ") || "Paciente";
                    const meta = patient.phone || patient.dpi || patient.nit || "Sin contacto";
                    return (
                      <button
                        key={patient.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition",
                          active
                            ? "border-[#4aa59c] bg-[#4aa59c]/10 text-[#2e75ba]"
                            : "border-slate-200 bg-white hover:border-[#4aadf5]"
                        )}
                        onClick={() => {
                          setSelectedPatient(patient);
                          setError(null);
                          setSuccess(null);
                        }}
                      >
                        <div>
                          <p className="font-semibold text-slate-800">{name}</p>
                          <p className="text-xs text-slate-500">{meta}</p>
                        </div>
                        <span className="text-xs text-slate-500">Seleccionar</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Servicios</p>
              <p className="mt-1 text-xs text-slate-500">Selecciona uno o más servicios del catálogo activo.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {serviceOptions.map((service) => {
                  const active = selectedServiceIds.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        active
                          ? "border-[#2e75ba] bg-[#2e75ba] text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                      )}
                    >
                      {service.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Cita</p>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Médico *</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className={fieldClasses(isPending)}
                    disabled={isPending || doctorOptions.length === 0}
                    aria-label="Seleccionar médico"
                  >
                    <option value="">Seleccionar médico…</option>
                    {doctorOptions.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Motivo *</label>
                  <textarea
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    className={cn(fieldClasses(isPending), "min-h-[96px]")}
                    disabled={isPending}
                    placeholder="Motivo administrativo de recepción."
                    aria-label="Motivo"
                  />
                </div>

                <DateTimeField
                  value={{ date, time }}
                  onChange={(next) => {
                    if (next.date !== date) setArrivedToday(false);
                    setDate(next.date);
                    setTime(next.time);
                  }}
                  labels={{ date: "Fecha *", time: "Hora *" }}
                  disabled={isPending}
                />

                <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={arrivedToday}
                    onChange={(e) => setArrivedToday(e.target.checked)}
                    disabled={isPending || !canArriveFromAppointment || !isToday}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-semibold">Llegó hoy</span>{" "}
                    <span className="text-xs text-slate-500">(crea Visit + QueueItem). Disponible solo en fecha de hoy.</span>
                  </span>
                </label>

                <button
                  type="button"
                  onClick={createAppointment}
                  disabled={isPending || !canCreateAppointment}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c] focus-visible:ring-offset-2",
                    isPending || !canCreateAppointment
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-[#4aa59c] text-white hover:bg-[#3f988f]"
                  )}
                >
                  <CalendarPlus size={16} />
                  Crear cita
                </button>
              </div>
            </div>

            {createdAppointment ? (
              <div className="rounded-lg border border-[#dce7f5] bg-[#f8fafc] p-4 text-sm text-slate-700">
                <p className="font-semibold text-[#2e75ba]">Cita creada</p>
                <p className="mt-1 text-xs">ID: {createdAppointment.appointmentId}</p>
                {createdAppointment.ticketCode ? <p className="mt-1 text-xs">Ticket: {createdAppointment.ticketCode}</p> : null}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVitalsModalOpen(true)}
                    className="rounded-lg border border-[#4aa59c]/40 bg-[#4aa59c]/10 px-3 py-2 text-xs font-semibold text-[#2e75ba]"
                  >
                    {vitalsSaved ? "Ver signos" : "Completar signos (obligatorio)"}
                  </button>
                  {vitalsSaved ? (
                    <button
                      type="button"
                      onClick={resetFlow}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      Nueva cita
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {success ? (
          <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 size={16} /> {success}
            </div>
          </div>
        ) : null}

        {error ? <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      </div>

      <Modal
        open={newPatientOpen}
        onClose={() => setNewPatientOpen(false)}
        title="Nuevo paciente"
        subtitle="Creación rápida para agenda"
        className="max-w-3xl"
        footer={
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-slate-500">Se requiere DPI para evitar duplicados operativos.</div>
            <button
              type="button"
              onClick={createPatient}
              disabled={isPending}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition",
                isPending ? "cursor-not-allowed bg-slate-200 text-slate-500" : "bg-[#2e75ba] text-white hover:bg-[#245d93]"
              )}
            >
              Guardar paciente
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Nombre(s) *</label>
            <input
              value={newPatient.firstName}
              onChange={(e) => setNewPatient((prev) => ({ ...prev, firstName: e.target.value }))}
              className={fieldClasses(isPending)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Apellido(s)</label>
            <input
              value={newPatient.lastName}
              onChange={(e) => setNewPatient((prev) => ({ ...prev, lastName: e.target.value }))}
              className={fieldClasses(isPending)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Teléfono *</label>
            <input
              value={newPatient.phone}
              onChange={(e) => setNewPatient((prev) => ({ ...prev, phone: e.target.value }))}
              className={fieldClasses(isPending)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">DPI *</label>
            <input
              value={newPatient.dpi}
              onChange={(e) => setNewPatient((prev) => ({ ...prev, dpi: e.target.value }))}
              className={fieldClasses(isPending)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Sexo</label>
            <select
              value={newPatient.sex}
              onChange={(e) => setNewPatient((prev) => ({ ...prev, sex: e.target.value as NewPatientForm["sex"] }))}
              className={fieldClasses(isPending)}
              disabled={isPending}
            >
              <option value="">—</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </div>
          <DateField
            value={newPatient.birthDate}
            onChange={(birthDate) => setNewPatient((prev) => ({ ...prev, birthDate }))}
            label="Fecha nacimiento"
            className="space-y-1"
            disabled={isPending}
            maxDate={todayKey()}
          />
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-semibold text-slate-500">NIT</label>
            <input
              value={newPatient.nit}
              onChange={(e) => setNewPatient((prev) => ({ ...prev, nit: e.target.value }))}
              className={fieldClasses(isPending)}
              disabled={isPending}
            />
          </div>
        </div>
      </Modal>

      <VitalsWizardModal
        open={vitalsModalOpen}
        onClose={() => setVitalsModalOpen(false)}
        required={Boolean(createdAppointment && !vitalsSaved)}
        target={
          createdAppointment
            ? {
                mode: "appointment",
                appointmentId: createdAppointment.appointmentId,
                siteId: effectiveSiteId,
                ticketCode: createdAppointment.ticketCode ?? undefined,
                patientLabel: selectedPatientLabel
              }
            : null
        }
        onSaved={() => {
          setVitalsSaved(true);
          setSuccess("Signos vitales guardados. Flujo de cita completo.");
        }}
      />
    </section>
  );
}
