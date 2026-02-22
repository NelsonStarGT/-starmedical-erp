"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type MedicalMode = "admin" | "consulta";

export default function MedicalModeSwitcher({
  mode,
  adminHref = "/modulo-medico/dashboard",
  consultaHref = "/modulo-medico/consultaM/demo-open",
  className
}: {
  mode: MedicalMode;
  adminHref?: string;
  consultaHref?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const canGoConsulta = Boolean(consultaHref);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Modo</div>
      <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => router.push(adminHref)}
          aria-pressed={mode === "admin"}
          className={cn(
            "rounded-full px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-diagnostics-primary focus-visible:ring-offset-2",
            mode === "admin"
              ? "bg-diagnostics-corporate text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-50"
          )}
        >
          Administrativo
        </button>
        <button
          type="button"
          onClick={() => {
            if (!consultaHref) return;
            router.push(consultaHref);
          }}
          disabled={!canGoConsulta}
          aria-pressed={mode === "consulta"}
          className={cn(
            "rounded-full px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-diagnostics-primary focus-visible:ring-offset-2",
            !canGoConsulta && "cursor-default",
            mode === "consulta"
              ? "bg-diagnostics-primary text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-50"
          )}
        >
          Consulta
        </button>
      </div>
    </div>
  );
}
