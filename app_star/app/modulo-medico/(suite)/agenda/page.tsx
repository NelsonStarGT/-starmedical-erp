"use client";

import { useMedicalView } from "@/components/medical/MedicalViewContext";
import AgendaFilters from "@/components/medical/agenda/AgendaFilters";
import AgendaTable from "@/components/medical/agenda/AgendaTable";
import QuickHistoryModal from "@/components/medical/agenda/QuickHistoryModal";
import { buildAgendaMockData } from "@/components/medical/agenda/mock";
import type { AgendaFiltersState, AgendaRow, MedicalPersona } from "@/components/medical/agenda/types";
import { buildMockEncounter } from "@/components/medical/encounter/mock";
import type { EncounterResult } from "@/components/medical/encounter/types";
import ResultsModal from "@/components/medical/results/ResultsModal";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { useCallback, useEffect, useMemo, useState } from "react";

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeRole(role: string) {
  return role.trim().toUpperCase().replace(/\s+/g, "_");
}

function resolvePersona(roles: string[]): MedicalPersona {
  const set = new Set(roles.map(normalizeRole));
  if (set.has("SUPER_ADMIN") || set.has("ADMIN")) return "ADMIN";
  if (set.has("SUPERVISOR") || set.has("COORDINATION") || set.has("COORDINATOR")) return "COORDINATION";
  if (set.has("NURSE") || set.has("NURSING")) return "NURSE";
  if (set.has("RECEPTION") || set.has("RECEPTION_OPERATOR") || set.has("SECRETARY") || set.has("RECEPTIONIST")) {
    return "READ_ONLY";
  }
  if (set.has("DOCTOR") || set.has("MEDICO") || set.has("PHYSICIAN")) return "DOCTOR";
  return "DOCTOR";
}

function personaLabel(persona: MedicalPersona) {
  switch (persona) {
    case "ADMIN":
      return "Admin";
    case "COORDINATION":
      return "Coordinación";
    case "NURSE":
      return "Enfermería";
    case "READ_ONLY":
      return "Lectura";
    default:
      return "Médico";
  }
}

function roleHint(persona: MedicalPersona) {
  switch (persona) {
    case "ADMIN":
      return "Puede usar “Ver como” para revisar otros médicos.";
    case "COORDINATION":
      return "Seguimiento operativo clínico.";
    case "NURSE":
      return "Seguimiento de triage.";
    case "READ_ONLY":
      return "Vista informativa sin acciones de escritura.";
    default:
      return "Vista por defecto de mis pacientes.";
  }
}

function shouldShowDoctorColumn(scope: "mine" | "all" | "doctor") {
  return scope === "all";
}

function summaryBadges(rows: AgendaRow[]) {
  const waiting = rows.filter((row) => row.status === "waiting").length;
  const triage = rows.filter((row) => row.triageStatus === "pending" || row.triageStatus === "in_progress").length;
  const inConsult = rows.filter((row) => row.status === "in_consult").length;
  const resultsReady = rows.filter((row) => row.diagnostic.resultsReady).length;
  const pendingDx = rows.filter((row) => row.diagnostic.pending).length;

  return [
    { label: "En espera", value: waiting },
    { label: "En triage", value: triage },
    { label: "En consulta", value: inConsult },
    { label: "Resultados listos", value: resultsReady },
    { label: "DX pendiente", value: pendingDx }
  ];
}

