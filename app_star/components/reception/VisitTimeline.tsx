import { format } from "date-fns";

type VisitEventItem = {
  id: string;
  eventType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
  createdAt: Date;
  actorUserName?: string | null;
};

function sanitizeVisitEventNote(note?: string | null): string | null {
  const trimmed = note?.trim();
  if (!trimmed) return null;

  if (trimmed.toLowerCase() === "ingreso walk-in") {
    return "Admisión registrada";
  }

  return trimmed
    .replace(/walk-?in/gi, "admisión")
    .replace(/check-?in/gi, "admisión");
}

export function VisitTimeline({ events }: { events: VisitEventItem[] }) {
  if (!events.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Sin eventos registrados.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const note = sanitizeVisitEventNote(event.note);
        return (
          <div key={event.id} className="rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{event.eventType}</p>
                <p className="text-sm text-slate-700">
                  {event.fromStatus ? `${event.fromStatus} → ` : ""}
                  {event.toStatus ?? "Actualización"}
                </p>
              </div>
              <p className="text-xs text-slate-500">{format(event.createdAt, "HH:mm")}</p>
            </div>
            {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}
            {event.actorUserName && (
              <p className="mt-1 text-xs text-slate-400">Por {event.actorUserName}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
