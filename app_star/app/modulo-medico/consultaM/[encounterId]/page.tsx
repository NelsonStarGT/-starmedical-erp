"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { Focus, PanelLeft, PanelRight } from "lucide-react";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { useEncounterEditor, type EncounterUiPreferences } from "@/hooks/useEncounterEditor";
import { cn } from "@/lib/utils";
import EncounterInternalMenu, { type EncounterMenuKey } from "@/components/medical/encounter/EncounterInternalMenu";
import ConsultHeader from "@/components/medical/encounter/ConsultHeader";
import ClinicalHistoryPanel from "@/components/medical/encounter/ClinicalHistoryPanel";
import DiagnosisPanel from "@/components/medical/encounter/DiagnosisPanel";
import PrescriptionPanel from "@/components/medical/encounter/PrescriptionPanel";
import EvolutionPanel from "@/components/medical/encounter/EvolutionPanel";
import SuppliesPanel from "@/components/medical/encounter/SuppliesPanel";
import OrdersPanel from "@/components/medical/encounter/OrdersPanel";
import type {
  ClinicalTemplateDefinition,
  EncounterOrderGlobalNotes,
  EncounterOrderRequestItem,
  EncounterOrderRequestModality,
  EncounterReconsulta,
  EncounterResult,
  EncounterRichTextValue,
  EncounterSnapshot,
  EncounterSupplyItem,
  EncounterState,
  EncounterStatus,
  VitalTemplateDefinition,
  VitalTemplateKey
} from "@/components/medical/encounter/types";
import { buildMockEncounter } from "@/components/medical/encounter/mock";
import ResultsModal from "@/components/medical/results/ResultsModal";
import type { LetterViewMode } from "@/components/medical/encounter/LetterPages";
import { Modal } from "@/components/ui/Modal";
import {
  createDefaultDocumentBrandingTemplate,
  pickDefaultDocumentBrandingTemplate,
  type DocumentBrandingTemplate
} from "@/lib/medical/documentBranding";
import {
  calculateBodyMassIndex,
  defaultVitalTemplates,
  defaultClinicalTemplates,
  deriveLegacyHistoryFields,
  mergeHistorySectionsWithTemplate
} from "@/lib/medical/clinical";
import {
  fetchReconsultations,
  postReconsulta,
  type ReconsultaPostPayload
} from "@/lib/medical/reconsultationsClient";
import { fetchEncounterResults } from "@/lib/medical/resultsClient";
import {
  deleteEncounterSupply,
  fetchEncounterSupplies,
  postEncounterSupply,
  type EncounterSupplyPostPayload
} from "@/lib/medical/suppliesClient";
import {
  deleteEncounterOrder,
  fetchEncounterOrders,
  patchEncounterOrder,
  postEncounterOrder,
  type EncounterOrderPatchPayload,
  type EncounterOrderPostPayload
} from "@/lib/medical/ordersClient";

function safeParam(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "encounter";
}

function resolveMenu(focus: string | null, hasResultId: boolean): EncounterMenuKey {
  const normalized = (focus || "").toLowerCase();
  if (normalized === "receta" || normalized === "prescription") return "prescription";
  if (normalized === "insumos" || normalized === "supplies") return "supplies";
  if (normalized === "ordenes" || normalized === "orders") return "orders";
  if (normalized === "diagnostico" || normalized === "diagnostics" || normalized === "dx") {
    return hasResultId ? "results" : "diagnostics";
  }
  if (normalized === "evolucion" || normalized === "evolution" || normalized === "reconsulta") return "evolution";
  if (normalized === "resultados" || normalized === "results" || hasResultId) return "results";
  return "history";
}

function resultTypeLabel(type: EncounterResult["type"]) {
  if (type === "LAB") return "Laboratorio";
  if (type === "RX") return "Rayos X";
  return "Ultrasonido";
}

function resultStatusLabel(status: EncounterResult["status"]) {
  if (status === "ready") return "Listo";
  if (status === "in_progress") return "En proceso";
  return "Pendiente";
}

function resultStatusPill(status: EncounterResult["status"]) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "in_progress") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === "") return "—";
  return String(value);
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function notePreviewText(entry: EncounterState["reconsultations"][number]) {
  const raw = entry.noteRich?.text?.trim();
  if (raw) return raw;
  return entry.interpretation || "Sin nota";
}

function brandingBackgroundPosition(position: DocumentBrandingTemplate["backgroundPosition"]) {
  if (position === "top") return "top center";
  if (position === "bottom") return "bottom center";
  return "center";
}

const DEFAULT_VITAL_VISIBILITY: Record<VitalTemplateKey, boolean> = {
  bloodPressure: true,
  heartRate: true,
  respRate: true,
  temperatureC: true,
  spo2: true,
  weightKg: true,
  heightCm: true,
  glucometryMgDl: true,
  abdominalCircumferenceCm: true,
  bodyMassIndex: true
};

type WorkspaceViewportTier = "mobile" | "lg" | "xl" | "2xl";

function resolveViewportTier(width: number): WorkspaceViewportTier {
  if (width >= 1536) return "2xl";
  if (width >= 1280) return "xl";
  if (width >= 1024) return "lg";
  return "mobile";
}

const DX_SPOTLIGHT_INPUT_ID = "consulta-dx-spotlight";

type RealEncounterApiRow = {
  id: string;
  patientId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  closedById: string | null;
};

type DataSource = "mock" | "real";

function normalizeEncounterStatus(rawStatus: string | null | undefined): EncounterStatus {
  const normalized = (rawStatus || "").toLowerCase();
  if (normalized === "closed") return "closed";
  if (normalized === "open") return "open";
  return "draft";
}

function encounterStatusLabel(status: EncounterStatus) {
  if (status === "closed") return "Cerrada";
  if (status === "open") return "Abierta";
  return "Borrador";
}

type AppendPayload = {
  noteRich: EncounterRichTextValue;
  entryTitle: string;
  sourceResultId: string | null;
  sourceResultTitle: string | null;
  interpretation: string;
  conduct: string;
  therapeuticAdjustment: string;
};

function buildFollowUpsFromReconsultations(items: EncounterReconsulta[]): EncounterState["followUps"] {
  return items.map((entry) => ({
    id: entry.id,
    createdAt: entry.createdAt,
    authorName: entry.authorName,
    note: `${entry.entryTitle}: ${entry.interpretation || entry.noteRich?.text || "Sin nota"}`
  }));
}

function buildReconsultaPayload(payload: AppendPayload): ReconsultaPostPayload {
  const noteText = payload.noteRich?.text?.trim() || "";
  const fallback = noteText.slice(0, 280);
  const normalizedInterpretation = payload.interpretation?.trim() || fallback;
  const normalizedConduct = payload.conduct?.trim() || fallback;
  const normalizedTherapeutic = payload.therapeuticAdjustment?.trim() || fallback;

  return {
    type: payload.sourceResultId ? "reconsulta_resultados" : "manual_evolution",
    sourceResultId: payload.sourceResultId,
    sourceResultTitle: payload.sourceResultTitle,
    entryTitle: payload.entryTitle,
    noteRich: payload.noteRich,
    interpretation: normalizedInterpretation,
    conduct: normalizedConduct,
    therapeuticAdjustment: normalizedTherapeutic
  };
}

type EncounterDraftPayload = {
  encounterId: string;
  savedAt: string;
  historyDraft: EncounterState["historyDraft"];
  diagnosis: EncounterState["diagnosis"];
  prescription: EncounterState["prescription"];
  suppliesUsed: EncounterState["suppliesUsed"];
  orderRequests: EncounterState["orderRequests"];
  orderGlobalNotes: EncounterState["orderGlobalNotes"];
};

const UI_PREFS_KEY = "starmedical.consultaM.uiPrefs";
const DRAFT_STORAGE_PREFIX = "starmedical.encounter.draft.";

function buildEncounterDraftPayload(state: EncounterState): EncounterDraftPayload {
  return {
    encounterId: state.id,
    savedAt: new Date().toISOString(),
    historyDraft: state.historyDraft,
    diagnosis: state.diagnosis,
    prescription: state.prescription,
    suppliesUsed: state.suppliesUsed,
    orderRequests: state.orderRequests,
    orderGlobalNotes: state.orderGlobalNotes
  };
}

function applyEncounterDraftPayload(prev: EncounterState, payload: EncounterDraftPayload): EncounterState {
  return {
    ...prev,
    historyDraft: payload.historyDraft,
    diagnosis: payload.diagnosis,
    prescription: payload.prescription,
    suppliesUsed: payload.suppliesUsed,
    orderRequests: payload.orderRequests,
    orderGlobalNotes: payload.orderGlobalNotes
  };
}

function serializeDraftComparable(payload: EncounterDraftPayload) {
  return JSON.stringify({
    encounterId: payload.encounterId,
    historyDraft: payload.historyDraft,
    diagnosis: payload.diagnosis,
    prescription: payload.prescription,
    suppliesUsed: payload.suppliesUsed,
    orderRequests: payload.orderRequests,
    orderGlobalNotes: payload.orderGlobalNotes
  });
}

function getBloodPressureSystolic(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const match = raw.match(/^(\d{2,3})\s*\/\s*\d{2,3}$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function vitalAlertClass(params: { key: VitalTemplateKey; value: string | number | null | undefined }) {
  const { key, value } = params;

  if (key === "temperatureC") {
    const temp = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(temp) && temp >= 39.5) {
      return "border-rose-300 bg-rose-50 text-rose-900";
    }
  }

  if (key === "spo2") {
    const spo2 = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(spo2) && spo2 <= 92) {
      return "border-rose-300 bg-rose-50 text-rose-900";
    }
  }

  if (key === "heartRate") {
    const hr = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(hr) && hr >= 120) {
      return "border-amber-300 bg-amber-50 text-amber-900";
    }
  }

  if (key === "bloodPressure") {
    const systolic = getBloodPressureSystolic(typeof value === "string" ? value : null);
    if (systolic !== null && systolic >= 180) {
      return "border-rose-300 bg-rose-50 text-rose-900";
    }
  }

  return "border-slate-200 bg-slate-50 text-slate-900";
}

function orderDocumentTitle(modality: EncounterOrderRequestModality) {
  if (modality === "RX") return "Orden médica de Rayos X";
  if (modality === "USG") return "Orden médica de Ultrasonido";
  return "Orden médica de Laboratorio";
}

function orderScope(modality: EncounterOrderRequestModality) {
  if (modality === "RX") return "order_rx";
  if (modality === "USG") return "order_usg";
  return "order_lab";
}

