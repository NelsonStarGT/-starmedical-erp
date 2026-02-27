"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

  const [expanded, setExpanded] = useState(false);
  const storageKey = `clients:kpi-expanded:${basePath}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(storageKey);
    if (raw === "1") setExpanded(true);
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, expanded ? "1" : "0");
  }, [expanded, storageKey]);

  return (
    <section className="rounded-xl border border-[#dce7f5] bg-white px-3 py-2 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Resumen compacto</p>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
        >
          {expanded ? "Ver menos" : "Ver más"}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {cards.map((card) => {
          const active = activeAlert === card.key || (!activeAlert && card.key === "");
          const href = buildClientListHref(basePath, {
            ...currentQuery,
            alert: card.key || undefined,
            page: undefined
          });

          return (
            <Link
              key={`compact-${card.label}`}
              href={href}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition",
                active
                  ? "border-[#4aadf5] bg-[#4aadf5]/10 text-[#2e75ba]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5]/60"
              )}
            >
              <span>{card.label}</span>
              <span>{card.value}</span>
            </Link>
          );
        })}
      </div>

      {expanded ? (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
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
      ) : null}
    </section>
  );
}
