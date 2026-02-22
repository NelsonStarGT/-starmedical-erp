"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import TextEditorEngine from "@/modules/text-editor/TextEditorEngine";
import LetterPages, { type LetterViewMode } from "@/components/medical/encounter/LetterPages";
import ReconsultaTimeline from "@/components/medical/encounter/ReconsultaTimeline";
import { createRichTextValue } from "@/lib/medical/clinical";
import type { DocumentBrandingTemplate } from "@/lib/medical/documentBranding";
import type { EncounterHistoryDraft, EncounterReconsulta, EncounterRichTextValue, EncounterStatus } from "./types";

function statusLabel(status: EncounterStatus) {
  if (status === "closed") return "Consulta cerrada";
  if (status === "open") return "Consulta en curso";
  return "Consulta en borrador";
}

function textFromHistoryField(field: EncounterHistoryDraft["sections"][number]["fields"][number]) {
  if (field.kind === "rich_text") return field.richValue.text || "";
  if (field.kind === "number") return field.numberValue === null ? "" : String(field.numberValue);
  return field.textValue || "";
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

export default function EvolutionPanel({
  status,
  readOnly,
  saving = false,
  reconsultations,
  history,
  pendingResultContext,
  onConsumePendingResultContext,
  onAppendManualReconsulta,
  onViewSourceResult,
  focusEditorSignal = 0,
  saveShortcutSignal = 0,
  documentViewMode = "paged",
  onChangeDocumentViewMode,
  brandingTemplate
}: {
  status: EncounterStatus;
  readOnly: boolean;
  saving?: boolean;
  reconsultations: EncounterReconsulta[];
  history: EncounterHistoryDraft;
  pendingResultContext?: { id: string; title: string } | null;
  onConsumePendingResultContext?: () => void;
  onAppendManualReconsulta?: (payload: AppendPayload) => Promise<boolean> | boolean;
  onViewSourceResult?: (sourceResultId: string) => void;
  focusEditorSignal?: number;
  saveShortcutSignal?: number;
  documentViewMode?: LetterViewMode;
  onChangeDocumentViewMode?: (next: LetterViewMode) => void;
  brandingTemplate?: DocumentBrandingTemplate | null;
}) {
  const [draft, setDraft] = useState<EncounterRichTextValue>(() => createRichTextValue(""));
  const [linkedResult, setLinkedResult] = useState<{ id: string; title: string } | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pendingResultContext) return;
    setLinkedResult(pendingResultContext);
    onConsumePendingResultContext?.();
  }, [onConsumePendingResultContext, pendingResultContext]);

  const historyReference = useMemo(
    () =>
      history.sections.map((section) => ({
        id: section.sectionId,
        title: section.title,
        fields: section.fields
          .filter((field) => field.visible)
          .map((field) => ({ label: field.label, text: textFromHistoryField(field).trim() || "—" }))
      })),
    [history.sections]
  );

  const handleAppend = useCallback(async () => {
    const text = draft.text.trim();
    if (!text || !onAppendManualReconsulta) return;

    const firstLine = text.split(/\n+/).find((line) => line.trim()) || "Nueva evolución";
    const title = linkedResult ? `Reconsulta por resultado: ${linkedResult.title}` : `Evolución: ${firstLine.slice(0, 70)}`;

    const saved = await onAppendManualReconsulta({
      noteRich: draft,
      entryTitle: title,
      sourceResultId: linkedResult?.id || null,
      sourceResultTitle: linkedResult?.title || null,
      interpretation: text.slice(0, 280),
      conduct: text.slice(0, 280),
      therapeuticAdjustment: text.slice(0, 280)
    });

    if (saved === false) return;
    setDraft(createRichTextValue(""));
    setLinkedResult(null);
  }, [draft, linkedResult, onAppendManualReconsulta]);

  useEffect(() => {
    if (!focusEditorSignal) return;
    const host = editorContainerRef.current;
    if (!host) return;
    const editable = host.querySelector<HTMLElement>('[contenteditable="true"]');
    editable?.focus();
  }, [focusEditorSignal]);

  useEffect(() => {
    if (!saveShortcutSignal) return;
    void handleAppend();
  }, [handleAppend, saveShortcutSignal]);

  const pages = [
    {
      id: "evolution-editor",
      title: "Nueva evolución (nota clínica adicional)",
      subtitle: linkedResult
        ? `Vinculada al resultado: ${linkedResult.title}`
        : "Hoja en blanco para escribir evolución clínica.",
      content: (
        <div className="space-y-4">
          {linkedResult ? (
            <div className="rounded-xl border border-[#4aadf5]/35 bg-[#4aadf5]/10 px-3 py-2 text-xs font-semibold text-[#2e75ba]">
              Resultado vinculado: {linkedResult.title}
            </div>
          ) : null}

          <div ref={editorContainerRef}>
            <TextEditorEngine
              variant="medical"
              density="comfortable"
              initialContent={draft.json as any}
              readOnly={readOnly}
              onChange={(payload) =>
                setDraft({
                  json: payload.json as Record<string, unknown>,
                  html: payload.html,
                  text: payload.text
                })
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-600">
              No modifica la historia original. Se agrega al expediente como nota append-only.
            </p>
            <button
              type="button"
              onClick={() => void handleAppend()}
              disabled={readOnly || saving || !draft.text.trim()}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm",
                readOnly || saving || !draft.text.trim() ? "cursor-not-allowed bg-slate-300" : "bg-[#2e75ba] hover:opacity-90"
              )}
            >
              {saving ? "Guardando..." : "Guardar nueva evolución"}
            </button>
          </div>
        </div>
      )
    },
    {
      id: "history-reference",
      title: "Historia previa (solo lectura)",
      subtitle: "Consulta el contexto sin cambiar de pestaña.",
      content: (
        <details open className="rounded-xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-slate-700">
            Ver historia previa y secciones aplicadas
          </summary>
          <div className="space-y-3 border-t border-slate-200 px-3 py-3">
            {historyReference.length === 0 ? (
              <p className="text-sm text-slate-600">No hay historia previa registrada.</p>
            ) : (
              historyReference.map((section) => (
                <section key={section.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{section.title}</p>
                  <div className="mt-2 space-y-2">
                    {section.fields.map((field) => (
                      <article key={`${section.id}-${field.label}`}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{field.label}</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{field.text}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </details>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Evolución / Reconsulta</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{statusLabel(status)}</p>
        <p className="mt-2 text-xs text-slate-600">
          Nueva evolución (nota clínica adicional). No modifica la historia original; se agrega al expediente.
        </p>
      </div>

      <LetterPages
        pages={pages}
        mode={documentViewMode}
        onModeChange={onChangeDocumentViewMode}
        brandingTemplate={brandingTemplate}
      />

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <header className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-700">Timeline de evolución (append-only)</h3>
          <p className="text-xs text-slate-600">Append-only: esto no modifica la consulta original.</p>
        </header>
        <div className="rounded-xl border border-[#4aadf5]/30 bg-[#f2f8ff] px-3 py-2 text-xs font-semibold text-[#2e75ba]">
          Orden: más reciente primero. Cada entrada queda fija como parte del expediente clínico.
        </div>
        <ReconsultaTimeline entries={reconsultations} readOnly={readOnly} onViewSourceResult={onViewSourceResult} />
      </section>
    </div>
  );
}
