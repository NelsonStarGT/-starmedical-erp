import Link from "next/link";
import { Building2, Landmark, PlusCircle, Shield, Users } from "lucide-react";
import { ClientProfileType } from "@prisma/client";
import { getClientsHomeKpis } from "@/lib/clients/dashboard.service";
import { CLIENT_TYPE_LABELS } from "@/lib/clients/constants";
import { cn } from "@/lib/utils";

function KpiCard({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <div className="rounded-xl border border-[#e5edf8] bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p
        className={cn(
          "mt-2 text-3xl font-semibold",
          tone === "danger"
            ? "text-rose-600"
            : tone === "warning"
              ? "text-amber-600"
              : "text-slate-900"
        )}
        style={{ fontFamily: "var(--font-clients-heading)" }}
      >
        {value}
      </p>
    </div>
  );
}

function TypeFlashcard({
  type,
  total,
  incomplete,
  docsExpired,
  docsExpiring
}: {
  type: ClientProfileType;
  total: number;
  incomplete: number;
  docsExpired: number;
  docsExpiring: number;
}) {
  const Icon =
    type === ClientProfileType.PERSON
      ? Users
      : type === ClientProfileType.COMPANY
        ? Building2
        : type === ClientProfileType.INSURER
          ? Shield
          : Landmark;
  const listHref =
    type === ClientProfileType.PERSON
      ? "/admin/clientes/personas"
      : type === ClientProfileType.COMPANY
        ? "/admin/clientes/empresas"
        : type === ClientProfileType.INSURER
          ? "/admin/clientes/aseguradoras"
          : "/admin/clientes/instituciones";
  const createHref = `${listHref}/nuevo`;

  return (
    <div className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-diagnostics-corporate">
            {CLIENT_TYPE_LABELS[type]}
          </p>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-diagnostics-background p-3 text-diagnostics-primary">
              <Icon size={18} />
            </div>
            <div>
              <p className="text-3xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
                {total}
              </p>
              <p className="text-sm text-slate-600">Clientes registrados</p>
            </div>
          </div>
        </div>
        <div className="space-y-2 text-right">
          {(incomplete > 0 || docsExpired > 0 || docsExpiring > 0) ? (
            <div className="inline-flex flex-col items-end gap-1">
              {incomplete > 0 && (
                <Link
                  href={`${listHref}?alert=INCOMPLETE`}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                >
                  {incomplete} incompletos
                </Link>
              )}
              {docsExpired > 0 && (
                <Link
                  href={`${listHref}?alert=DOCS_EXPIRED`}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  {docsExpired} docs vencidos
                </Link>
              )}
              {docsExpired === 0 && docsExpiring > 0 && (
                <Link
                  href={`${listHref}?alert=DOCS_EXPIRING`}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100"
                >
                  {docsExpiring} por vencer (30d)
                </Link>
              )}
            </div>
          ) : (
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              Sin alertas
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={listHref}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-diagnostics-secondary hover:text-diagnostics-corporate"
        >
          Ver listado
        </Link>
        <Link
          href={createHref}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-diagnostics-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-diagnostics-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-diagnostics-primary/30 focus-visible:ring-offset-2"
        >
          <PlusCircle size={16} />
          Crear nuevo
        </Link>
      </div>
    </div>
  );
}

export default async function ClientesHomePage() {
  const kpis = await getClientsHomeKpis();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total clientes" value={kpis.totalClients} />
        <KpiCard label="Clientes incompletos" value={kpis.incompleteClients} tone={kpis.incompleteClients > 0 ? "warning" : "default"} />
        <KpiCard
          label="Documentos vencidos / por vencer (30d)"
          value={`${kpis.documentsExpired} / ${kpis.documentsExpiring}`}
          tone={kpis.documentsExpired > 0 ? "danger" : kpis.documentsExpiring > 0 ? "warning" : "default"}
        />
        <KpiCard label="Clientes nuevos (7 / 30 días)" value={`${kpis.newClients7d} / ${kpis.newClients30d}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <TypeFlashcard
          type={ClientProfileType.PERSON}
          total={kpis.byType[ClientProfileType.PERSON].total}
          incomplete={kpis.byType[ClientProfileType.PERSON].incomplete}
          docsExpired={kpis.byType[ClientProfileType.PERSON].docsExpired}
          docsExpiring={kpis.byType[ClientProfileType.PERSON].docsExpiring}
        />
        <TypeFlashcard
          type={ClientProfileType.COMPANY}
          total={kpis.byType[ClientProfileType.COMPANY].total}
          incomplete={kpis.byType[ClientProfileType.COMPANY].incomplete}
          docsExpired={kpis.byType[ClientProfileType.COMPANY].docsExpired}
          docsExpiring={kpis.byType[ClientProfileType.COMPANY].docsExpiring}
        />
        <TypeFlashcard
          type={ClientProfileType.INSTITUTION}
          total={kpis.byType[ClientProfileType.INSTITUTION].total}
          incomplete={kpis.byType[ClientProfileType.INSTITUTION].incomplete}
          docsExpired={kpis.byType[ClientProfileType.INSTITUTION].docsExpired}
          docsExpiring={kpis.byType[ClientProfileType.INSTITUTION].docsExpiring}
        />
        <TypeFlashcard
          type={ClientProfileType.INSURER}
          total={kpis.byType[ClientProfileType.INSURER].total}
          incomplete={kpis.byType[ClientProfileType.INSURER].incomplete}
          docsExpired={kpis.byType[ClientProfileType.INSURER].docsExpired}
          docsExpiring={kpis.byType[ClientProfileType.INSURER].docsExpiring}
        />
      </div>
    </div>
  );
}
