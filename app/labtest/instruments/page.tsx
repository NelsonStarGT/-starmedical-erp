import { prisma } from "@/lib/prisma";
import { LabInstrumentStatus } from "@prisma/client";
import { WrenchIcon, WifiOffIcon, WifiIcon } from "lucide-react";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";

export const runtime = "nodejs";

const statusIcon: Record<LabInstrumentStatus, any> = {
  ONLINE: WifiIcon,
  OFFLINE: WifiOffIcon,
  UNKNOWN: WrenchIcon
};

export default async function InstrumentsPage() {
  let instruments: Awaited<ReturnType<typeof prisma.labInstrument.findMany>> = [];
  let labReady = true;
  try {
    instruments = await prisma.labInstrument.findMany({ orderBy: { name: "asc" } });
  } catch (err: any) {
    if (isMissingLabTableError(err)) {
      labReady = false;
    } else {
      throw err;
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Equipos</p>
        <h2 className="text-2xl font-semibold text-[#163d66]">Conexión manual</h2>
        <p className="text-sm text-slate-600">Scaffolding para HL7 / drivers. Estado se marca manual.</p>
        {!labReady && (
          <p className="mt-2 text-xs font-semibold text-amber-700">
            Ejecuta las migraciones de LabTest para habilitar esta vista (npx prisma migrate dev && npx prisma generate).
          </p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {instruments.map((inst) => {
          const Icon = statusIcon[inst.connectionStatus];
          return (
            <div key={inst.id} className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{inst.area}</p>
                  <h3 className="text-lg font-semibold text-[#163d66]">{inst.name}</h3>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#e8f1ff] px-3 py-1 text-xs font-semibold text-[#2e75ba]">
                  <Icon className="h-4 w-4" />
                  {inst.connectionStatus}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">Mapping: pendiente</p>
              <button className="mt-3 rounded-full border border-[#dce7f5] px-3 py-1 text-sm font-semibold text-[#2e75ba] hover:bg-[#e8f1ff]">
                Configurar
              </button>
            </div>
          );
        })}
        {labReady && instruments.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#dce7f5] bg-white p-6 text-sm text-slate-600 shadow-sm">
            No hay instrumentos registrados. Usa la API /api/labtest/instruments para crearlos.
          </div>
        )}
      </div>
    </div>
  );
}
