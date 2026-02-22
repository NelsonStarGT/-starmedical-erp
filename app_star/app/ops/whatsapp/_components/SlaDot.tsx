import type { SlaStatus } from "../types";

const colorByStatus: Record<SlaStatus, string> = {
  ok: "bg-[#4aa59c]",
  warning: "bg-[#4aadf5]",
  // Mantener un rojo evidente para riesgo; se ajustará a la paleta final cuando se defina.
  risk: "bg-rose-500"
};

const labelByStatus: Record<SlaStatus, string> = {
  ok: "Dentro del SLA",
  warning: "Próximo a vencer",
  risk: "Fuera de SLA"
};

export default function SlaDot({ status }: { status: SlaStatus }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <span className={`h-2.5 w-2.5 rounded-full ${colorByStatus[status]}`} aria-hidden />
      <span className="sr-only">{labelByStatus[status]}</span>
    </span>
  );
}
