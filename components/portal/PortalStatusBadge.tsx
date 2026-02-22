import { cn } from "@/lib/utils";

export type PortalAppointmentSection = "requested" | "confirmed" | "history";

type PortalStatusMeta = {
  badge: string;
  helper: string;
  className: string;
};

export function getPortalStatusMeta(status: string, section: PortalAppointmentSection): PortalStatusMeta {
  if (section === "history") {
    return {
      badge: "Historial",
      helper: "Atención registrada",
      className: "border-[#d2e2f6] bg-[#eef5ff] text-[#2e75ba]"
    };
  }

  if (status === "REQUESTED") {
    return {
      badge: "En revisión",
      helper: "En revisión (recepción confirmará)",
      className: "border-amber-200 bg-amber-50 text-amber-800"
    };
  }

  if (status === "EN_SALA") {
    return {
      badge: "En sala",
      helper: "En sala",
      className: "border-[#cde7e4] bg-[#eff8f7] text-[#1f6f68]"
    };
  }

  if (status === "CONFIRMADA" || status === "PROGRAMADA") {
    return {
      badge: "Confirmada",
      helper: "Confirmada",
      className: "border-[#cde7e4] bg-[#eff8f7] text-[#1f6f68]"
    };
  }

  if (status === "ATENDIDA") {
    return {
      badge: "Atendida",
      helper: "Atención registrada",
      className: "border-[#d2e2f6] bg-[#eef5ff] text-[#2e75ba]"
    };
  }

  if (status === "CANCELADA") {
    return {
      badge: "Cancelada",
      helper: "Cancelada por recepción",
      className: "border-red-200 bg-red-50 text-red-700"
    };
  }

  if (status === "NO_SHOW") {
    return {
      badge: "No asistió",
      helper: "No asistió",
      className: "border-slate-200 bg-slate-100 text-slate-600"
    };
  }

  return {
    badge: status,
    helper: "Estado actualizado",
    className: "border-[#d2e2f6] bg-[#eef5ff] text-[#2e75ba]"
  };
}

export function PortalStatusBadge({
  status,
  section,
  className
}: {
  status: string;
  section: PortalAppointmentSection;
  className?: string;
}) {
  const meta = getPortalStatusMeta(status, section);

  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", meta.className, className)}>
      {meta.badge}
    </span>
  );
}