function escapeHtml(raw: string) {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function brandingLogoAlignment(position: DocumentBrandingTemplate["logoPosition"]) {
  if (position === "top-left") return "flex-start";
  if (position === "top-center") return "center";
  return "flex-end";
}

function buildOrderPrintableHtml(params: {
  encounter: EncounterState;
  modality: EncounterOrderRequestModality;
  items: EncounterOrderRequestItem[];
  globalNote: string;
  branding: DocumentBrandingTemplate;
}) {
  const { encounter, modality, items, globalNote, branding } = params;
  const logoUrl = branding.logoUrl ? escapeHtml(branding.logoUrl) : null;
  const backgroundUrl = branding.backgroundImageUrl
    ? branding.backgroundImageUrl.replaceAll("'", "%27").replaceAll('"', "%22")
    : "";
  const hasBackground = Boolean(backgroundUrl);
  const backgroundPosition = branding.backgroundPosition === "top" ? "top center" : branding.backgroundPosition === "bottom" ? "bottom center" : "center";
  const rows = items
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.serviceCode || "—")}</td>
        <td>${item.quantity}</td>
        <td>${escapeHtml(item.priority === "urgent" ? "Urgente" : "Rutina")}</td>
        <td>${escapeHtml(item.notes || "—")}</td>
      </tr>
    `
    )
    .join("\n");

  return `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(orderDocumentTitle(modality))}</title>
    <style>
      @page {
        size: Letter;
        margin: ${branding.marginTopIn}in ${branding.marginRightIn}in ${branding.marginBottomIn}in ${branding.marginLeftIn}in;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        color: #0f172a;
        background: #fff;
      }
      .sheet {
        position: relative;
        min-height: calc(11in - ${branding.marginTopIn + branding.marginBottomIn}in);
      }
      ${hasBackground ? `.sheet::before{content:"";position:absolute;inset:0;background-image:url('${backgroundUrl}');background-repeat:no-repeat;background-position:${backgroundPosition};background-size:${Math.round(branding.backgroundScale * 100)}% auto;opacity:${branding.backgroundOpacity};z-index:0;}` : ""}
      .content {
        position: relative;
        z-index: 1;
      }
      .header {
        border-bottom: 2px solid #4aa59c;
        padding-bottom: 10px;
        margin-bottom: 16px;
      }
      .brand {
        color: #2e75ba;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        font-size: 11px;
        font-weight: 700;
      }
      .logo {
        display: flex;
        justify-content: ${brandingLogoAlignment(branding.logoPosition)};
        margin-top: 6px;
      }
      .logo img {
        max-height: 44px;
        max-width: ${branding.logoWidthPx}px;
        object-fit: contain;
      }
      h1 {
        margin: 8px 0 4px;
        font-size: 20px;
      }
      .meta {
        font-size: 12px;
        color: #475569;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
      }
      th, td {
        border: 1px solid #dbe2ea;
        padding: 8px;
        text-align: left;
        vertical-align: top;
        font-size: 12px;
      }
      th {
        background: #f2f8ff;
        color: #2e75ba;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 10px;
      }
      .note {
        margin-top: 14px;
        border: 1px solid #dbe2ea;
        border-radius: 8px;
        padding: 10px;
        background: #f8fafc;
        font-size: 12px;
      }
      .footer {
        margin-top: 24px;
        border-top: 1px dashed #cbd5e1;
        padding-top: 10px;
        font-size: 11px;
        color: #475569;
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <div class="content">
        <header class="header">
          <p class="brand">${escapeHtml(branding.title)}</p>
          ${logoUrl ? `<div class="logo"><img src="${logoUrl}" alt="Logo clínico"/></div>` : ""}
          <h1>${escapeHtml(orderDocumentTitle(modality))}</h1>
          <p class="meta">Paciente: ${escapeHtml(encounter.patient.name)} · Expediente: ${escapeHtml(encounter.patient.recordNumber)} · Encounter: ${escapeHtml(encounter.id)}</p>
          <p class="meta">Cobertura: ${escapeHtml(encounter.patient.coverageType)} · Entidad: ${escapeHtml(encounter.patient.coverageEntity || "—")}</p>
          <p class="meta">Fecha: ${escapeHtml(formatDateTime(new Date().toISOString()))} · Médico: ${escapeHtml(encounter.closedByName || "Médico responsable")}</p>
        </header>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Examen</th>
              <th>Código</th>
              <th>Cantidad</th>
              <th>Prioridad</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="6">Sin órdenes para esta modalidad.</td></tr>'}
          </tbody>
        </table>

        <section class="note">
          <strong>Nota global ${escapeHtml(modality)}:</strong> ${escapeHtml(globalNote || "—")}
        </section>

        ${
          branding.footerEnabled
            ? `<footer class="footer"><span>${escapeHtml(branding.footerLeftText || " ")}</span><span>${escapeHtml(branding.footerRightText || " ")}</span></footer>`
            : ""
        }
      </div>
    </main>
  </body>
</html>
  `.trim();
}

export default function EncounterPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const encounterId = safeParam((params as Record<string, unknown>)?.encounterId);
  const focus = searchParams.get("focus");
  const resultId = searchParams.get("resultId");
  const action = searchParams.get("action");
  const hasResultId = Boolean(resultId);

  const { toasts, showToast, dismiss } = useToast();
  const [state, setState] = useState<EncounterState>(() => buildMockEncounter(encounterId));
  const [menu, setMenu] = useState<EncounterMenuKey>(() => resolveMenu(focus, hasResultId));
  const [resultsViewerOpen, setResultsViewerOpen] = useState(false);
  const [resultsViewerResultId, setResultsViewerResultId] = useState<string | null>(resultId);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(true);
  const [viewportTier, setViewportTier] = useState<WorkspaceViewportTier>("mobile");
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ClinicalTemplateDefinition[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [vitalsTemplates, setVitalsTemplates] = useState<VitalTemplateDefinition[]>([]);
  const [vitalsTemplateLoading, setVitalsTemplateLoading] = useState(false);
  const [historyViewMode, setHistoryViewMode] = useState<LetterViewMode>("paged");
  const [evolutionViewMode, setEvolutionViewMode] = useState<LetterViewMode>("paged");
  const [pendingResultContext, setPendingResultContext] = useState<{ id: string; title: string } | null>(null);
  const [closingAndSigning, setClosingAndSigning] = useState(false);
  const [topRailCollapsed, setTopRailCollapsed] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [confirmChecklist, setConfirmChecklist] = useState({
    clinicalReview: false,
    principalDx: false,
    immutableSnapshot: false
  });
  const [savingReconsulta, setSavingReconsulta] = useState(false);
  const [savingSupply, setSavingSupply] = useState(false);
  const [loadingSupplies, setLoadingSupplies] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [evolutionFocusSignal, setEvolutionFocusSignal] = useState(0);
  const [evolutionSaveSignal, setEvolutionSaveSignal] = useState(0);
  const [baseDataSource, setBaseDataSource] = useState<DataSource>("mock");
  const [resultsDataSource, setResultsDataSource] = useState<DataSource>("mock");
  const [isDirty, setIsDirty] = useState(false);
  const [restoreDraftOpen, setRestoreDraftOpen] = useState(false);
  const [restoreDraftPayload, setRestoreDraftPayload] = useState<EncounterDraftPayload | null>(null);
  const [autosavingDraft, setAutosavingDraft] = useState(false);
  const [printOrderMode, setPrintOrderMode] = useState<EncounterOrderRequestModality | null>(null);
  const [documentBrandingTemplate, setDocumentBrandingTemplate] = useState<DocumentBrandingTemplate>(() =>
    createDefaultDocumentBrandingTemplate()
  );

  const autoInterpretHandledKeyRef = useRef<string | null>(null);
  const resultsFallbackToastKeyRef = useRef<string | null>(null);
  const suppliesFallbackToastKeyRef = useRef<string | null>(null);
  const ordersFallbackToastKeyRef = useRef<string | null>(null);
  const documentBrandingFallbackToastRef = useRef(false);
  const draftAutosaveErrorToastRef = useRef<string | null>(null);
  const restoringDraftRef = useRef(false);
  const autosaveBaselineRef = useRef<string>("");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTemplates = useCallback(async () => {
    setTemplateLoading(true);
    try {
      const res = await fetch("/api/medical/templates", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudieron cargar plantillas clínicas.");

      const list = (json.data || []) as ClinicalTemplateDefinition[];
      setTemplates(list);

      setState((prev) => {
        const fallbackList = list.length > 0 ? list : defaultClinicalTemplates();
        const selected =
          fallbackList.find((item) => item.id === prev.historyDraft.templateId) ||
          fallbackList.find((item) => item.isDefault) ||
          fallbackList[0] ||
          null;

        if (!selected) return prev;

        const mergedSections = mergeHistorySectionsWithTemplate(selected, prev.historyDraft.sections);
        const legacy = deriveLegacyHistoryFields(mergedSections);
        return {
          ...prev,
          historyDraft: {
            ...prev.historyDraft,
            templateId: selected.id,
            templateTitle: selected.title,
            templateTypeLabel: selected.type,
            sections: mergedSections,
            consultationReason: legacy.consultationReason,
            antecedentes: legacy.antecedentes,
            physicalExam: legacy.physicalExam
          }
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar plantillas";
      showToast(message, "error");
      const defaults = defaultClinicalTemplates();
      setTemplates(defaults);
      setState((prev) => {
        const selected = defaults[0];
        if (!selected) return prev;
        const mergedSections = mergeHistorySectionsWithTemplate(selected, prev.historyDraft.sections);
        const legacy = deriveLegacyHistoryFields(mergedSections);
        return {
          ...prev,
          historyDraft: {
            ...prev.historyDraft,
            templateId: selected.id,
            templateTitle: selected.title,
            templateTypeLabel: selected.type,
            sections: mergedSections,
            consultationReason: legacy.consultationReason,
            antecedentes: legacy.antecedentes,
            physicalExam: legacy.physicalExam
          }
        };
      });
    } finally {
      setTemplateLoading(false);
    }
  }, [showToast]);

  const loadVitalsTemplates = useCallback(async () => {
    setVitalsTemplateLoading(true);
    try {
      const res = await fetch("/api/medical/vitals-templates", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudieron cargar plantillas de signos vitales.");

      const list = (json.data || []) as VitalTemplateDefinition[];
      setVitalsTemplates(list.length > 0 ? list : defaultVitalTemplates());
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar plantillas de signos vitales";
      showToast(message, "error");
      setVitalsTemplates(defaultVitalTemplates());
    } finally {
      setVitalsTemplateLoading(false);
    }
  }, [showToast]);

  const loadEncounterFromRealApi = useCallback(async (nextEncounterId: string, baseState: EncounterState): Promise<EncounterState | null> => {
    try {
      const encodedId = encodeURIComponent(nextEncounterId);
      const [encounterRes, reconsultationsRes] = await Promise.all([
        fetch(`/api/medical/encounters/${encodedId}`, { cache: "no-store" }),
        fetch(`/api/medical/encounters/${encodedId}/reconsultations`, { cache: "no-store" })
      ]);

      if (!encounterRes.ok || !reconsultationsRes.ok) return null;

      const [encounterJson, reconsultationsJson] = await Promise.all([
        encounterRes.json().catch(() => null),
        reconsultationsRes.json().catch(() => null)
      ]);

      if (!encounterJson?.ok || !reconsultationsJson?.ok) return null;

      const row = (encounterJson.data || null) as RealEncounterApiRow | null;
      if (!row?.id) return null;

      const realReconsultations = (
        Array.isArray(reconsultationsJson?.data?.items) ? reconsultationsJson.data.items : []
      ) as EncounterReconsulta[];

      return {
        ...baseState,
        id: row.id,
        status: normalizeEncounterStatus(row.status),
        closedAt: row.closedAt || null,
        closedByName: row.closedById || baseState.closedByName,
        reconsultations: realReconsultations,
        followUps: buildFollowUpsFromReconsultations(realReconsultations)
      };
    } catch {
      return null;
    }
  }, []);

  const hydrateResultsFromRealApi = useCallback(
    async (nextEncounterId: string): Promise<EncounterResult[] | null> => {
      try {
        return await fetchEncounterResults(nextEncounterId);
      } catch (error) {
        console.warn(`[consultaM] No se pudieron cargar resultados reales para ${nextEncounterId}. Se usa fallback mock.`, error);
        if (resultsFallbackToastKeyRef.current !== nextEncounterId) {
          resultsFallbackToastKeyRef.current = nextEncounterId;
          showToast("Usando resultados simulados", "info");
        }
        return null;
      }
    },
    [showToast]
  );

  const hydrateSuppliesFromRealApi = useCallback(
    async (nextEncounterId: string): Promise<EncounterSupplyItem[] | null> => {
      setLoadingSupplies(true);
      try {
        return await fetchEncounterSupplies(nextEncounterId);
      } catch (error) {
        console.warn(`[consultaM] No se pudieron cargar insumos reales para ${nextEncounterId}. Se usa fallback mock.`, error);
        if (suppliesFallbackToastKeyRef.current !== nextEncounterId) {
          suppliesFallbackToastKeyRef.current = nextEncounterId;
          showToast("Usando insumos simulados", "info");
        }
        return null;
      } finally {
        setLoadingSupplies(false);
      }
    },
    [showToast]
  );

  const hydrateOrdersFromRealApi = useCallback(
    async (nextEncounterId: string): Promise<EncounterOrderRequestItem[] | null> => {
      setLoadingOrders(true);
      try {
        return await fetchEncounterOrders(nextEncounterId);
      } catch (error) {
        console.warn(`[consultaM] No se pudieron cargar órdenes reales para ${nextEncounterId}. Se usa fallback mock.`, error);
        if (ordersFallbackToastKeyRef.current !== nextEncounterId) {
          ordersFallbackToastKeyRef.current = nextEncounterId;
          showToast("Usando órdenes simuladas", "info");
        }
        return null;
      } finally {
        setLoadingOrders(false);
      }
    },
    [showToast]
  );

  const loadDocumentBranding = useCallback(async () => {
    try {
      const res = await fetch("/api/medical/document-branding?scope=clinical", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar plantilla documental.");

      const items = Array.isArray(json?.data?.items) ? (json.data.items as DocumentBrandingTemplate[]) : [];
      const selected = pickDefaultDocumentBrandingTemplate(items, "clinical");
      setDocumentBrandingTemplate(selected);
      documentBrandingFallbackToastRef.current = false;
    } catch {
      setDocumentBrandingTemplate(createDefaultDocumentBrandingTemplate());
      if (!documentBrandingFallbackToastRef.current) {
        documentBrandingFallbackToastRef.current = true;
        showToast("Usando plantilla documental por defecto.", "info");
      }
    }
  }, [showToast]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncViewport = () => {
      setViewportTier(resolveViewportTier(window.innerWidth));
    };
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    let savedPrefs: EncounterUiPreferences | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(UI_PREFS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as EncounterUiPreferences;
          if (
            typeof parsed.leftPanelOpen === "boolean" &&
            typeof parsed.rightPanelOpen === "boolean" &&
            typeof parsed.focusMode === "boolean"
          ) {
            savedPrefs = parsed;
          }
        }
      } catch {
        savedPrefs = null;
      }
    }

    if (viewportTier === "2xl" || viewportTier === "xl") {
      if (savedPrefs) {
        setLeftPanelOpen(savedPrefs.leftPanelOpen);
        setRightPanelOpen(savedPrefs.rightPanelOpen);
        setFocusMode(savedPrefs.focusMode);
      } else {
        setLeftPanelOpen(true);
        setRightPanelOpen(true);
        setFocusMode(false);
      }
      return;
    }
    if (viewportTier === "lg") {
      if (savedPrefs) {
        setLeftPanelOpen(savedPrefs.leftPanelOpen);
        setRightPanelOpen(savedPrefs.rightPanelOpen);
        setFocusMode(savedPrefs.focusMode);
      } else {
        setLeftPanelOpen(true);
        setRightPanelOpen(false);
        setFocusMode(false);
      }
      return;
    }
    setLeftPanelOpen(false);
    setRightPanelOpen(false);
    setFocusMode(true);
    setHistoryViewMode("continuous");
    setEvolutionViewMode("continuous");
  }, [viewportTier]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const originalOverflow = document.body.style.overflow;
    const shouldLock = viewportTier === "mobile" && (leftPanelOpen || rightPanelOpen);
    if (shouldLock) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [leftPanelOpen, rightPanelOpen, viewportTier]);

  useEffect(() => {
    let cancelled = false;
    const mockState = buildMockEncounter(encounterId);
    setState(mockState);
    setBaseDataSource("mock");
    setResultsDataSource("mock");
    setMenu(resolveMenu(focus, Boolean(resultId)));
    setResultsViewerOpen(false);
    setResultsViewerResultId(resultId);
    setLastDraftSavedAt(null);
    setSavingReconsulta(false);
    setSavingSupply(false);
    setLoadingSupplies(false);
    setSavingOrder(false);
    setLoadingOrders(false);
    setAutosavingDraft(false);
    setIsDirty(false);
    setRestoreDraftOpen(false);
    setRestoreDraftPayload(null);
    setPrintOrderMode(null);
    setPendingResultContext(null);
    autoInterpretHandledKeyRef.current = null;
    draftAutosaveErrorToastRef.current = null;
    restoringDraftRef.current = false;
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    autosaveBaselineRef.current = serializeDraftComparable(buildEncounterDraftPayload(mockState));

    const localDraftKey = `${DRAFT_STORAGE_PREFIX}${encounterId}`;
    let localDraftCandidate: EncounterDraftPayload | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(localDraftKey);
        if (raw) {
          const parsed = JSON.parse(raw) as EncounterDraftPayload;
          if (parsed && parsed.encounterId === encounterId) {
            localDraftCandidate = parsed;
          }
        }
      } catch {
        localDraftCandidate = null;
      }
    }

    // TODO(real-encounter): cuando APIs reales estén completas, retirar fallback a mock.
    const hydrateRealEncounter = async () => {
      let nextState = mockState;
      const realBaseState = await loadEncounterFromRealApi(encounterId, mockState);
      if (cancelled) return;

      if (realBaseState) {
        nextState = realBaseState;
        setBaseDataSource("real");

        const [realResults, realSupplies, realOrders] = await Promise.all([
          hydrateResultsFromRealApi(encounterId),
          hydrateSuppliesFromRealApi(encounterId),
          hydrateOrdersFromRealApi(encounterId)
        ]);
        if (cancelled) return;

        if (realResults) {
          nextState = { ...nextState, results: realResults };
          setResultsDataSource("real");
        } else {
          setResultsDataSource("mock");
        }

        if (realSupplies) {
          nextState = { ...nextState, suppliesUsed: realSupplies };
        }

        if (realOrders) {
          nextState = { ...nextState, orderRequests: realOrders };
        }
      }

      setState(nextState);
      setResultsViewerResultId((prev) => {
        if (resultId && nextState.results.some((item) => item.id === resultId)) return resultId;
        if (prev && nextState.results.some((item) => item.id === prev)) return prev;
        return nextState.results[0]?.id || null;
      });

      const serverComparable = serializeDraftComparable(buildEncounterDraftPayload(nextState));
      autosaveBaselineRef.current = serverComparable;
      setIsDirty(false);

      if (
        localDraftCandidate &&
        serializeDraftComparable(localDraftCandidate) !== serverComparable &&
        !restoringDraftRef.current
      ) {
        setRestoreDraftPayload(localDraftCandidate);
        setRestoreDraftOpen(true);
      }
    };

    void hydrateRealEncounter();
    void loadTemplates();
    void loadVitalsTemplates();
    void loadDocumentBranding();
    return () => {
      cancelled = true;
    };
  }, [
    encounterId,
    focus,
    hydrateOrdersFromRealApi,
    hydrateResultsFromRealApi,
    hydrateSuppliesFromRealApi,
    loadDocumentBranding,
    loadEncounterFromRealApi,
    loadTemplates,
    loadVitalsTemplates,
    resultId
  ]);

  useEffect(() => {
    const key = `${encounterId}:${action || ""}:${resultId || ""}`;
    if (autoInterpretHandledKeyRef.current === key) return;
    if (action !== "interpret" || !resultId) return;

    const result = state.results.find((item) => item.id === resultId);
    if (!result) {
      autoInterpretHandledKeyRef.current = key;
      showToast("No se encontró el resultado para iniciar evolución.", "error");
      return;
    }

    setPendingResultContext({ id: result.id, title: result.title });
    setMenu("evolution");
    showToast("Modo interpretación abierto desde resultados.", "info");
    autoInterpretHandledKeyRef.current = key;
  }, [action, encounterId, resultId, showToast, state.results]);

  const orderedResults = useMemo(
    () => state.results.slice().sort((a, b) => (a.performedAt < b.performedAt ? 1 : -1)),
    [state.results]
  );

  const orderedReconsultations = useMemo(
    () => state.reconsultations.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [state.reconsultations]
  );

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === state.historyDraft.templateId) || templates.find((tpl) => tpl.isDefault) || null,
    [state.historyDraft.templateId, templates]
  );

  const selectedVitalsTemplate = useMemo(
    () => vitalsTemplates.find((template) => template.isDefault) || vitalsTemplates[0] || defaultVitalTemplates()[0] || null,
    [vitalsTemplates]
  );

  const readOnly = state.status === "closed";
  const evolutionReadOnly = false; // regla clínica: reconsultas append-only permitidas incluso con encounter cerrado
  const canClose = Boolean(state.diagnosis.principalCode);
  const readyResultsCount = useMemo(() => orderedResults.filter((result) => result.status === "ready").length, [orderedResults]);
  const snapshotDocument = useMemo(() => state.documents.find((doc) => doc.kind === "snapshot") || null, [state.documents]);
  const allergyAlerts = useMemo(
    () => state.patient.alerts.filter((alert) => alert.toLowerCase().includes("alerg")),
    [state.patient.alerts]
  );
  const suppliesSummary = useMemo(() => {
    const pricedItems = state.suppliesUsed.filter((item) => item.unitPrice !== null);
    const total = pricedItems.reduce((acc, item) => acc + (item.unitPrice || 0) * item.quantity, 0);
    return {
      count: state.suppliesUsed.length,
      hasPricing: pricedItems.length > 0,
      total
    };
  }, [state.suppliesUsed]);
  const mergedVitalVisibility = useMemo(() => {
    const visibility = { ...DEFAULT_VITAL_VISIBILITY };
    for (const field of selectedVitalsTemplate?.fields || []) {
      visibility[field.key] = Boolean(field.visible);
    }
    return visibility;
  }, [selectedVitalsTemplate]);

  const bodyMassIndex = state.vitals.bodyMassIndex ?? calculateBodyMassIndex(state.vitals.weightKg, state.vitals.heightCm);
  const draftPayload = useMemo(() => buildEncounterDraftPayload(state), [
    state
  ]);
  const draftComparable = useMemo(() => serializeDraftComparable(draftPayload), [draftPayload]);

  useEncounterEditor({
    uiPrefsKey: UI_PREFS_KEY,
    leftPanelOpen,
    rightPanelOpen,
    focusMode,
    setLeftPanelOpen,
    setRightPanelOpen,
    setFocusMode,
    isDirty
  });

  useEffect(() => {
    if (typeof window === "undefined" || !isDirty) return;
    const key = `${DRAFT_STORAGE_PREFIX}${encounterId}`;
    try {
      window.localStorage.setItem(key, JSON.stringify(draftPayload));
    } catch {
      // ignore local backup write errors
    }
  }, [draftPayload, encounterId, isDirty]);

  useEffect(() => {
    if (!restoringDraftRef.current) {
      setIsDirty(draftComparable !== autosaveBaselineRef.current);
    } else {
      restoringDraftRef.current = false;
    }
  }, [draftComparable]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (readOnly || !isDirty) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      const run = async () => {
        setAutosavingDraft(true);
        try {
          const response = await fetch(`/api/medical/encounters/${encodeURIComponent(state.id)}/draft`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(draftPayload)
          });
          const json = await response.json().catch(() => ({}));
          if (!response.ok || !json?.ok) {
            throw new Error(json?.error || "No se pudo guardar borrador.");
          }
          autosaveBaselineRef.current = draftComparable;
          setIsDirty(false);
          setLastDraftSavedAt(new Date().toISOString());
          draftAutosaveErrorToastRef.current = null;
        } catch {
          if (draftAutosaveErrorToastRef.current !== state.id) {
            draftAutosaveErrorToastRef.current = state.id;
            showToast("No se pudo sincronizar borrador en servidor. Se conserva respaldo local.", "info");
          }
        } finally {
          setAutosavingDraft(false);
        }
      };
      void run();
    }, 2500);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [draftComparable, draftPayload, isDirty, readOnly, showToast, state.id]);

  const bumpToOpen = useCallback((prev: EncounterState): EncounterState => {
    if (prev.status === "closed") return prev;
    if (prev.status === "draft") return { ...prev, status: "open" };
    return prev;
  }, []);

  const saveDraft = async () => {
    if (readOnly) {
      showToast("La consulta está cerrada y bloqueada para edición.", "error");
      return;
    }
    setState((prev) => bumpToOpen({ ...prev }));
    try {
      const response = await fetch(`/api/medical/encounters/${encodeURIComponent(state.id)}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftPayload)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error || "No se pudo guardar borrador.");
      }
      autosaveBaselineRef.current = draftComparable;
      setIsDirty(false);
      setLastDraftSavedAt(new Date().toISOString());
      showToast("Borrador clínico guardado.", "success");
    } catch {
      const key = `${DRAFT_STORAGE_PREFIX}${encounterId}`;
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(draftPayload));
        }
      } catch {
        // ignore
      }
      showToast("No se pudo guardar en servidor. Borrador resguardado localmente.", "info");
    }
  };

  const restoreLocalDraft = () => {
    if (!restoreDraftPayload) return;
    restoringDraftRef.current = true;
    setState((prev) => bumpToOpen(applyEncounterDraftPayload(prev, restoreDraftPayload)));
    autosaveBaselineRef.current = serializeDraftComparable(restoreDraftPayload);
    setIsDirty(false);
    setLastDraftSavedAt(restoreDraftPayload.savedAt);
    setRestoreDraftOpen(false);
    showToast("Borrador local restaurado.", "success");
  };

  const discardLocalDraft = () => {
    const key = `${DRAFT_STORAGE_PREFIX}${encounterId}`;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
    setRestoreDraftOpen(false);
    setRestoreDraftPayload(null);
    showToast("Se descartó el borrador local.", "info");
  };

  const exportPdf = () => {
    if (typeof window === "undefined") return;
    if (state.status === "closed" || state.signedSnapshotDocId) {
      openSignedSnapshot();
      return;
    }
    window.print();
  };

  const openSignedSnapshot = () => {
    if (typeof window === "undefined") return;
    window.open(`/api/medical/encounters/${encodeURIComponent(state.id)}/pdf`, "_blank", "noopener,noreferrer");
  };

  const closeEncounter = async () => {
    if (readOnly || closingAndSigning) return;
    if (!canClose) {
      showToast("No se puede cerrar: requiere diagnóstico principal CIE-10.", "error");
      return;
    }

    const signedAt = new Date().toISOString();
    const signedByName = state.closedByName || "Médico responsable";
    const snapshot: EncounterSnapshot = {
      encounterId: state.id,
      signedAt,
      signedByName,
      status: "closed",
      patient: state.patient,
      vitals: {
        ...state.vitals,
        bodyMassIndex
      },
      history: state.historyDraft,
      diagnosis: state.diagnosis,
      prescription: state.prescription,
      reconsultations: state.reconsultations,
      template: selectedTemplate,
      clinicalEvents: ["encounter.closed", "encounter.snapshot.created", ...state.clinicalEvents]
    };

    setClosingAndSigning(true);

    try {
      const res = await fetch(`/api/medical/encounters/${encodeURIComponent(state.id)}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis: { principalCode: state.diagnosis.principalCode },
          signedByName,
          snapshot
        })
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok && res.status !== 409) {
        throw new Error(json?.error || "No se pudo cerrar y firmar consulta.");
      }

      const closeData = (json?.data || null) as
        | {
            closedAt?: string;
            signedByName?: string;
            snapshotDocId?: string;
            snapshotVersion?: number;
            documents?: Array<{
              id: string;
              kind: "snapshot" | "pdf";
              title: string;
              createdAt: string;
              storageRef: string | null;
              snapshotVersion?: number | null;
            }>;
          }
        | null;

      const alreadySignedData = (res.status === 409 ? json?.data : null) as
        | { docId?: string; versionNo?: number; createdAt?: string; snapshot?: EncounterSnapshot }
        | null;

      setState((prev) => {
        const nextClosedAt = closeData?.closedAt || alreadySignedData?.snapshot?.signedAt || alreadySignedData?.createdAt || signedAt;
        const nextSignedByName = closeData?.signedByName || alreadySignedData?.snapshot?.signedByName || signedByName;
        const nextDocId = closeData?.snapshotDocId || alreadySignedData?.docId || prev.signedSnapshotDocId || `snapshot-${prev.id}`;
        const snapshotVersion = closeData?.snapshotVersion || alreadySignedData?.versionNo || 1;
        const apiDocuments = Array.isArray(closeData?.documents) ? closeData.documents : [];
        const normalizedApiDocuments: EncounterState["documents"] = apiDocuments.map((doc) => ({
          id: doc.id,
          kind: doc.kind === "pdf" ? "pdf" : "snapshot",
          title: doc.title,
          createdAt: doc.createdAt,
          storageRef: doc.storageRef,
          snapshotVersion: doc.snapshotVersion ?? snapshotVersion ?? null
        }));

        const nextDocuments: EncounterState["documents"] =
          normalizedApiDocuments.length > 0
            ? [...normalizedApiDocuments, ...prev.documents.filter((doc) => !normalizedApiDocuments.some((apiDoc) => apiDoc.id === doc.id))]
            : prev.documents.some((doc) => doc.id === nextDocId)
              ? prev.documents
              : [
                  {
                    id: nextDocId,
                    kind: "snapshot",
                    title: "Snapshot clínico firmado",
                    createdAt: alreadySignedData?.createdAt || signedAt,
                    storageRef: `/api/medical/encounters/${encodeURIComponent(prev.id)}/pdf`,
                    snapshotVersion: snapshotVersion ?? null
                  },
                  ...prev.documents
                ];

        return {
          ...prev,
          status: "closed",
          closedAt: nextClosedAt,
          closedByName: nextSignedByName,
          signedSnapshotDocId: nextDocId,
          documents: nextDocuments,
          clinicalEvents: ["encounter.closed", "encounter.snapshot.created", ...prev.clinicalEvents]
        };
      });

      if (res.status === 409) {
        showToast("Ya estaba firmada. Se bloqueó en modo lectura.", "info");
      } else {
        showToast("Consulta cerrada y firmada.", "success");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cerrar y firmar";
      showToast(message, "error");
      return;
    } finally {
      setClosingAndSigning(false);
    }
  };

  const requestCloseAndSign = () => {
    if (readOnly || closingAndSigning) return;
    if (!canClose) {
      showToast("No se puede cerrar: requiere diagnóstico principal CIE-10.", "error");
      return;
    }
    setConfirmChecklist({
      clinicalReview: false,
      principalDx: false,
      immutableSnapshot: false
    });
    setConfirmCloseOpen(true);
  };

  const confirmAndClose = async () => {
    if (!confirmChecklist.clinicalReview || !confirmChecklist.principalDx || !confirmChecklist.immutableSnapshot) return;
    setConfirmCloseOpen(false);
    await closeEncounter();
  };

  const applyTemplateToHistory = (templateId: string) => {
    const selected = templates.find((item) => item.id === templateId);
    if (!selected) return;

    setState((prev) => {
      const mergedSections = mergeHistorySectionsWithTemplate(selected, prev.historyDraft.sections);
      const legacy = deriveLegacyHistoryFields(mergedSections);
      return bumpToOpen({
        ...prev,
        historyDraft: {
          ...prev.historyDraft,
          templateId: selected.id,
          templateTitle: selected.title,
          templateTypeLabel: selected.type,
          sections: mergedSections,
          consultationReason: legacy.consultationReason,
          antecedentes: legacy.antecedentes,
          physicalExam: legacy.physicalExam
        }
      });
    });
  };

  const openInterpretResult = (result: EncounterResult) => {
    if (result.status !== "ready") {
      showToast("El resultado aún no está listo para interpretación.", "error");
      return;
    }
    setPendingResultContext({ id: result.id, title: result.title });
    setMenu("evolution");
    showToast("Resultado enviado a hoja de evolución append-only.", "info");
  };

  const openResultViewer = (result: EncounterResult) => {
    setResultsViewerResultId(result.id);
    setResultsViewerOpen(true);
  };

  const openSourceResultFromTimeline = (sourceResultId: string) => {
    const sourceResult = state.results.find((item) => item.id === sourceResultId);
    if (!sourceResult) {
      showToast("No se encontró el resultado fuente de esta reconsulta.", "error");
      return;
    }
    setResultsViewerResultId(sourceResult.id);
    setResultsViewerOpen(true);
  };

  const openQuickResults = () => {
    if (orderedResults.length === 0) {
      showToast("No hay resultados para mostrar.", "info");
      return;
    }
    setMenu("results");
    setResultsViewerResultId(orderedResults[0]?.id || null);
    setResultsViewerOpen(true);
  };

  const startQuickEvolution = () => {
    setPendingResultContext(null);
    setMenu("evolution");
    setEvolutionFocusSignal((prev) => prev + 1);
    showToast("Listo para registrar Nueva evolución (nota clínica adicional).", "info");
  };

  const focusDiagnosisSpotlight = useCallback(() => {
    if (readOnly) return;
    setMenu("diagnostics");
    window.requestAnimationFrame(() => {
      const input = document.getElementById(DX_SPOTLIGHT_INPUT_ID) as HTMLInputElement | null;
      input?.focus();
      input?.select();
    });
  }, [readOnly]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const withMeta = event.ctrlKey || event.metaKey;

      if (withMeta && key === "k") {
        event.preventDefault();
        focusDiagnosisSpotlight();
        return;
      }

      if (withMeta && event.key === "Enter") {
        if (menu !== "evolution" || savingReconsulta) return;
        event.preventDefault();
        setEvolutionSaveSignal((prev) => prev + 1);
        return;
      }

      if (event.key !== "Escape") return;
      if (resultsViewerOpen) {
        event.preventDefault();
        setResultsViewerOpen(false);
        return;
      }
      if (confirmCloseOpen) {
        event.preventDefault();
        setConfirmCloseOpen(false);
        return;
      }
      if (restoreDraftOpen) {
        event.preventDefault();
        setRestoreDraftOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmCloseOpen, focusDiagnosisSpotlight, menu, restoreDraftOpen, resultsViewerOpen, savingReconsulta]);

  const appendManualReconsulta = useCallback(
    async (payload: AppendPayload): Promise<boolean> => {
      if (savingReconsulta) return false;

      const requestPayload = buildReconsultaPayload(payload);

      const appendInMockState = (overrideEntry?: EncounterReconsulta) => {
        setState((prev) => {
          const entry: EncounterReconsulta =
            overrideEntry ||
            ({
              id: `recon-${Date.now()}`,
              parentEncounterId: prev.id,
              type: requestPayload.type,
              sourceResultId: requestPayload.sourceResultId,
              sourceResultTitle: requestPayload.sourceResultTitle,
              createdAt: new Date().toISOString(),
              authorName: prev.closedByName || "Médico responsable",
              interpretation: requestPayload.interpretation,
              conduct: requestPayload.conduct,
              therapeuticAdjustment: requestPayload.therapeuticAdjustment,
              noteRich: requestPayload.noteRich,
              entryTitle: requestPayload.entryTitle
            } satisfies EncounterReconsulta);

          const nextReconsultations = [entry, ...prev.reconsultations];
          return bumpToOpen({
            ...prev,
            reconsultations: nextReconsultations,
            followUps: buildFollowUpsFromReconsultations(nextReconsultations),
            clinicalEvents: ["encounter.reconsulta.created", ...prev.clinicalEvents]
          });
        });
      };

      if (baseDataSource !== "real") {
        appendInMockState();
        showToast("Reconsulta guardada.", "success");
        return true;
      }

      setSavingReconsulta(true);
      let savedRealEntry: EncounterReconsulta | null = null;

      try {
        savedRealEntry = await postReconsulta(state.id, requestPayload);
        const refreshed = await fetchReconsultations(state.id);
        setState((prev) =>
          bumpToOpen({
            ...prev,
            reconsultations: refreshed,
            followUps: buildFollowUpsFromReconsultations(refreshed),
            clinicalEvents: ["encounter.reconsulta.created", ...prev.clinicalEvents]
          })
        );
        showToast("Reconsulta guardada.", "success");
        return true;
      } catch {
        if (savedRealEntry) {
          setState((prev) => {
            const dedup = [savedRealEntry!, ...prev.reconsultations.filter((entry) => entry.id !== savedRealEntry!.id)];
            return bumpToOpen({
              ...prev,
              reconsultations: dedup,
              followUps: buildFollowUpsFromReconsultations(dedup),
              clinicalEvents: ["encounter.reconsulta.created", ...prev.clinicalEvents]
            });
          });
          showToast("Reconsulta guardada.", "success");
          return true;
        }

        try {
          appendInMockState();
          setBaseDataSource("mock");
          showToast("Usando modo mock para guardar reconsulta.", "info");
          return true;
        } catch {
          showToast("No se pudo guardar reconsulta.", "error");
          return false;
        }
      } finally {
        setSavingReconsulta(false);
      }
    },
    [baseDataSource, bumpToOpen, savingReconsulta, showToast, state.id]
  );

  const appendSupply = useCallback(
    async (payload: EncounterSupplyPostPayload): Promise<boolean> => {
      if (readOnly) {
        showToast("Consulta cerrada: no se pueden modificar insumos.", "error");
        return false;
      }
      if (savingSupply) return false;

      const appendInMockState = (overrideEntry?: EncounterSupplyItem) => {
        setState((prev) => {
          const entry: EncounterSupplyItem =
            overrideEntry ||
            ({
              id: `sup-${Date.now()}`,
              encounterId: prev.id,
              source: payload.source,
              inventoryItemId: payload.inventoryItemId,
              sku: payload.sku,
              name: payload.name,
              unit: payload.unit,
              quantity: Math.max(1, Math.round(payload.quantity)),
              unitPrice: payload.unitPrice,
              notes: payload.notes,
              createdAt: new Date().toISOString(),
              createdByName: prev.closedByName || "Médico responsable"
            } satisfies EncounterSupplyItem);
          return {
            ...prev,
            suppliesUsed: [entry, ...prev.suppliesUsed]
          };
        });
      };

      if (baseDataSource !== "real") {
        appendInMockState();
        showToast("Insumo guardado.", "success");
        return true;
      }

      setSavingSupply(true);
      try {
        await postEncounterSupply(state.id, payload);
        const refreshed = await fetchEncounterSupplies(state.id);
        setState((prev) => ({ ...prev, suppliesUsed: refreshed }));
        showToast("Insumo guardado.", "success");
        return true;
      } catch (error) {
        try {
          appendInMockState();
          showToast("Insumo guardado en modo mock.", "info");
          return true;
        } catch {
          showToast(error instanceof Error ? error.message : "No se pudo guardar insumo.", "error");
          return false;
        }
      } finally {
        setSavingSupply(false);
      }
    },
    [baseDataSource, readOnly, savingSupply, showToast, state.id]
  );

  const removeSupply = useCallback(
    async (supplyId: string): Promise<boolean> => {
      if (readOnly) {
        showToast("Consulta cerrada: no se pueden modificar insumos.", "error");
        return false;
      }
      if (savingSupply) return false;

      const removeFromMockState = () => {
        setState((prev) => ({
          ...prev,
          suppliesUsed: prev.suppliesUsed.filter((item) => item.id !== supplyId)
        }));
      };

      if (baseDataSource !== "real") {
        removeFromMockState();
        showToast("Insumo eliminado.", "success");
        return true;
      }

      setSavingSupply(true);
      try {
        await deleteEncounterSupply(state.id, supplyId);
        const refreshed = await fetchEncounterSupplies(state.id);
        setState((prev) => ({ ...prev, suppliesUsed: refreshed }));
        showToast("Insumo eliminado.", "success");
        return true;
      } catch (error) {
        try {
          removeFromMockState();
          showToast("Insumo eliminado en modo mock.", "info");
          return true;
        } catch {
          showToast(error instanceof Error ? error.message : "No se pudo eliminar insumo.", "error");
          return false;
        }
      } finally {
        setSavingSupply(false);
      }
    },
    [baseDataSource, readOnly, savingSupply, showToast, state.id]
  );

  const appendOrder = useCallback(
    async (payload: EncounterOrderPostPayload): Promise<boolean> => {
      if (readOnly) {
        showToast("Consulta cerrada: no se pueden modificar órdenes médicas.", "error");
        return false;
      }
      if (savingOrder) return false;

      const appendInMockState = (overrideEntry?: EncounterOrderRequestItem) => {
        setState((prev) => {
          const nowIso = new Date().toISOString();
          const actorName = prev.closedByName || "Médico responsable";
          const entry: EncounterOrderRequestItem =
            overrideEntry ||
            ({
              id: `ordreq-${Date.now()}`,
              encounterId: prev.id,
              modality: payload.modality,
              assignedToService: payload.modality,
              serviceId: payload.serviceId,
              serviceCode: payload.serviceCode,
              title: payload.title,
              quantity: Math.max(1, Math.round(payload.quantity || 1)),
              notes: payload.notes,
              priority: payload.priority,
              status: payload.status || "ordered",
              createdAt: nowIso,
              createdByName: actorName,
              updatedAt: nowIso,
              updatedByName: actorName
            } satisfies EncounterOrderRequestItem);
          return bumpToOpen({
            ...prev,
            orderRequests: [entry, ...prev.orderRequests]
          });
        });
      };

      if (baseDataSource !== "real") {
        appendInMockState();
        showToast("Orden guardada.", "success");
        return true;
      }

      setSavingOrder(true);
      try {
        await postEncounterOrder(state.id, payload);
        const refreshed = await fetchEncounterOrders(state.id);
        setState((prev) => bumpToOpen({ ...prev, orderRequests: refreshed }));
        showToast("Orden guardada.", "success");
        return true;
      } catch {
        appendInMockState();
        showToast("Orden guardada en modo mock.", "info");
        return true;
      } finally {
        setSavingOrder(false);
      }
    },
    [baseDataSource, bumpToOpen, readOnly, savingOrder, showToast, state.id]
  );

  const updateOrder = useCallback(
    async (orderId: string, payload: EncounterOrderPatchPayload): Promise<boolean> => {
      if (readOnly) {
        showToast("Consulta cerrada: no se pueden modificar órdenes médicas.", "error");
        return false;
      }
      if (savingOrder) return false;

      const updateInMockState = () => {
        const nowIso = new Date().toISOString();
        setState((prev) =>
          bumpToOpen({
            ...prev,
            orderRequests: prev.orderRequests.map((item) =>
              item.id === orderId
                ? {
                    ...item,
                    notes: payload.notes === undefined ? item.notes : payload.notes,
                    priority: payload.priority || item.priority,
                    status: payload.status || item.status,
                    updatedAt: nowIso,
                    updatedByName: prev.closedByName || "Médico responsable"
                  }
                : item
            )
          })
        );
      };

      if (baseDataSource !== "real") {
        updateInMockState();
        showToast("Orden actualizada.", "success");
        return true;
      }

      setSavingOrder(true);
      try {
        await patchEncounterOrder(state.id, orderId, payload);
        const refreshed = await fetchEncounterOrders(state.id);
        setState((prev) => bumpToOpen({ ...prev, orderRequests: refreshed }));
        showToast("Orden actualizada.", "success");
        return true;
      } catch {
        updateInMockState();
        showToast("Orden actualizada en modo mock.", "info");
        return true;
      } finally {
        setSavingOrder(false);
      }
    },
    [baseDataSource, bumpToOpen, readOnly, savingOrder, showToast, state.id]
  );

  const removeOrder = useCallback(
    async (orderId: string): Promise<boolean> => {
      if (readOnly) {
        showToast("Consulta cerrada: no se pueden modificar órdenes médicas.", "error");
        return false;
      }
      if (savingOrder) return false;

      const removeInMockState = () => {
        setState((prev) => bumpToOpen({
          ...prev,
          orderRequests: prev.orderRequests.filter((item) => item.id !== orderId)
        }));
      };

      if (baseDataSource !== "real") {
        removeInMockState();
        showToast("Orden eliminada.", "success");
        return true;
      }

      setSavingOrder(true);
      try {
        await deleteEncounterOrder(state.id, orderId);
        const refreshed = await fetchEncounterOrders(state.id);
        setState((prev) => bumpToOpen({ ...prev, orderRequests: refreshed }));
        showToast("Orden eliminada.", "success");
        return true;
      } catch {
        removeInMockState();
        showToast("Orden eliminada en modo mock.", "info");
        return true;
      } finally {
        setSavingOrder(false);
      }
    },
    [baseDataSource, bumpToOpen, readOnly, savingOrder, showToast, state.id]
  );

  const printOrderByModality = useCallback(
    async (modality: EncounterOrderRequestModality) => {
      const modalityItems = state.orderRequests.filter((item) => item.modality === modality);
      const globalNote = state.orderGlobalNotes[modality] || "";
      setPrintOrderMode(modality);
      try {
        let branding = documentBrandingTemplate;
        try {
          const res = await fetch(`/api/medical/document-branding?scope=${orderScope(modality)}`, { cache: "no-store" });
          const json = await res.json().catch(() => ({}));
          if (res.ok && json?.ok) {
            const items = Array.isArray(json?.data?.items) ? (json.data.items as DocumentBrandingTemplate[]) : [];
            if (items.length > 0) {
              branding = pickDefaultDocumentBrandingTemplate(items, orderScope(modality));
            }
          }
        } catch {
          // fallback to clinical branding in memory
        }

        const html = buildOrderPrintableHtml({
          encounter: state,
          modality,
          items: modalityItems,
          globalNote,
          branding
        });
        const printWindow = window.open("", "_blank", "noopener,noreferrer,width=960,height=820");
        if (!printWindow) {
          showToast("No se pudo abrir la vista de impresión.", "error");
          return;
        }
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      } finally {
        setTimeout(() => setPrintOrderMode(null), 500);
      }
    },
    [documentBrandingTemplate, showToast, state]
  );

  const latestEncounter = state.recentHistories[0] ?? null;

  const printSections = state.historyDraft.sections.map((section) => ({
    id: section.sectionId,
    title: section.title,
    fields: section.fields
      .filter((field) => field.visible)
      .map((field) => {
        if (field.kind === "rich_text") return { label: field.label, text: field.richValue.text || "—" };
        if (field.kind === "number") return { label: field.label, text: field.numberValue === null ? "—" : String(field.numberValue) };
        return { label: field.label, text: field.textValue || "—" };
      })
  }));

  const isMobileViewport = viewportTier === "mobile";
  const showInlineLeftPanel = !focusMode && leftPanelOpen && !isMobileViewport;
  const showInlineRightPanel = !focusMode && rightPanelOpen && !isMobileViewport;

  const workspaceGridClass = showInlineLeftPanel && showInlineRightPanel
    ? "lg:grid-cols-[290px_minmax(0,1fr)_340px]"
    : showInlineLeftPanel
      ? "lg:grid-cols-[290px_minmax(0,1fr)]"
      : showInlineRightPanel
        ? "lg:grid-cols-[minmax(0,1fr)_340px]"
        : "lg:grid-cols-[minmax(0,1fr)]";
  const isDocumentWorkspaceTab = menu === "history" || menu === "evolution";

  const workspaceToggleClass = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
      active
        ? "border-[#2e75ba] bg-[#e8f2ff] text-[#2e75ba]"
        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
    );

  const printSheetStyle: CSSProperties = {
    backgroundImage: documentBrandingTemplate.backgroundImageUrl ? `url(${documentBrandingTemplate.backgroundImageUrl})` : undefined,
    backgroundSize: documentBrandingTemplate.backgroundImageUrl
      ? `${Math.round(documentBrandingTemplate.backgroundScale * 100)}% auto`
      : undefined,
    backgroundRepeat: documentBrandingTemplate.backgroundImageUrl ? "no-repeat" : undefined,
    backgroundPosition: documentBrandingTemplate.backgroundImageUrl
      ? brandingBackgroundPosition(documentBrandingTemplate.backgroundPosition)
      : undefined
  };

  const toggleFocusLayout = () => {
    if (!focusMode) {
      setFocusMode(true);
      setLeftPanelOpen(false);
      setRightPanelOpen(false);
      return;
    }

    setFocusMode(false);
    if (viewportTier === "2xl" || viewportTier === "xl") {
      setLeftPanelOpen(true);
      setRightPanelOpen(true);
      return;
    }
    if (viewportTier === "lg") {
      setLeftPanelOpen(true);
      setRightPanelOpen(false);
      return;
    }
    setLeftPanelOpen(false);
    setRightPanelOpen(false);
  };

  const toggleLeftPanel = () => {
    if (isMobileViewport) {
      setLeftPanelOpen((prev) => !prev);
      setRightPanelOpen(false);
      return;
    }
    if (focusMode) setFocusMode(false);
    setLeftPanelOpen((prev) => !prev);
  };

  const toggleRightPanel = () => {
    if (isMobileViewport) {
      setRightPanelOpen((prev) => !prev);
      setLeftPanelOpen(false);
      return;
    }
    if (focusMode) setFocusMode(false);
    setRightPanelOpen((prev) => !prev);
  };

  const leftPanelContent = (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Signos vitales</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {mergedVitalVisibility.bloodPressure ? (
            <div className={cn("rounded-lg border px-3 py-2", vitalAlertClass({ key: "bloodPressure", value: state.vitals.bloodPressure }))}>
              <p className="text-xs text-slate-500">TA</p>
              <p className="font-semibold text-slate-900">{valueOrDash(state.vitals.bloodPressure)}</p>
            </div>
          ) : null}
          {mergedVitalVisibility.heartRate ? (
            <div className={cn("rounded-lg border px-3 py-2", vitalAlertClass({ key: "heartRate", value: state.vitals.heartRate }))}>
              <p className="text-xs text-slate-500">FC</p>
              <p className="font-semibold text-slate-900">{valueOrDash(state.vitals.heartRate)} lpm</p>
            </div>
          ) : null}
          {mergedVitalVisibility.respRate ? (
            <div className={cn("rounded-lg border px-3 py-2", vitalAlertClass({ key: "respRate", value: state.vitals.respRate }))}>
              <p className="text-xs text-slate-500">FR</p>
              <p className="font-semibold text-slate-900">{valueOrDash(state.vitals.respRate)} rpm</p>
            </div>
          ) : null}
          {mergedVitalVisibility.temperatureC ? (
            <div className={cn("rounded-lg border px-3 py-2", vitalAlertClass({ key: "temperatureC", value: state.vitals.temperatureC }))}>
              <p className="text-xs text-slate-500">Temp</p>
              <p className="font-semibold text-slate-900">{valueOrDash(state.vitals.temperatureC)} °C</p>
            </div>
          ) : null}
          {mergedVitalVisibility.spo2 ? (
            <div className={cn("rounded-lg border px-3 py-2", vitalAlertClass({ key: "spo2", value: state.vitals.spo2 }))}>
              <p className="text-xs text-slate-500">SpO2</p>
              <p className="font-semibold text-slate-900">{valueOrDash(state.vitals.spo2)} %</p>
            </div>
          ) : null}
          {mergedVitalVisibility.weightKg ? (
            <div className={cn("rounded-lg border px-3 py-2", vitalAlertClass({ key: "weightKg", value: state.vitals.weightKg }))}>
              <p className="text-xs text-slate-500">Peso</p>
              <p className="font-semibold text-slate-900">{valueOrDash(state.vitals.weightKg)} kg</p>
            </div>
          ) : null}
          {mergedVitalVisibility.heightCm ? (
            <div className={cn("rounded-lg border px-3 py-2", vitalAlertClass({ key: "heightCm", value: state.vitals.heightCm }))}>
              <p className="text-xs text-slate-500">Talla</p>
              <p className="font-semibold text-slate-900">{valueOrDash(state.vitals.heightCm)} cm</p>
            </div>
          ) : null}
          {mergedVitalVisibility.glucometryMgDl ? (
            <div className={cn("rounded-lg border px-3 py-2", vitalAlertClass({ key: "glucometryMgDl", value: state.vitals.glucometryMgDl }))}>
              <p className="text-xs text-slate-500">Glucometría</p>
              <p className="font-semibold text-slate-900">{valueOrDash(state.vitals.glucometryMgDl)} mg/dL</p>
            </div>
          ) : null}
          {mergedVitalVisibility.abdominalCircumferenceCm ? (
            <div className={cn("rounded-lg border px-3 py-2", vitalAlertClass({ key: "abdominalCircumferenceCm", value: state.vitals.abdominalCircumferenceCm }))}>
              <p className="text-xs text-slate-500">Circ. abdominal</p>
              <p className="font-semibold text-slate-900">{valueOrDash(state.vitals.abdominalCircumferenceCm)} cm</p>
            </div>
          ) : null}
          {mergedVitalVisibility.bodyMassIndex ? (
            <div className={cn("rounded-lg border px-3 py-2", vitalAlertClass({ key: "bodyMassIndex", value: bodyMassIndex }))}>
              <p className="text-xs text-slate-500">IMC</p>
              <p className="font-semibold text-slate-900">{valueOrDash(bodyMassIndex)}</p>
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => showToast("TODO: conectar histórico de vitales desde backend clínico.", "info")}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Ver histórico de vitales
      </button>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Info adicional</p>
        <div className="mt-2 space-y-2 text-sm text-slate-700">
          <p>
            Última visita: <span className="font-semibold">{latestEncounter?.date || "Sin registro"}</span>
          </p>
          <p>
            Médico tratante: <span className="font-semibold">{state.closedByName || "Médico responsable"}</span>
          </p>
          <p>
            Captura triage: <span className="font-semibold">{formatDateTime(state.vitals.capturedAt)}</span>
          </p>
          <p>
            Plantilla: <span className="font-semibold">{state.historyDraft.templateTitle || "No definida"}</span>
          </p>
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600">
          {templateLoading || vitalsTemplateLoading
            ? "Cargando plantillas clínicas y de signos vitales..."
            : "Formulario clínico y vitales configurados desde admin."}
        </div>
      </div>
    </div>
  );

  const rightPanelContent = (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Últimos exámenes</p>
        <div className="mt-3 space-y-2">
          {orderedResults.slice(0, 6).map((result) => {
            const canInterpret = result.status === "ready" && !readOnly;
            return (
              <article key={result.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                <p className="text-sm font-semibold text-slate-900">{result.title}</p>
                <p className="text-xs text-slate-500">
                  {resultTypeLabel(result.type)} · {formatDateTime(result.performedAt)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openResultViewer(result)}
                    className="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Ver detalle
                  </button>
                  <button
                    type="button"
                    onClick={() => openInterpretResult(result)}
                    disabled={!canInterpret}
                    className={cn(
                      "rounded px-2 py-1 text-[11px] font-semibold text-white",
                      canInterpret ? "bg-[#2e75ba]" : "cursor-not-allowed bg-slate-300"
                    )}
                  >
                    Interpretar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Evoluciones previas</p>
        <div className="mt-3 space-y-2">
          {orderedReconsultations.length === 0 ? (
            state.recentHistories.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600">
                Sin reconsultas previas. Las evoluciones append-only aparecerán aquí.
              </p>
            ) : (
              state.recentHistories.slice(0, 4).map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Encounter previo</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item.principalDxCode || "DX sin código"}</p>
                  <p className="mt-1 text-xs text-slate-600">{item.summary}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{item.date}</p>
                </article>
              ))
            )
          ) : (
            orderedReconsultations.slice(0, 6).map((entry) => (
              <article key={entry.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reconsulta</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{entry.entryTitle}</p>
                <p className="mt-1 line-clamp-3 text-xs text-slate-600">{notePreviewText(entry)}</p>
                <p className="mt-1 text-[11px] text-slate-500">{formatDateTime(entry.createdAt)}</p>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="encounter-workspace space-y-4 print:hidden">
        <ConsultHeader
          patient={state.patient}
          status={state.status}
          canClose={canClose}
          readOnly={readOnly || closingAndSigning}
          onSaveDraft={() => void saveDraft()}
          onCloseAndSign={requestCloseAndSign}
          onExportPdf={exportPdf}
        />

        <section className="sticky top-[104px] z-20 rounded-2xl border border-slate-200 bg-white/95 shadow-soft backdrop-blur">
          <button
            type="button"
            onClick={() => setTopRailCollapsed((prev) => !prev)}
            className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left"
            aria-expanded={!topRailCollapsed}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Rail contextual</p>
              <p className="text-xs text-slate-600">Alertas + acciones rápidas · Ctrl+K diagnóstico · Ctrl+Enter guardar evolución</p>
            </div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
              {topRailCollapsed ? "Expandir" : "Colapsar"}
              {topRailCollapsed ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
            </span>
          </button>
          {!topRailCollapsed ? (
            <div className="space-y-2.5 border-t border-slate-200 px-4 pb-3 pt-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#2e75ba]/25 bg-[#f2f8ff] px-2.5 py-1 text-[11px] font-semibold text-[#2e75ba]">
                  Estado: {encounterStatusLabel(state.status)}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  Reconsultas: {baseDataSource === "real" ? "reales" : "simuladas"}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  Resultados: {resultsDataSource === "real" ? "reales" : "simulados"}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {suppliesSummary.hasPricing
                    ? `Insumos usados: Q${suppliesSummary.total.toFixed(2)}`
                    : `Insumos usados: ${suppliesSummary.count}`}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  Órdenes: {state.orderRequests.length}
                </span>
                {printOrderMode ? (
                  <span className="rounded-full border border-[#4aadf5]/35 bg-[#4aadf5]/10 px-2.5 py-1 text-[11px] font-semibold text-[#2e75ba]">
                    Imprimiendo orden {printOrderMode}
                  </span>
                ) : null}
                {allergyAlerts.length > 0 ? (
                  allergyAlerts.map((alert) => (
                    <span
                      key={`rail-alert-${alert}`}
                      className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900"
                    >
                      Alergia: {alert}
                    </span>
                  ))
                ) : null}
                {!canClose && !readOnly ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                    <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                    Dx principal pendiente
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openQuickResults}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ver resultados
                </button>
                <button
                  type="button"
                  onClick={startQuickEvolution}
                  className="rounded-lg bg-[#2e75ba] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  Nueva evolución (nota clínica adicional)
                </button>
                <button
                  type="button"
                  onClick={focusDiagnosisSpotlight}
                  disabled={readOnly}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                    readOnly
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                      : "border-[#2e75ba]/25 bg-[#f2f8ff] text-[#2e75ba] hover:bg-[#e8f2ff]"
                  )}
                >
                  Ir a diagnóstico
                </button>
                <button
                  type="button"
                  onClick={exportPdf}
                  className="rounded-lg border border-[#4aa59c]/35 bg-[#4aa59c]/10 px-3 py-1.5 text-xs font-semibold text-[#2e75ba] hover:bg-[#4aa59c]/20"
                >
                  Exportar PDF
                </button>
                {state.status === "closed" || state.signedSnapshotDocId ? (
                  <button
                    type="button"
                    onClick={openSignedSnapshot}
                    className="rounded-lg border border-[#2e75ba]/30 bg-[#f2f8ff] px-3 py-1.5 text-xs font-semibold text-[#2e75ba] hover:bg-[#e8f2ff]"
                  >
                    Ver snapshot
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={requestCloseAndSign}
                  disabled={readOnly || !canClose}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold text-white",
                    readOnly || !canClose ? "cursor-not-allowed bg-slate-300" : "bg-rose-600 hover:bg-rose-700"
                  )}
                >
                  Cerrar y firmar
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="sticky top-[176px] z-10 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-soft backdrop-blur">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <EncounterInternalMenu active={menu} onChange={setMenu} />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleFocusLayout}
                className={workspaceToggleClass(focusMode)}
                aria-pressed={focusMode}
              >
                <Focus className="h-4 w-4" />
                <span>Enfoque</span>
              </button>
              <button
                type="button"
                onClick={toggleLeftPanel}
                className={workspaceToggleClass(showInlineLeftPanel || (isMobileViewport && leftPanelOpen))}
                aria-pressed={showInlineLeftPanel || (isMobileViewport && leftPanelOpen)}
              >
                <PanelLeft className="h-4 w-4" />
                <span>Contexto</span>
              </button>
              <button
                type="button"
                onClick={toggleRightPanel}
                className={workspaceToggleClass(showInlineRightPanel || (isMobileViewport && rightPanelOpen))}
                aria-pressed={showInlineRightPanel || (isMobileViewport && rightPanelOpen)}
              >
                <PanelRight className="h-4 w-4" />
                <span>Resultados</span>
              </button>
            </div>
          </div>
        </section>

        {hasResultId ? (
          <div className="rounded-xl border border-[#4aadf5]/35 bg-[#4aadf5]/10 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Contexto de reconsulta</p>
            <p className="mt-1 text-sm font-semibold text-[#2e75ba]">
              Resultado seleccionado: <span className="font-mono">{resultId}</span>
            </p>
          </div>
        ) : null}

        <div className={cn("grid grid-cols-1 gap-4", workspaceGridClass, !isMobileViewport && "lg:h-[calc(100vh-335px)]")}>
          {showInlineLeftPanel ? (
            <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft lg:h-full lg:overflow-y-auto">
              {leftPanelContent}
            </aside>
          ) : null}

          <section className="lg:min-w-0 lg:h-full lg:overflow-y-auto">
            <div
              className={cn(
                "mx-auto w-full",
                isDocumentWorkspaceTab
                  ? "max-w-[850px]"
                  : "max-w-[8.65in] rounded-[28px] border border-slate-200 bg-white px-4 py-5 shadow-soft lg:px-8 lg:py-7"
              )}
            >

            {menu === "history" && (
              <ClinicalHistoryPanel
                history={state.historyDraft}
                onChangeHistory={(next) =>
                  setState((prev) =>
                    bumpToOpen({
                      ...prev,
                      historyDraft: next
                    })
                  )
                }
                diagnosis={state.diagnosis}
                onChangeDiagnosis={(next) => setState((prev) => bumpToOpen({ ...prev, diagnosis: next }))}
                vitals={{
                  ...state.vitals,
                  bodyMassIndex
                }}
                recentHistories={state.recentHistories}
                readOnly={readOnly}
                showDiagnosisCard={false}
                showRightRail={false}
                templates={templates}
                onSelectTemplate={applyTemplateToHistory}
                documentViewMode={historyViewMode}
                onChangeDocumentViewMode={setHistoryViewMode}
                vitalVisibility={mergedVitalVisibility}
                brandingTemplate={documentBrandingTemplate}
              />
            )}

            {menu === "diagnostics" && (
              <DiagnosisPanel
                diagnosis={state.diagnosis}
                onChangeDiagnosis={(next) => setState((prev) => bumpToOpen({ ...prev, diagnosis: next }))}
                readOnly={readOnly}
                onToast={showToast}
              />
            )}

            {menu === "prescription" && (
              <PrescriptionPanel
                items={state.prescription}
                onChange={(next) => setState((prev) => bumpToOpen({ ...prev, prescription: next }))}
                readOnly={readOnly}
                onToast={showToast}
              />
            )}

            {menu === "supplies" && (
              <SuppliesPanel
                items={state.suppliesUsed}
                readOnly={readOnly}
                loading={loadingSupplies}
                saving={savingSupply}
                onAddSupply={appendSupply}
                onRemoveSupply={removeSupply}
                onToast={showToast}
              />
            )}

            {menu === "orders" && (
              <OrdersPanel
                items={state.orderRequests}
                globalNotes={state.orderGlobalNotes}
                readOnly={readOnly}
                loading={loadingOrders}
                saving={savingOrder}
                onAddOrder={appendOrder}
                onRemoveOrder={removeOrder}
                onUpdateOrder={updateOrder}
                onChangeGlobalNotes={(next: EncounterOrderGlobalNotes) =>
                  setState((prev) =>
                    bumpToOpen({
                      ...prev,
                      orderGlobalNotes: next
                    })
                  )
                }
                onPrintOrder={(modality) => void printOrderByModality(modality)}
                onToast={showToast}
              />
            )}

            {menu === "results" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  Revisa resultados en visor embebido (PDF, imágenes y valores estructurados) e interpreta en una nueva evolución append-only.
                </div>

                <div className="space-y-3">
                  {orderedResults.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-sm text-slate-600">
                      Sin resultados disponibles para este encounter.
                    </div>
                  ) : (
                    orderedResults.map((result) => {
                      const canInterpret = result.status === "ready" && !readOnly;
                      return (
                        <article key={result.id} className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{result.title}</p>
                              <p className="text-xs text-slate-500">
                                {resultTypeLabel(result.type)} · {formatDateTime(result.performedAt)}
                              </p>
                            </div>
                            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", resultStatusPill(result.status))}>
                              {resultStatusLabel(result.status)}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openResultViewer(result)}
                              disabled={!result.pdfUrl}
                              className={cn(
                                "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                                result.pdfUrl
                                  ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                              )}
                            >
                              Ver PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => openResultViewer(result)}
                              disabled={result.imageUrls.length === 0}
                              className={cn(
                                "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                                result.imageUrls.length > 0
                                  ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                              )}
                            >
                              Ver imágenes
                            </button>
                            <button
                              type="button"
                              onClick={() => openResultViewer(result)}
                              disabled={result.values.length === 0}
                              className={cn(
                                "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                                result.values.length > 0
                                  ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                              )}
                            >
                              Ver valores
                            </button>
                            <button
                              type="button"
                              onClick={() => openResultViewer(result)}
                              className="rounded-lg border border-[#4aadf5]/40 bg-[#f2f8ff] px-3 py-1.5 text-xs font-semibold text-[#2e75ba] hover:bg-[#e8f2ff]"
                            >
                              Ver detalle
                            </button>
                            <button
                              type="button"
                              onClick={() => openInterpretResult(result)}
                              disabled={!canInterpret}
                              className={cn(
                                "rounded-lg px-3 py-1.5 text-xs font-semibold text-white",
                                canInterpret ? "bg-[#2e75ba] hover:opacity-90" : "cursor-not-allowed bg-slate-300"
                              )}
                            >
                              Interpretar
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {menu === "evolution" && (
              <EvolutionPanel
                status={state.status}
                readOnly={evolutionReadOnly}
                saving={savingReconsulta}
                reconsultations={orderedReconsultations}
                history={state.historyDraft}
                pendingResultContext={pendingResultContext}
                onConsumePendingResultContext={() => setPendingResultContext(null)}
                onAppendManualReconsulta={appendManualReconsulta}
                onViewSourceResult={openSourceResultFromTimeline}
                focusEditorSignal={evolutionFocusSignal}
                saveShortcutSignal={evolutionSaveSignal}
                documentViewMode={evolutionViewMode}
                onChangeDocumentViewMode={setEvolutionViewMode}
                brandingTemplate={documentBrandingTemplate}
              />
            )}
            </div>
          </section>

          {showInlineRightPanel ? (
            <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft lg:h-full lg:overflow-y-auto">
              <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Resultados & Histórico</p>
                <button
                  type="button"
                  onClick={toggleRightPanel}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  aria-label="Ocultar panel derecho"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
              {rightPanelContent}
            </aside>
          ) : null}
        </div>

        {isMobileViewport && leftPanelOpen ? (
          <>
            <button
              type="button"
              aria-label="Cerrar panel de contexto"
              onClick={() => setLeftPanelOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-[1px]"
            />
            <aside className="fixed inset-y-0 left-0 z-50 w-[min(92vw,320px)] overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-lg">
              <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Contexto clínico</p>
                <button
                  type="button"
                  onClick={() => setLeftPanelOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  aria-label="Cerrar panel contexto"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
              </div>
              {leftPanelContent}
            </aside>
          </>
        ) : null}

        {isMobileViewport && rightPanelOpen ? (
          <>
            <button
              type="button"
              aria-label="Cerrar panel de resultados"
              onClick={() => setRightPanelOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-[1px]"
            />
            <aside className="fixed inset-y-0 right-0 z-50 w-[min(92vw,340px)] overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-lg">
              <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Resultados & histórico</p>
                <button
                  type="button"
                  onClick={() => setRightPanelOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  aria-label="Cerrar panel resultados"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
              {rightPanelContent}
            </aside>
          </>
        ) : null}

        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-900">
              <CheckCircleIcon className="h-4 w-4" />
              Sesión clínica activa
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold">
              <ClockIcon className="h-4 w-4" />
              {autosavingDraft
                ? "Guardando borrador..."
                : `Último borrador: ${lastDraftSavedAt ? formatDateTime(lastDraftSavedAt) : "No guardado"}`}
            </span>
            {isDirty ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-900">
                Cambios pendientes
              </span>
            ) : null}
            {state.signedSnapshotDocId ? (
              <>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#4aa59c]/35 bg-[#4aa59c]/10 px-2 py-0.5 font-semibold text-[#0f4f49]">
                  Snapshot: {state.signedSnapshotDocId}
                </span>
                <button
                  type="button"
                  onClick={openSignedSnapshot}
                  className="rounded-full border border-[#2e75ba]/30 bg-[#f2f8ff] px-2 py-0.5 font-semibold text-[#2e75ba] hover:bg-[#e8f2ff]"
                >
                  Ver snapshot
                </button>
                {snapshotDocument?.createdAt ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold">
                    Snapshot disponible: {formatDateTime(snapshotDocument.createdAt)}
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">consultaM · workspace clínico</span>
        </footer>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Al cerrar/firma se guarda snapshot inmutable y el encounter queda en modo solo lectura.
        </div>

        <Modal
          open={restoreDraftOpen}
          onClose={() => setRestoreDraftOpen(false)}
          subtitle="Borrador local detectado"
          title="Restaurar cambios guardados localmente"
          className="max-w-xl"
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={discardLocalDraft}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={restoreLocalDraft}
                className="rounded-xl bg-[#2e75ba] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Restaurar borrador
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              Se encontró un borrador local más reciente para este encounter.
            </p>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Último guardado local: {restoreDraftPayload?.savedAt ? formatDateTime(restoreDraftPayload.savedAt) : "—"}
            </p>
            <p className="text-xs text-slate-600">
              Puedes restaurarlo para continuar o descartarlo y seguir con el estado actual.
            </p>
          </div>
        </Modal>

        <Modal
          open={confirmCloseOpen}
          onClose={() => setConfirmCloseOpen(false)}
          subtitle="Confirmación de cierre"
          title="Cerrar y firmar consulta"
          className="max-w-xl"
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmCloseOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmAndClose}
                disabled={
                  closingAndSigning ||
                  !confirmChecklist.clinicalReview ||
                  !confirmChecklist.principalDx ||
                  !confirmChecklist.immutableSnapshot
                }
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                  closingAndSigning ||
                    !confirmChecklist.clinicalReview ||
                    !confirmChecklist.principalDx ||
                    !confirmChecklist.immutableSnapshot
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-rose-600 hover:bg-rose-700"
                )}
              >
                Confirmar cierre y firma
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Este proceso crea snapshot legal inmutable. No podrás editar historia, diagnósticos ni receta en este encounter.
            </div>
            <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={confirmChecklist.clinicalReview}
                onChange={(event) => setConfirmChecklist((prev) => ({ ...prev, clinicalReview: event.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              Confirmo que revisé historia clínica, evolución y receta.
            </label>
            <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={confirmChecklist.principalDx}
                onChange={(event) => setConfirmChecklist((prev) => ({ ...prev, principalDx: event.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              Confirmo diagnóstico principal CIE-10:{" "}
              <span className="font-semibold">{state.diagnosis.principalCode || "pendiente"}</span>.
            </label>
            <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={confirmChecklist.immutableSnapshot}
                onChange={(event) => setConfirmChecklist((prev) => ({ ...prev, immutableSnapshot: event.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              Entiendo que el snapshot firmado es inmutable.
            </label>
          </div>
        </Modal>

        <ResultsModal
          open={resultsViewerOpen}
          onClose={() => setResultsViewerOpen(false)}
          patientName={state.patient.name}
          encounterId={state.id}
          results={state.results}
          initialResultId={resultsViewerResultId}
          onInterpretResult={openInterpretResult}
          onToast={showToast}
          variant="chat"
        />

        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>

      <div className="encounter-print-document hidden print:block">
        <div className="relative mx-auto max-w-[8.5in] overflow-hidden bg-white px-[0.15in] py-[0.15in]">
          {documentBrandingTemplate.backgroundImageUrl ? (
            <div className="pointer-events-none absolute inset-[0.15in] z-0 overflow-hidden rounded-xl">
              <div className="h-full w-full" style={{ ...printSheetStyle, opacity: documentBrandingTemplate.backgroundOpacity }} />
            </div>
          ) : null}

          <div className="relative z-10 space-y-3">
            <header className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">{documentBrandingTemplate.title}</p>
                <h1 className="text-lg font-semibold text-slate-900">Consulta {state.id}</h1>
                <p className="text-xs text-slate-600">
                  Paciente: {state.patient.name} · Expediente {state.patient.recordNumber} · {state.patient.age} años
                </p>
                <p className="text-xs text-slate-600">Médico: {state.closedByName || "Médico responsable"}</p>
              </div>
              {documentBrandingTemplate.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={documentBrandingTemplate.logoUrl}
                  alt="Logo clínico"
                  style={{ width: `${documentBrandingTemplate.logoWidthPx}px` }}
                  className="h-10 w-auto max-w-[220px] object-contain"
                />
              ) : null}
            </div>
            </header>

            <section className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Signos vitales</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <p>TA: {valueOrDash(state.vitals.bloodPressure)}</p>
                <p>FC: {valueOrDash(state.vitals.heartRate)} lpm</p>
                <p>FR: {valueOrDash(state.vitals.respRate)} rpm</p>
                <p>Temp: {valueOrDash(state.vitals.temperatureC)} °C</p>
                <p>SpO2: {valueOrDash(state.vitals.spo2)} %</p>
                <p>Peso: {valueOrDash(state.vitals.weightKg)} kg</p>
                <p>Talla: {valueOrDash(state.vitals.heightCm)} cm</p>
                <p>Glucometría: {valueOrDash(state.vitals.glucometryMgDl)} mg/dL</p>
                <p>Circ. abdominal: {valueOrDash(state.vitals.abdominalCircumferenceCm)} cm</p>
                <p>IMC: {valueOrDash(bodyMassIndex)}</p>
              </div>
            </section>

            <section className="space-y-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Historia clínica</p>
              {printSections.map((section) => (
                <article key={section.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-900">{section.title}</p>
                  <div className="mt-2 space-y-1 text-sm text-slate-700">
                    {section.fields.map((field) => (
                      <p key={`${section.id}-${field.label}`}>
                        <span className="font-semibold">{field.label}:</span> {field.text}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </section>

            <section className="space-y-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Evolución / Reconsultas</p>
              {orderedReconsultations.length === 0 ? (
                <p className="text-sm text-slate-700">Sin evoluciones registradas.</p>
              ) : (
                orderedReconsultations.map((entry) => (
                  <article key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-900">{entry.entryTitle}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(entry.createdAt)} · {entry.authorName}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{notePreviewText(entry)}</p>
                  </article>
                ))
              )}
            </section>

            <footer className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-xs text-slate-600">
              <p>
                Firma: {state.closedByName || "Pendiente"} · Estado: {state.status.toUpperCase()} · Fecha: {formatDateTime(state.closedAt)}
              </p>
              {documentBrandingTemplate.footerEnabled ? (
                <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                  <span>{documentBrandingTemplate.footerLeftText || " "}</span>
                  <span>{documentBrandingTemplate.footerRightText || " "}</span>
                </div>
              ) : null}
            </footer>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: Letter;
            margin: ${documentBrandingTemplate.marginTopIn}in ${documentBrandingTemplate.marginRightIn}in ${documentBrandingTemplate.marginBottomIn}in ${documentBrandingTemplate.marginLeftIn}in;
          }

          body {
            background: #ffffff !important;
          }

          .encounter-print-document {
            display: block !important;
          }

          .encounter-print-document * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}
