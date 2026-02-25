import Link from "next/link";
import { ClientProfileType } from "@prisma/client";
import { ArrowRight, Building2, FileBarChart2, UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getClientsHomeKpis } from "@/lib/clients/dashboard.service";
import { getClientCompletenessScore } from "@/lib/clients/completeness";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function subDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function displayName(row: {
  type: ClientProfileType;
  firstName: string | null;
  middleName: string | null;
  thirdName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  thirdLastName: string | null;
  companyName: string | null;
  tradeName: string | null;
}) {
  if (row.type === ClientProfileType.PERSON) {
    return [row.firstName, row.middleName, row.thirdName, row.lastName, row.secondLastName, row.thirdLastName]
      .filter(Boolean)
      .join(" ");
  }
  return row.tradeName || row.companyName || "Cliente";
}

export default async function ClientesDashboardPage() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const since7 = subDays(now, 7);
  const since30 = subDays(now, 30);

  const [kpis, newToday, recentRows, sourceGroups] = await Promise.all([
    getClientsHomeKpis(),
    prisma.clientProfile.count({
      where: {
        deletedAt: null,
        createdAt: { gte: todayStart }
      }
    }),
    prisma.clientProfile.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        createdAt: true,
        firstName: true,
        middleName: true,
        thirdName: true,
        lastName: true,
        secondLastName: true,
        thirdLastName: true,
        companyName: true,
        tradeName: true,
        country: true,
        city: true,
        phone: true,
        email: true,
        dpi: true,
        nit: true,
        address: true,
        department: true,
        institutionTypeId: true
      }
    }),
    prisma.clientProfile.groupBy({
      by: ["acquisitionSourceId"],
      where: {
        deletedAt: null,
        createdAt: { gte: since30 }
      },
      _count: { _all: true }
    })
  ]);

  const topSourceGroups = [...sourceGroups]
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 5);

  const sourceIds = topSourceGroups
    .map((group) => group.acquisitionSourceId)
    .filter((value): value is string => Boolean(value));
  const sources = sourceIds.length
    ? await prisma.clientAcquisitionSource.findMany({
        where: { id: { in: sourceIds } },
        select: { id: true, name: true }
      })
    : [];
  const sourceMap = new Map(sources.map((source) => [source.id, source.name]));

  const avgScore = recentRows.length
    ? Math.round(
        recentRows.reduce((acc, row) => {
          return (
            acc +
            getClientCompletenessScore(
              {
                type: row.type,
                firstName: row.firstName,
                middleName: row.middleName,
                lastName: row.lastName,
                secondLastName: row.secondLastName,
                dpi: row.dpi,
                phone: row.phone,
                companyName: row.companyName,
                tradeName: row.tradeName,
                nit: row.nit,
                address: row.address,
                city: row.city,
                department: row.department,
                institutionTypeId: row.institutionTypeId
              },
              { weights: { profile: 70, documents: 30 } }
            )
          );
        }, 0) / recentRows.length
      )
    : 0;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2e75ba]">Clientes</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
              Dashboard de Clientes
            </h1>
            <p className="text-sm text-slate-600">Operación rápida (hoy / 7 días). Para análisis y exportación usa Reportes.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/clientes/personas/nuevo"
              className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4aadf5]"
              style={{ backgroundColor: "#4aa59c", color: "#ffffff" }}
            >
              <UserPlus size={16} />
              Crear persona
            </Link>
            <Link
              href="/admin/clientes/empresas/nuevo"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              <Building2 size={16} />
              Crear empresa
            </Link>
            <Link
              href="/admin/clientes/reportes"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              <FileBarChart2 size={16} />
              Ir a reportes
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Clientes activos" value={kpis.totalClients} />
        <KpiCard label="Nuevos hoy" value={newToday} />
        <KpiCard label="Nuevos 7 días" value={kpis.newClients7d} />
        <KpiCard label="Nuevos 30 días" value={kpis.newClients30d} />
        <KpiCard label="Score promedio" value={`${avgScore}%`} />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Distribución por tipo</p>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f8fafc] text-[#2e75ba]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                  <th className="px-3 py-2 text-right font-semibold">Incompletos</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(kpis.byType).map(([type, value], index) => (
                  <tr key={type} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                    <td className="px-3 py-2">{type}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{value.total}</td>
                    <td className="px-3 py-2 text-right">{value.incomplete}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Top canales (30 días)</p>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f8fafc] text-[#2e75ba]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Canal</th>
                  <th className="px-3 py-2 text-right font-semibold">Nuevos</th>
                </tr>
              </thead>
              <tbody>
                {topSourceGroups.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-3 text-center text-slate-500">
                      No hay datos para el rango seleccionado.
                    </td>
                  </tr>
                ) : (
                  topSourceGroups.map((group, index) => (
                    <tr key={`${group.acquisitionSourceId ?? "none"}-${index}`} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                      <td className="px-3 py-2">{group.acquisitionSourceId ? sourceMap.get(group.acquisitionSourceId) ?? "Canal" : "Sin canal"}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">{group._count._all}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Últimos clientes creados</p>
          <Link
            href="/admin/clientes/personas"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#2e75ba] hover:text-[#4aadf5]"
          >
            Ver listados
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f8fafc] text-[#2e75ba]">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                <th className="px-3 py-2 text-left font-semibold">Ubicación</th>
                <th className="px-3 py-2 text-left font-semibold">Contacto</th>
                <th className="px-3 py-2 text-right font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {recentRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-center text-slate-500">
                    Aún no hay clientes registrados.
                  </td>
                </tr>
              ) : (
                recentRows.map((row, index) => (
                  <tr key={row.id} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                    <td className="px-3 py-2">{row.createdAt.toLocaleDateString()}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{displayName(row) || "Cliente"}</td>
                    <td className="px-3 py-2">{row.type}</td>
                    <td className="px-3 py-2">{[row.city, row.country].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-3 py-2">{row.phone || row.email || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/clientes/${row.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                      >
                        Ver perfil
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="rounded-2xl border border-[#dce7f5] bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </article>
  );
}