function statusFilterLabel(status: AgendaFiltersState["status"]) {
  switch (status) {
    case "waiting":
      return "En espera";
    case "triage":
      return "En triage";
    case "in_consult":
      return "En consulta";
    case "done":
      return "Finalizado";
    default:
      return "Todos";
  }
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

export default function MedicalAgendaPage() {
  const { scope, doctorId } = useMedicalView();
  const { toasts, showToast, dismiss } = useToast();

  const [persona, setPersona] = useState<MedicalPersona>("DOCTOR");
  const [actor, setActor] = useState<{
    userId: string | null;
    practitionerId: string | null;
    name: string;
    roles: string[];
  } | null>(null);

  const [filters, setFilters] = useState<AgendaFiltersState>(() => ({
    date: todayKey(),
    status: "all",
    priority: "all",
    triageStatus: "all",
    resultsReady: "all",
    diagnosisPending: "all",
    query: ""
  }));

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRow, setHistoryRow] = useState<AgendaRow | null>(null);
  const [resultsModal, setResultsModal] = useState<{
    open: boolean;
    patientName: string;
    encounterId: string;
    initialResultId: string | null;
    results: EncounterResult[];
  }>({
    open: false,
    patientName: "",
    encounterId: "",
    initialResultId: null,
    results: []
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/auth/whoami", { cache: "no-store" });
        const json = res.ok ? await res.json() : null;
        if (!active) return;
        const roles = (json?.roles && Array.isArray(json.roles) ? json.roles : json?.role ? [json.role] : []) as string[];
        const practitionerId =
          asOptionalString(json?.practitionerId) ||
          asOptionalString(json?.specialistId) ||
          asOptionalString(json?.doctorId);
        setActor({
          userId: json?.userId ?? null,
          name: json?.name || json?.email || "Usuario",
          roles,
          practitionerId
        });
        setPersona(resolvePersona(roles));
      } catch {
        if (!active) return;
        setPersona("DOCTOR");
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const mineDoctorId = actor?.practitionerId || actor?.userId || doctorId || "m1";
  const mineDoctorName = actor?.name || "Mi usuario";

  const effectiveDoctorFilterId = useMemo(() => {
    if (scope === "all") return null;
    if (scope === "doctor") return doctorId || mineDoctorId;
    return mineDoctorId;
  }, [doctorId, mineDoctorId, scope]);

  const reviewedOwnerId = effectiveDoctorFilterId || mineDoctorId;
  const reviewedStorageKey = useMemo(
    () => `medical:agenda:reviewed:${encodeURIComponent(reviewedOwnerId)}:${filters.date}`,
    [filters.date, reviewedOwnerId]
  );
  const [reviewedRowIds, setReviewedRowIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(reviewedStorageKey);
      if (!raw) {
        setReviewedRowIds([]);
        return;
      }
      const parsed = JSON.parse(raw);
      setReviewedRowIds(Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : []);
    } catch {
      setReviewedRowIds([]);
    }
  }, [reviewedStorageKey]);

  const reviewedSet = useMemo(() => new Set(reviewedRowIds), [reviewedRowIds]);
  const isReviewed = useCallback((row: AgendaRow) => reviewedSet.has(row.id), [reviewedSet]);

  const toggleReviewed = useCallback(
    (row: AgendaRow) => {
      const wasReviewed = reviewedSet.has(row.id);
      setReviewedRowIds((prev) => {
        const next = new Set(prev);
        if (next.has(row.id)) {
          next.delete(row.id);
        } else {
          next.add(row.id);
        }
        const list = Array.from(next);
        try {
          window.localStorage.setItem(reviewedStorageKey, JSON.stringify(list));
        } catch {
          /* ignore */
        }
        return list;
      });
      showToast(wasReviewed ? "Revisión removida (local)." : "Marcado como revisado (local).", "success");
    },
    [reviewedSet, reviewedStorageKey, showToast]
  );

  // TODO(medical-agenda): Reemplazar mock por GET /api/agenda?date=YYYY-MM-DD&specialistId=<userId> (si aplica)
  // TODO(medical-agenda): Mapear estados del flujo (triage/ready/in_consult) con Visit/Queue + AppointmentStatus (fuentes reales)
  const { rows, quickHistoryByPatientId } = useMemo(
    () => buildAgendaMockData({ date: filters.date, myDoctorId: mineDoctorId, myDoctorName: mineDoctorName }),
    [filters.date, mineDoctorId, mineDoctorName]
  );

  const filteredRows = useMemo(() => {
    const q = filters.query.trim().toLowerCase();

    const byView = effectiveDoctorFilterId ? rows.filter((r) => r.doctor.id === effectiveDoctorFilterId) : rows;

    const byFilters = byView.filter((r) => {
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.priority !== "all" && r.priority !== filters.priority) return false;
      if (filters.triageStatus !== "all" && r.triageStatus !== filters.triageStatus) return false;
      if (filters.resultsReady === "yes" && !r.diagnostic.resultsReady) return false;
      if (filters.resultsReady === "no" && r.diagnostic.resultsReady) return false;
      if (filters.diagnosisPending === "yes" && !r.diagnostic.pending) return false;
      if (filters.diagnosisPending === "no" && r.diagnostic.pending) return false;
      if (q && !r.patient.name.toLowerCase().includes(q)) return false;
      return true;
    });

    return byFilters.sort((a, b) => a.time.localeCompare(b.time));
  }, [effectiveDoctorFilterId, filters, rows]);

  const history = historyRow ? quickHistoryByPatientId[historyRow.patient.id] ?? null : null;
  const showDoctorColumn = shouldShowDoctorColumn(scope);

  const handleAction = (actionKey: string, row: AgendaRow) => {
    switch (actionKey) {
      case "view_results":
        // TODO(agenda-results-api): reemplazar mock por consulta clínica real por encounterId.
        // Ejemplo esperado: GET /api/medical/encounters/:id/results
        // TODO(agenda-encounter-id): en integración real usar EncounterId estable desde DB.
        // El fallback con row.id es solo temporal para mock local.
        const encounterId = row.encounter.id ?? row.id;
        const encounter = buildMockEncounter(encounterId);
        setResultsModal({
          open: true,
          patientName: row.patient.name,
          encounterId,
          initialResultId: null,
          results: encounter.results
        });
        return;
      case "copy_patient_id": {
        navigator.clipboard
          .writeText(row.patient.id)
          .then(() => showToast("ID de paciente copiado.", "success"))
          .catch(() => showToast("No se pudo copiar el ID (permiso del navegador).", "error"));
        return;
      }
      case "view_triage":
        showToast("TODO: abrir vista de triage en solo lectura.", "info");
        return;
      case "reassign_doctor":
        showToast("TODO: reasignar médico (coordinación).", "info");
        return;
      case "change_priority":
        showToast("TODO: cambiar prioridad.", "info");
        return;
      default:
        showToast(`Acción: ${actionKey}`, "info");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-diagnostics-primary">
              Agenda del médico
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Mis pacientes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Vista por fecha para seguimiento clínico (hoy y próximos días), separada del flujo de recepción.
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <div>
              Rol activo: <span className="font-semibold text-diagnostics-corporate">{personaLabel(persona)}</span>
            </div>
            <div className="mt-1">{roleHint(persona)}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {summaryBadges(filteredRows).map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center rounded-full border border-slate-200 bg-diagnostics-background px-3 py-1 text-xs font-semibold text-slate-700"
            >
              {item.label}: <span className="ml-1 text-slate-900">{item.value}</span>
            </span>
          ))}
        </div>
      </div>

      <AgendaFilters value={filters} onChange={setFilters} />

      <div className="flex items-center justify-between text-sm">
        <div className="text-slate-600">
          <span className="font-semibold text-slate-900">{filteredRows.length}</span> pacientes programados
          <span className="mx-2 text-slate-300">•</span>
          Estado: <span className="font-semibold text-slate-800">{statusFilterLabel(filters.status)}</span>
        </div>
      </div>

      <AgendaTable
        rows={filteredRows}
        persona={persona}
        showDoctorInSpecialty={showDoctorColumn}
        isReviewed={isReviewed}
        onToggleReviewed={toggleReviewed}
        onAction={handleAction}
        onQuickHistory={(row) => {
          setHistoryRow(row);
          setHistoryOpen(true);
        }}
      />

      <QuickHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        row={historyRow}
        history={history}
      />

      <ResultsModal
        open={resultsModal.open}
        onClose={() => setResultsModal((prev) => ({ ...prev, open: false }))}
        patientName={resultsModal.patientName}
        encounterId={resultsModal.encounterId}
        results={resultsModal.results}
        initialResultId={resultsModal.initialResultId}
        onToast={showToast}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
