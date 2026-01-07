"use client";

export type AlertItem = {
  title: string;
  detail?: string;
  tone?: "warning" | "danger";
};

export function AlertList({ title, items }: { title: string; items: AlertItem[] }) {
  return (
    <div className="rounded-2xl border border-[#E5E5E7] bg-white/90 p-4 shadow-soft">
      <p className="text-sm font-semibold text-slate-800 mb-3">{title}</p>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-slate-500">Sin alertas</p>}
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`rounded-xl border px-3 py-2 text-sm ${item.tone === "danger" ? "border-rose-100 bg-rose-50 text-rose-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}
          >
            <p className="font-semibold">{item.title}</p>
            {item.detail && <p className="text-xs">{item.detail}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
