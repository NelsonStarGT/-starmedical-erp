import { Clock3 } from "lucide-react";
import type { PortalAppointmentItem } from "@/lib/portal/data";
import { PortalStatusBadge, getPortalStatusMeta, type PortalAppointmentSection } from "@/components/portal/PortalStatusBadge";

function formatDay(value: Date) {
  return value.toLocaleDateString("es-GT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatTime(value: Date) {
  return value.toLocaleTimeString("es-GT", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getReasonSnippet(notes: string | null) {
  const normalized = String(notes || "").trim();
  if (!normalized) return "Sin motivo registrado.";

  const fragments = normalized
    .split(/\n|\|/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const reasonLine = fragments.find((line) => line.toLowerCase().startsWith("motivo:"));
  const value = reasonLine ? reasonLine.slice("Motivo:".length).trim() : fragments[0] || normalized;
  if (!value) return "Sin motivo registrado.";
  if (value.length <= 140) return value;
  return `${value.slice(0, 137)}...`;
}

function getShortId(id: string) {
  return `#${id.slice(-8).toUpperCase()}`;
}

export function PortalAppointmentCard({
  item,
  section
}: {
  item: PortalAppointmentItem;
  section: PortalAppointmentSection;
}) {
  const statusMeta = getPortalStatusMeta(item.status, section);
  const reasonSnippet = getReasonSnippet(item.notes);

  return (
    <article className="rounded-2xl border border-[#d2e2f6] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Día</p>
          <p className="mt-1 text-sm font-semibold text-[#2e75ba]">{formatDay(item.date)}</p>
        </div>
        <PortalStatusBadge status={item.status} section={section} />
      </div>

      <div className="mt-3 flex items-center gap-2 text-[#2e75ba]">
        <Clock3 size={16} />
        <p className="text-2xl font-semibold leading-none">{formatTime(item.date)}</p>
      </div>

      <p className="mt-3 text-sm font-medium text-slate-700">
        {(item.typeName || "Consulta general") + (item.siteName ? ` · ${item.siteName}` : "")}
      </p>

      <p
        className="mt-2 text-sm text-slate-600"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden"
        }}
      >
        {reasonSnippet}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#e7eef9] pt-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{getShortId(item.id)}</p>
        <p className="text-xs text-slate-500">{statusMeta.helper}</p>
      </div>
    </article>
  );
}
