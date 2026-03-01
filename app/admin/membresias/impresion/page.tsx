"use client";

import { useEffect, useMemo, useState } from "react";
import { MembershipsShell } from "@/components/memberships/MembershipsShell";
import { EmptyState } from "@/components/memberships/EmptyState";
import { dateLabel } from "@/app/admin/suscripciones/membresias/_lib";

type ContractCardRow = {
  id: string;
  code: string;
  status: string;
  ownerType: "PERSON" | "COMPANY";
  MembershipPlan?: { name: string };
  ClientProfile?: {
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
  };
};

type QueueItem = {
  contract: ContractCardRow;
  printStatus: "PENDIENTE" | "IMPRESO" | "REIMPRESION";
  lastPrintedAt?: string;
  reprintReason?: string;
};

export default function MembershipPrintPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/subscriptions/memberships/contracts?status=ACTIVO&take=200", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudo cargar cola de impresión");

        const rows: ContractCardRow[] = Array.isArray(json?.data) ? json.data : [];
        const normalized = rows.map((contract) => ({
          contract,
          printStatus: "PENDIENTE" as const
        }));
        if (!mounted) return;
        setQueue(normalized);
        setSelectedId(normalized[0]?.contract.id || null);
      } catch (err: any) {
        if (mounted) setError(err?.message || "No se pudo cargar impresión");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const selected = useMemo(() => queue.find((item) => item.contract.id === selectedId) || null, [queue, selectedId]);

  function markPrinted(id: string) {
    setQueue((prev) =>
      prev.map((item) =>
        item.contract.id === id
          ? {
              ...item,
              printStatus: "IMPRESO",
              lastPrintedAt: new Date().toISOString()
            }
          : item
      )
    );
  }

  function markReprint(id: string) {
    const reason = window.prompt("Motivo de reimpresión", "Pérdida o daño") || "Sin motivo";
    setQueue((prev) =>
      prev.map((item) =>
        item.contract.id === id
          ? {
              ...item,
              printStatus: "REIMPRESION",
              lastPrintedAt: new Date().toISOString(),
              reprintReason: reason
            }
          : item
      )
    );
  }

  function printCard() {
    window.print();
  }

  return (
    <MembershipsShell
      title="Impresión · Carnets"
      description="Cola operativa de impresión y reimpresión de carnets."
    >
      {loading ? <p className="text-xs text-slate-500">Cargando cola de impresión...</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      {!loading && queue.length === 0 ? (
        <EmptyState
          title="Sin contratos para imprimir"
          description="No hay contratos activos para generar carnets en este momento."
        />
      ) : null}

      {queue.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-slate-200 bg-white p-2">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Cola</h2>
              <span className="text-[11px] text-slate-500">{queue.length} registros</span>
            </div>
            <ul className="space-y-2">
              {queue.map((item) => {
                const owner = item.contract.ClientProfile?.companyName
                  ? item.contract.ClientProfile.companyName
                  : `${item.contract.ClientProfile?.firstName || ""} ${item.contract.ClientProfile?.lastName || ""}`.trim() || "Titular";

                return (
                  <li key={item.contract.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.contract.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        selectedId === item.contract.id ? "border-[#4aa59c] bg-[#F8FAFC]" : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <p className="text-xs font-semibold text-slate-900">{item.contract.code}</p>
                      <p className="text-[11px] text-slate-600">{owner}</p>
                      <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">{item.contract.MembershipPlan?.name || "Plan"}</span>
                        <span className="font-medium text-slate-700">{item.printStatus}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="rounded-xl border border-slate-200 bg-white p-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Vista previa</h2>
            {selected ? (
              <div className="mt-3 space-y-3">
                <article className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-gradient-to-br from-[#F8FAFC] to-white p-4 shadow-sm">
                  <p className="text-[11px] uppercase tracking-wide text-[#2e75ba]">StarMedical Membership</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{selected.contract.code}</p>
                  <p className="text-sm text-slate-700">{selected.contract.MembershipPlan?.name || "Plan"}</p>
                  <div className="mt-3 text-xs text-slate-600">
                    <p>
                      Titular:{" "}
                      {selected.contract.ClientProfile?.companyName
                        ? selected.contract.ClientProfile.companyName
                        : `${selected.contract.ClientProfile?.firstName || ""} ${selected.contract.ClientProfile?.lastName || ""}`.trim() ||
                          "Titular"}
                    </p>
                    <p>Estado: {selected.contract.status}</p>
                    <p>Impreso: {selected.lastPrintedAt ? dateLabel(selected.lastPrintedAt) : "Pendiente"}</p>
                    {selected.reprintReason ? <p>Motivo reimpresión: {selected.reprintReason}</p> : null}
                  </div>
                </article>

                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={printCard}
                    className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
                  >
                    Imprimir
                  </button>
                  <button
                    type="button"
                    onClick={() => markPrinted(selected.contract.id)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Marcar impreso
                  </button>
                  <button
                    type="button"
                    onClick={() => markReprint(selected.contract.id)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Registrar reimpresión
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">Selecciona un contrato para ver la tarjeta.</p>
            )}
          </section>
        </div>
      ) : null}
    </MembershipsShell>
  );
}
