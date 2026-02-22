import Link from "next/link";
import type { ClientListKpis } from "@/lib/clients/list.service";
import { buildClientListHref, type HrefQuery } from "@/lib/clients/list/href";
import { cn } from "@/lib/utils";

export default function ClientListKpiStrip({
  basePath,
  currentQuery,
  kpis,
  activeAlert
}: {
  basePath: string;
  currentQuery: HrefQuery;
  kpis: ClientListKpis;
  activeAlert: string;
}) {
  const cards = [
    {
      key: "",
      label: "Total",
      value: kpis.total,
      tone: "default"
    },
    {
      key: "INCOMPLETE",
      label: "Incompletos",
      value: kpis.incomplete,
      tone: "warning"
    },
    {
      key: "DOCS_EXPIRED",
      label: "Docs vencidos",
      value: kpis.docsExpired,
      tone: "danger"
    },
    {
      key: "DOCS_EXPIRING",
      label: "Por vencer",
      value: kpis.docsExpiring,
      tone: "info"
    },
    {
      key: "REQUIRED_PENDING",
      label: "Req. pendientes",
      value: kpis.requiredPending,
      tone: "info"
    },
    {
      key: "REQUIRED_REJECTED",
      label: "Req. rechazados",
      value: kpis.requiredRejected,
      tone: "danger"
    },
    {
      key: "REQUIRED_EXPIRED",
      label: "Req. vencidos",
      value: kpis.requiredExpired,
      tone: "warning"
    }
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
      {cards.map((card) => {
        const active = activeAlert === card.key || (!activeAlert && card.key === "");
        const href = buildClientListHref(basePath, {
          ...currentQuery,
          alert: card.key || undefined,
          page: undefined
        });

        return (
          <Link
            key={card.label}
            href={href}
            className={cn(
              "rounded-xl border bg-white px-4 py-3 shadow-sm transition",
              active ? "border-[#4aadf5]" : "border-[#dce7f5] hover:border-[#4aadf5]/60"
            )}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
              <p
                className={cn(
                  "mt-1 text-2xl font-semibold",
                  card.tone === "danger"
                    ? "text-rose-700"
                    : card.tone === "warning"
                      ? "text-amber-700"
                      : card.tone === "info"
                        ? "text-sky-700"
                        : "text-slate-900"
                )}
              >
                {card.value}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
