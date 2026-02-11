"use client";

import { useMemo, useState, useTransition } from "react";
import { ClientNoteType, ClientNoteVisibility } from "@prisma/client";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { actionAddClientNote } from "@/app/admin/clientes/actions";
import { cn } from "@/lib/utils";

type NoteRow = {
  id: string;
  title: string | null;
  body: string;
  noteType: ClientNoteType;
  visibility: ClientNoteVisibility;
  createdAt: string;
  actorLabel: string | null;
};

const NOTE_TYPE_LABELS: Record<ClientNoteType, string> = {
  ADMIN: "Administrativa",
  RECEPCION: "Recepción",
  CLINICA: "Clínica",
  OTRA: "Otra"
};

const VISIBILITY_LABELS: Record<ClientNoteVisibility, string> = {
  INTERNA: "Interna",
  VISIBLE_PACIENTE: "Visible paciente"
};

export default function ClientNotesPanel({ clientId, notes }: { clientId: string; notes: NoteRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => ({
    title: "",
    body: "",
    noteType: ClientNoteType.ADMIN as ClientNoteType,
    visibility: ClientNoteVisibility.INTERNA as ClientNoteVisibility
  }));

  const canSubmit = useMemo(() => Boolean(form.body.trim()), [form.body]);

  const submit = () => {
    if (!canSubmit) return;
    startTransition(async () => {
      try {
        await actionAddClientNote({
          clientId,
          title: form.title,
          body: form.body,
          noteType: form.noteType,
          visibility: form.visibility
        });
        setForm({
          title: "",
          body: "",
          noteType: ClientNoteType.ADMIN,
          visibility: ClientNoteVisibility.INTERNA
        });
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo guardar la nota.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Notas / Historial</p>

        {notes.length ? (
          <div className="mt-4 space-y-2">
            {notes.map((note) => (
              <div key={note.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{note.title?.trim() || "Sin título"}</p>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {NOTE_TYPE_LABELS[note.noteType]}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      note.visibility === ClientNoteVisibility.INTERNA
                        ? "border-slate-200 bg-slate-50 text-slate-600"
                        : "border-sky-200 bg-sky-50 text-sky-700"
                    )}
                  >
                    {VISIBILITY_LABELS[note.visibility]}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{note.body}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {note.actorLabel ? `${note.actorLabel} · ` : ""}
                  {new Date(note.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-diagnostics-background px-4 py-3 text-sm text-slate-700">
            No hay notas todavía. Agrega la primera abajo.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Agregar nota</p>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Título (opcional)"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          />

          <select
            value={form.noteType}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                noteType: event.target.value as ClientNoteType
              }))
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          >
            <option value={ClientNoteType.ADMIN}>Administrativa</option>
            <option value={ClientNoteType.RECEPCION}>Recepción</option>
            <option value={ClientNoteType.CLINICA}>Clínica</option>
            <option value={ClientNoteType.OTRA}>Otra</option>
          </select>

          <select
            value={form.visibility}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                visibility: event.target.value as ClientNoteVisibility
              }))
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          >
            <option value={ClientNoteVisibility.INTERNA}>Interna</option>
            <option value={ClientNoteVisibility.VISIBLE_PACIENTE}>Visible paciente</option>
          </select>
        </div>

        <textarea
          value={form.body}
          onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
          placeholder="Escribe una nota operativa (ej. requerir RTU, actualizar contacto, etc.)"
          className="min-h-[110px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
        />

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
          Guardar nota
        </button>

        {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      </section>
    </div>
  );
}
