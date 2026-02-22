"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CompactTable } from "@/components/memberships/CompactTable";
import { EmptyState } from "@/components/memberships/EmptyState";
import { MembershipsShell } from "@/components/memberships/MembershipsShell";
import { dateLabel, money, contractStatusBadgeClass } from "@/app/admin/membresias/_lib";

type RenewalRow = {
  id: string;
  code: string;
  status: string;
  nextRenewAt: string | null;
  balance: number;
  MembershipPlan?: {
    name: string;
  };
  ClientProfile?: {
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
  };
};

function daysTo(dateValue?: string | null) {
  if (!dateValue) return null;
  const now = new Date();
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function MembershipRenewalsPage() {
  const [rows, setRows] = useState<RenewalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/memberships/contracts?renewWindowDays=30&take=200", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudo cargar renovaciones");
        if (mounted) setRows(Array.isArray(json.data) ? json.data : []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "No se pudo cargar renovaciones");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const grouped = useMemo(() => {
    const in7: RenewalRow[] = [];
    const in15: RenewalRow[] = [];
    const in30: RenewalRow[] = [];

    for (const row of rows) {
      const days = daysTo(row.nextRenewAt);
      if (days === null || days < 0 || days > 30) continue;
      if (days <= 7) in7.push(row);
      else if (days <= 15) in15.push(row);
      else in30.push(row);
    }

    return { in7, in15, in30 };
  }, [rows]);

  const flatRows = [...grouped.in7, ...grouped.in15, ...grouped.in30];

  return (
    <MembershipsShell
      title="Renovaciones · Cola operativa"
      description="Operación de vencimientos. Cobranza se ejecuta fuera de este módulo."
    >
      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Vence en 7 días</p>
          <p className="mt-1 text-lg font-semibold text-[#2e75ba]">{grouped.in7.length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Vence en 15 días</p>
          <p className="mt-1 text-lg font-semibold text-[#2e75ba]">{grouped.in15.length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Vence en 30 días</p>
          <p className="mt-1 text-lg font-semibold text-[#2e75ba]">{grouped.in30.length}</p>
        </article>
      </div>

      {loading ? <p className="text-xs text-slate-500">Cargando cola...</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      {!loading && flatRows.length === 0 ? (
        <EmptyState
          title="Sin renovaciones pendientes"
          description="No hay contratos en ventana de 30 días."
        />
      ) : null}

      {flatRows.length > 0 ? (
        <CompactTable columns={["Contrato", "Titular", "Plan", "Próxima renovación", "Saldo", "Estado", "Acciones"]}>
          {flatRows.map((row) => {
            const ownerLabel = row.ClientProfile?.companyName
              ? row.ClientProfile.companyName
              : `${row.ClientProfile?.firstName || ""} ${row.ClientProfile?.lastName || ""}`.trim() || "Titular";

            return (
              <tr key={row.id}>
                <td className="px-3 py-2 text-slate-900">{row.code}</td>
                <td className="px-3 py-2 text-slate-800">
                  <p>{ownerLabel}</p>
                  <p className="text-[11px] text-slate-500">{row.ClientProfile?.email || row.ClientProfile?.phone || "-"}</p>
                </td>
                <td className="px-3 py-2 text-slate-700">{row.MembershipPlan?.name || "-"}</td>
                <td className="px-3 py-2 text-slate-700">{dateLabel(row.nextRenewAt)}</td>
                <td className="px-3 py-2 text-slate-900">{money(row.balance)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${contractStatusBadgeClass(row.status)}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Link
                      href={`/admin/facturacion?source=membership&contractId=${row.id}`}
                      className="rounded-md border border-[#4aa59c] px-2 py-1 text-[11px] font-semibold text-[#4aa59c]"
                    >
                      Generar factura
                    </Link>
                    <Link
                      href={`/admin/membresias/contratos/${row.id}`}
                      className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
                    >
                      Ver contrato
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </CompactTable>
      ) : null}
    </MembershipsShell>
  );
}
