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

type PrintTemplateConfig = {
  frontTitle: string;
  backTitle: string;
  includeQr: boolean;
  includePlan: boolean;
  includeValidity: boolean;
};

const DEFAULT_TEMPLATE: PrintTemplateConfig = {
  frontTitle: "StarMedical · Carnet de Membresía",
  backTitle: "Información de uso clínico",
  includeQr: true,
  includePlan: true,
  includeValidity: true
};

export default function MembershipPrintPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"cola" | "plantilla">("cola");
  const [template, setTemplate] = useState<PrintTemplateConfig>(DEFAULT_TEMPLATE);
  const [reprintCode, setReprintCode] = useState("");

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
    if (!reprintCode.trim() || reprintCode.trim().length < 4) {
      setError("Ingresa un código de autorización válido para reimpresión.");
      return;
    }
    const reason = window.prompt("Motivo de reimpresión", "Pérdida o daño") || "Sin motivo";
    setQueue((prev) =>
      prev.map((item) =>
        item.contract.id === id
          ? {
              ...item,
              printStatus: "REIMPRESION",
              lastPrintedAt: new Date().toISOString(),
              reprintReason: `${reason} · auth:${reprintCode.trim()}`
            }
          : item
      )
    );
    setError(null);
    setReprintCode("");
  }

  function printCard() {
    window.print();
  }

  const queueSummary = useMemo(() => {
    return queue.reduce(
      (acc, item) => {
        if (item.printStatus === "IMPRESO") acc.printed += 1;
        if (item.printStatus === "REIMPRESION") acc.reprints += 1;
        if (item.printStatus === "PENDIENTE") acc.pending += 1;
        return acc;
      },
      { pending: 0, printed: 0, reprints: 0 }
    );
  }, [queue]);

  return (
    <MembershipsShell
      title="Impresión · Carnets"
      description="Cola de impresión, reimpresión controlada y plantilla visual."
    >
      <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-[#F8FAFC] p-2">
        <button
          type="button"
          onClick={() => setActiveTab("cola")}
          className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
            activeTab === "cola" ? "bg-[#4aa59c] text-white" : "border border-slate-300 bg-white text-slate-700"
          }`}
        >
          Cola de impresión
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("plantilla")}
          className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
            activeTab === "plantilla" ? "bg-[#4aa59c] text-white" : "border border-slate-300 bg-white text-slate-700"
          }`}
        >
          Configuración de plantilla
        </button>
      </div>

      {loading ? <p className="text-xs text-slate-500">Cargando cola de impresión...</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      {!loading && queue.length === 0 ? (
        <EmptyState
          title="Sin contratos para imprimir"
          description="No hay afiliaciones activas para generar carnets en este momento."
        />
      ) : null}

      {queue.length > 0 && activeTab === "cola" ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Pendientes</p>
              <p className="mt-1 text-lg font-semibold text-[#2e75ba]">{queueSummary.pending}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Impresos</p>
              <p className="mt-1 text-lg font-semibold text-[#2e75ba]">{queueSummary.printed}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Reimpresiones</p>
              <p className="mt-1 text-lg font-semibold text-[#2e75ba]">{queueSummary.reprints}</p>
            </article>
          </div>

          <div className="grid gap-3 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
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
                          selectedId === item.contract.id
                            ? "border-[#4aa59c] bg-[#F8FAFC]"
                            : "border-slate-200 bg-white hover:bg-slate-50"
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

            <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Vista previa</h2>
              {selected ? (
                <div className="mt-3 space-y-3">
                  <article className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-gradient-to-br from-[#F8FAFC] to-white p-4 shadow-sm">
                    <p className="text-[11px] uppercase tracking-wide text-[#2e75ba]">{template.frontTitle}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{selected.contract.code}</p>
                    {template.includePlan ? <p className="text-sm text-slate-700">{selected.contract.MembershipPlan?.name || "Plan"}</p> : null}
                    <div className="mt-3 text-xs text-slate-600">
                      <p>
                        Titular:{" "}
                        {selected.contract.ClientProfile?.companyName
                          ? selected.contract.ClientProfile.companyName
                          : `${selected.contract.ClientProfile?.firstName || ""} ${selected.contract.ClientProfile?.lastName || ""}`.trim() ||
                            "Titular"}
                      </p>
                      {template.includeValidity ? <p>Estado: {selected.contract.status}</p> : null}
                      <p>Impreso: {selected.lastPrintedAt ? dateLabel(selected.lastPrintedAt) : "Pendiente"}</p>
                    </div>
                    {template.includeQr ? (
                      <div className="mt-3 inline-flex rounded-md border border-dashed border-slate-300 px-2 py-1 text-[11px] text-slate-500">
                        QR placeholder
                      </div>
                    ) : null}
                  </article>

                  <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
                    <label className="space-y-1 text-xs text-slate-700">
                      <span className="font-semibold">Código de autorización para reimpresión (placeholder)</span>
                      <input
                        value={reprintCode}
                        onChange={(event) => setReprintCode(event.target.value)}
                        placeholder="Ej: AUTH-2026"
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
                      />
                    </label>
                  </div>

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
                <p className="mt-3 text-xs text-slate-500">Selecciona una afiliación para vista previa.</p>
              )}
            </section>
          </div>
        </>
      ) : null}

      {activeTab === "plantilla" ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#2e75ba]">Plantilla de carnet (front/back)</h2>
          <p className="mt-1 text-xs text-slate-600">
            Configuración visual local de campos. Placeholder UI hasta definir persistencia formal.
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-xs text-slate-700">
              <span className="font-semibold">Título frontal</span>
              <input
                value={template.frontTitle}
                onChange={(event) => setTemplate((prev) => ({ ...prev, frontTitle: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-700">
              <span className="font-semibold">Título posterior</span>
              <input
                value={template.backTitle}
                onChange={(event) => setTemplate((prev) => ({ ...prev, backTitle: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={template.includeQr}
                onChange={(event) => setTemplate((prev) => ({ ...prev, includeQr: event.target.checked }))}
              />
              Mostrar QR
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={template.includePlan}
                onChange={(event) => setTemplate((prev) => ({ ...prev, includePlan: event.target.checked }))}
              />
              Mostrar plan
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={template.includeValidity}
                onChange={(event) => setTemplate((prev) => ({ ...prev, includeValidity: event.target.checked }))}
              />
              Mostrar vigencia
            </label>
          </div>
        </section>
      ) : null}
    </MembershipsShell>
  );
}
