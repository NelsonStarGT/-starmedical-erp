import { AlarmClock, CircleDollarSign, FileWarning, Lock, Split } from "lucide-react";
import type { ReactNode } from "react";

type Snapshot = {
  readyToCollect: number;
  urgent: number;
  locked: number;
  partial: number;
  docsPending: number;
};

function Metric({
  label,
  value,
  icon,
  tone
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <span className={`inline-flex rounded-lg p-1.5 ${tone}`}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-[#102a43]">{value}</p>
    </article>
  );
}

export default function BillingControlStrip({ snapshot }: { snapshot: Snapshot }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <Metric
        label="Listos para cobro"
        value={snapshot.readyToCollect}
        icon={<CircleDollarSign className="h-4 w-4 text-[#2f7f77]" />}
        tone="bg-[#4aa59c]/15"
      />
      <Metric
        label="Urgentes"
        value={snapshot.urgent}
        icon={<AlarmClock className="h-4 w-4 text-rose-700" />}
        tone="bg-rose-100"
      />
      <Metric
        label="Bloqueados"
        value={snapshot.locked}
        icon={<Lock className="h-4 w-4 text-[#2e75ba]" />}
        tone="bg-[#4aadf5]/20"
      />
      <Metric
        label="Cobro parcial"
        value={snapshot.partial}
        icon={<Split className="h-4 w-4 text-amber-700" />}
        tone="bg-amber-100"
      />
      <Metric
        label="Docs pendientes"
        value={snapshot.docsPending}
        icon={<FileWarning className="h-4 w-4 text-cyan-700" />}
        tone="bg-cyan-100"
      />
    </section>
  );
}
