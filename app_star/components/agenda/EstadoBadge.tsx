import { EstadoCita } from "@/lib/types/agenda";
import { cn } from "@/lib/utils";

const styles: Record<EstadoCita, string> = {
  Programada: "bg-brand-primary/10 text-brand-primary border-brand-primary/30",
  Confirmada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "En sala": "bg-amber-50 text-amber-700 border-amber-200",
  Atendida: "bg-green-100 text-green-800 border-green-200",
  "No se presentó": "bg-orange-100 text-orange-800 border-orange-200",
  Cancelada: "bg-slate-100 text-slate-700 border-slate-200"
};

export function EstadoBadge({ estado, className }: { estado: EstadoCita; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        styles[estado],
        className
      )}
    >
      {estado}
    </span>
  );
}
