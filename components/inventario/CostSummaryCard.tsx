"use client";

type Props = {
  costo: number;
  precio?: number;
  label?: string;
};

export function CostSummaryCard({ costo, precio, label = "Costo" }: Props) {
  return (
    <div className="rounded-2xl border border-[#E5E5E7] bg-white/90 p-3 shadow-soft">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-slate-900">Q{costo.toFixed(2)}</p>
      {precio !== undefined && (
        <p className="text-xs text-slate-500">Precio venta: Q{precio.toFixed(2)}</p>
      )}
    </div>
  );
}
