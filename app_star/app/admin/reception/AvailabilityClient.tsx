"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, DoorClosed, DoorOpen } from "lucide-react";
import type { AvailabilitySnapshot } from "@/lib/reception/dashboard.types";
import { usePolling } from "@/lib/reception/ui-polling";
import { actionGetAvailabilitySnapshot } from "@/app/admin/reception/actions";
import { useReceptionBranch } from "@/app/admin/reception/BranchContext";
import { cn } from "@/lib/utils";

type Props = {
  siteId: string;
  initialSnapshot: AvailabilitySnapshot;
};

export default function AvailabilityClient({ siteId, initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { activeBranchId } = useReceptionBranch();
  const effectiveSiteId = activeBranchId ?? siteId;

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const next = await actionGetAvailabilitySnapshot(effectiveSiteId);
      setSnapshot(next);
    } finally {
      setIsRefreshing(false);
    }
  }, [effectiveSiteId]);

  usePolling({ intervalMs: 15000, onTick: refresh });

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 300);
    return () => clearTimeout(timer);
  }, [refresh]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Snapshot</p>
          <h2 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
            Disponibilidad operativa
          </h2>
        </div>
        <span className={cn("text-xs text-slate-500", isRefreshing && "text-[#4aa59c]")}>
          {isRefreshing ? "Actualizando..." : "Actualizado"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[#e5edf8] bg-white/95 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Médicos ocupados</p>
            <Users size={18} className="text-[#2e75ba]" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
            {snapshot.busyDoctors}
          </p>
        </div>
        <div className="rounded-xl border border-[#e5edf8] bg-white/95 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Consultorios libres</p>
            <DoorOpen size={18} className="text-[#2e75ba]" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
            {snapshot.roomsAvailable}
          </p>
        </div>
        <div className="rounded-xl border border-[#e5edf8] bg-white/95 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Consultorios ocupados</p>
            <DoorClosed size={18} className="text-[#2e75ba]" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
            {snapshot.roomsOccupied}
          </p>
        </div>
      </div>

      {!snapshot.branchHoursConfigured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          <p className="font-semibold">Horario operativo no configurado</p>
          <p className="mt-1">
            {snapshot.branchHoursMessage || "La sede activa no tiene horario vigente publicado."} Configura horarios en{" "}
            <a href="/admin/configuracion" className="font-semibold text-[#2e75ba] underline">
              Configuración Central
            </a>
            .
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-[#e5edf8] bg-white/95 p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Carga por médico</p>
        <div className="mt-2 space-y-2">
          {snapshot.visitsInServiceByDoctor.length === 0 ? (
            <p className="text-sm text-slate-500">Sin atenciones activas asignadas.</p>
          ) : (
            snapshot.visitsInServiceByDoctor.map((row) => (
              <div key={row.userId} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span>Usuario {row.userId.slice(0, 6)}</span>
                <span className="font-semibold">{row.count} en servicio</span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
