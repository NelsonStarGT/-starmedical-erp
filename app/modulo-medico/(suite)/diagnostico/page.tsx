"use client";

import { useMedicalView } from "@/components/medical/MedicalViewContext";
import AdminDiagnosticFilters from "@/components/medical/diagnostico-admin/AdminDiagnosticFilters";
import AdminDiagnosticTable from "@/components/medical/diagnostico-admin/AdminDiagnosticTable";
import { buildAdminDiagnosticsMockData } from "@/components/medical/diagnostico-admin/mock";
import type { AdminDiagnosticFiltersState, AdminDiagnosticRow } from "@/components/medical/diagnostico-admin/types";
import { buildMockEncounter } from "@/components/medical/encounter/mock";
import type { EncounterResult } from "@/components/medical/encounter/types";
import ResultsModal from "@/components/medical/results/ResultsModal";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

export default function MedicalDiagnosticoPage() {
  const { scope, doctorId } = useMedicalView();
  const router = useRouter();
  const { toasts, showToast, dismiss } = useToast();

  const [actor, setActor] = useState<{
    userId: string | null;
    practitionerId: string | null;
    name: string;
    roles: string[];
  } | null>(null);

  const [filters, setFilters] = useState<AdminDiagnosticFiltersState>(() => ({
    query: "",
    type: "all",
    acceptance: "all",
    status: "all",
    dateFrom: "",
    dateTo: ""
  }));

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
      } catch {
        if (!active) return;
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const dateKey = todayKey();
  const mineDoctorId = actor?.practitionerId || actor?.userId || doctorId || "m1";
  const mineDoctorName = actor?.name || "Mi usuario";

  const effectiveDoctorFilterId = useMemo(() => {
    if (scope === "all") return null;
    if (scope === "doctor") return doctorId || mineDoctorId;
    return mineDoctorId;
  }, [doctorId, mineDoctorId, scope]);

  const reviewedOwnerId = effectiveDoctorFilterId || mineDoctorId;
  const reviewedStorageKey = useMemo(
    () => `medical:diagnostico:reviewed:${encodeURIComponent(reviewedOwnerId)}:${dateKey}`,
    [dateKey, reviewedOwnerId]
  );
  const [reviewedOrderIds, setReviewedOrderIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(reviewedStorageKey);
      if (!raw) {
        setReviewedOrderIds([]);
        return;
      }
      const parsed = JSON.parse(raw);
      setReviewedOrderIds(Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : []);
    } catch {
      setReviewedOrderIds([]);
    }
  }, [reviewedStorageKey]);

  const reviewedSet = useMemo(() => new Set(reviewedOrderIds), [reviewedOrderIds]);
  const isReviewed = useCallback((row: AdminDiagnosticRow) => reviewedSet.has(row.orderId), [reviewedSet]);

  const toggleReviewed = useCallback(
    (row: AdminDiagnosticRow) => {
      const wasReviewed = reviewedSet.has(row.orderId);
      setReviewedOrderIds((prev) => {
        const next = new Set(prev);
        if (next.has(row.orderId)) {
          next.delete(row.orderId);
        } else {
          next.add(row.orderId);
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

  // TODO(medical-admin-diagnostico): reemplazar mock por proyección sanitizada:
  // - GET /api/reception/diagnostics/status?appointmentId=… (para administrativo)
  // - GET /api/medical/encounters/:id/diagnostics/summary (para clínico)
  // Reglas: administrativo nunca ve valores/resultJson; solo flags/estado.
  const base = useMemo(
    () => buildAdminDiagnosticsMockData({ date: dateKey, myDoctorId: mineDoctorId, myDoctorName: mineDoctorName }),
    [dateKey, mineDoctorId, mineDoctorName]
  );

  const [rows, setRows] = useState<AdminDiagnosticRow[]>(() => base.rows);
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
    setRows(base.rows);
  }, [base.rows]);

  const scopedRows = useMemo(() => {
    if (!effectiveDoctorFilterId) return rows;
    return rows.filter((row) => row.doctor.id === effectiveDoctorFilterId);
  }, [effectiveDoctorFilterId, rows]);

  const filteredRows = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return scopedRows
      .filter((row) => {
        if (filters.type !== "all" && row.type !== filters.type) return false;
        if (filters.acceptance !== "all" && row.acceptance !== filters.acceptance) return false;
        if (filters.status !== "all" && row.status !== filters.status) return false;
        if (filters.dateFrom && row.date < filters.dateFrom) return false;
        if (filters.dateTo && row.date > filters.dateTo) return false;
        if (!q) return true;
        const haystack = [
          row.patient.firstName,
          row.patient.lastName,
          row.patient.id,
          row.examName,
          row.orderId
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [filters, scopedRows]);

  const handleAction = (actionKey: string, row: AdminDiagnosticRow) => {
    switch (actionKey) {
      case "view_results":
        // TODO(diagnostico-results-api): reemplazar mock por consulta clínica real por encounterId.
        // Ejemplo esperado: GET /api/medical/encounters/:id/results
        // TODO(diagnostico-encounter-id): en integración real usar EncounterId estable desde DB.
        // El fallback con enc-${orderId} es solo temporal para mock local.
        const encounterId = row.encounterId || `enc-${row.orderId}`;
        const encounter = buildMockEncounter(encounterId);
        setResultsModal({
          open: true,
          patientName: `${row.patient.firstName} ${row.patient.lastName}`.trim() || "Paciente",
          encounterId,
          initialResultId: row.orderId,
          results: encounter.results
        });
        return;
      case "copy_order_id":
        navigator.clipboard
          .writeText(row.orderId)
          .then(() => showToast("ID de orden copiado.", "success"))
          .catch(() => showToast("No se pudo copiar el ID (permiso del navegador).", "error"));
        return;
      default:
        showToast(`Acción: ${actionKey}`, "info");
    }
  };

  const interpret = (row: AdminDiagnosticRow) => {
    // TODO(diagnostico-encounter-id): al integrar DB, evitar fallback y usar EncounterId clínico estable.
    const existing = row.encounterId;
    const encounterId = existing || `enc-${row.orderId}`;

    if (!existing) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, encounterId } : r)));
      showToast("Encounter creado (mock).", "success");
    }

    router.push(`/modulo-medico/consultaM/${encodeURIComponent(encounterId)}?focus=diagnostico`);
  };

  return (
    <div className="space-y-4">
      <AdminDiagnosticFilters value={filters} onChange={setFilters} />

      <div className="flex items-center justify-between text-sm text-slate-600">
        <div>
          <span className="font-semibold text-slate-900">{filteredRows.length}</span> estudios
        </div>
      </div>

      <AdminDiagnosticTable
        rows={filteredRows}
        showDoctor={scope === "all"}
        onInterpret={interpret}
        onAction={handleAction}
        isReviewed={isReviewed}
        onToggleReviewed={toggleReviewed}
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
