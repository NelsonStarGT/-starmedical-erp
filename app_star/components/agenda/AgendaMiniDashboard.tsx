"use client";

type Props = {
  total: number;
  completadas: number;
  canceladas: number;
  ingresos: number;
  noShowRate: number;
};

const cards = [
  { key: "total", label: "Total de citas" },
  { key: "completadas", label: "Completadas" },
  { key: "canceladas", label: "Canceladas" },
  { key: "ingresos", label: "Ingresos estimados" },
  { key: "noShowRate", label: "No show rate" }
] as const;

export function AgendaMiniDashboard(props: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-2xl border border-[#E5E5E7] bg-white/90 px-4 py-3 shadow-soft"
        >
          <p className="text-[12px] text-slate-500">{card.label}</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">
            {card.key === "ingresos"
              ? `Q${props.ingresos.toLocaleString()}`
              : card.key === "noShowRate"
                ? `${props.noShowRate}%`
                : props[card.key]}
          </p>
        </div>
      ))}
    </div>
  );
}
