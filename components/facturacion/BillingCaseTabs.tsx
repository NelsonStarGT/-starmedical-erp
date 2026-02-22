import Link from "next/link";
import { cn } from "@/lib/utils";

export type BillingCaseTabId = "resumen" | "items" | "pagadores" | "pagos" | "documentos" | "historial";

export const billingCaseTabs: Array<{ id: BillingCaseTabId; label: string }> = [
  { id: "resumen", label: "Resumen" },
  { id: "items", label: "Items" },
  { id: "pagadores", label: "Pagadores y split" },
  { id: "pagos", label: "Pagos y anticipos" },
  { id: "documentos", label: "Documentos" },
  { id: "historial", label: "Historial" }
];

export function isBillingCaseTabId(value?: string | null): value is BillingCaseTabId {
  return billingCaseTabs.some((item) => item.id === value);
}

export default function BillingCaseTabs({ baseHref, activeTab }: { baseHref: string; activeTab: BillingCaseTabId }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      {billingCaseTabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            href={`${baseHref}?tab=${tab.id}`}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-semibold transition",
              active ? "bg-[#4aa59c] text-white shadow-sm" : "text-slate-600 hover:bg-[#4aadf5]/10 hover:text-[#2e75ba]"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
