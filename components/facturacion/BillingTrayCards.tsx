import Link from "next/link";
import { type BillingTrayId } from "@/lib/billing/types";
import { formatBillingMoney } from "@/lib/billing/format";

type TrayItem = {
  id: BillingTrayId;
  name: string;
  description: string;
  count: number;
  balance: number;
};

export default function BillingTrayCards({ trays, activeTrayId }: { trays: TrayItem[]; activeTrayId?: BillingTrayId }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {trays.map((tray) => {
        const active = tray.id === activeTrayId;
        return (
          <Link
            key={tray.id}
            href={`/admin/facturacion/bandeja/${tray.id}`}
            className={
              active
                ? "rounded-xl border border-[#4aa59c] bg-[#4aa59c]/10 p-4 shadow-sm"
                : "rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#4aa59c]/40"
            }
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#102a43]">{tray.name}</p>
              <span className="rounded-full bg-[#2e75ba]/10 px-2 py-1 text-xs font-semibold text-[#2e75ba]">{tray.count}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{tray.description}</p>
            <p className="mt-3 text-sm font-semibold text-slate-700">{formatBillingMoney(tray.balance)}</p>
          </Link>
        );
      })}
    </section>
  );
}
