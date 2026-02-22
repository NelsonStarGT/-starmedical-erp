"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import DoctorSelector from "./DoctorSelector";
import MedicalModeSwitcher from "./MedicalModeSwitcher";
import { MedicalViewProvider, type MedicalViewState } from "./MedicalViewContext";

type MedicalLayoutProps = {
  children: React.ReactNode;
  user: { id: string };
  canOverrideDoctor: boolean;
};

const TITLE_BY_ROUTE: Record<string, string> = {
  "/modulo-medico/dashboard": "Dashboard",
  "/modulo-medico/agenda": "Agenda del médico",
  "/modulo-medico/pacientes": "Pacientes",
  "/modulo-medico/diagnostico": "Diagnóstico",
  "/modulo-medico/comisiones": "Comisiones",
  "/modulo-medico/operaciones": "Operaciones",
  "/modulo-medico/configuracion": "Configuración",
  "/modulo-medico/configuracion/plantillas-clinicas": "Plantillas clínicas"
};

export default function MedicalLayout({
  children,
  user,
  canOverrideDoctor
}: MedicalLayoutProps) {
  const pathname = usePathname();

  const initialView = useMemo<MedicalViewState>(() => {
    if (canOverrideDoctor) return { scope: "all", doctorId: null };
    return { scope: "mine", doctorId: user.id };
  }, [canOverrideDoctor, user.id]);

  const title = useMemo(() => {
    if (TITLE_BY_ROUTE[pathname]) return TITLE_BY_ROUTE[pathname];
    if (pathname.startsWith("/modulo-medico/configuracion/plantillas-clinicas")) return "Plantillas clínicas";
    return "Módulo médico";
  }, [pathname]);

  return (
    <MedicalViewProvider initial={initialView}>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-diagnostics-background text-slate-900 shadow-soft">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="flex flex-col gap-3 px-4 py-4 lg:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-diagnostics-primary">
                  Módulo médico
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Operable, enfocada y con separación clínica/operativa.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <MedicalModeSwitcher mode="admin" />
                <DoctorSelector userId={user.id} enabled={canOverrideDoctor} />
              </div>
            </div>
          </div>
        </header>
        <div className="space-y-6 p-4 lg:p-6">{children}</div>
      </section>
    </MedicalViewProvider>
  );
}
