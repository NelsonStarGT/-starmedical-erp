"use client";

import Link from "next/link";
import ConfigAccessDeniedCard from "@/components/configuracion/ConfigAccessDeniedCard";
import { useConfigAuthCircuitState } from "@/hooks/useConfigAuthCircuit";

function formatRetryInSeconds(blockedUntil: number | null) {
  if (!blockedUntil) return null;
  const remainingMs = blockedUntil - Date.now();
  if (remainingMs <= 0) return null;
  return Math.ceil(remainingMs / 1000);
}

export default function ConfigSessionStatusBanner() {
  const state = useConfigAuthCircuitState();

  if (state.status === "ok") return null;

  if (state.status === "forbidden") {
    return (
      <ConfigAccessDeniedCard
        sectionLabel="Configuracion central"
        requirementLabel={state.message || "permisos de administrador"}
        backHref="/admin"
        backLabel="Volver al panel"
      />
    );
  }

  const retryInSeconds = formatRetryInSeconds(state.blockedUntil);

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-900">Sesion expirada</p>
      <p className="mt-1 text-sm text-amber-900">{state.message || "Inicia sesion para continuar con Configuracion Central."}</p>
      <p className="mt-1 text-xs text-amber-800">
        {retryInSeconds
          ? `Reintentos detenidos temporalmente por ${retryInSeconds}s para evitar spam de errores.`
          : "Vuelve a iniciar sesion para restablecer el acceso."}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href="/login"
          className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#4aadf5]"
        >
          Ir a login
        </Link>
      </div>
    </section>
  );
}
