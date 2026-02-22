"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MembershipsShell } from "@/components/memberships/MembershipsShell";
import { CompactTable } from "@/components/memberships/CompactTable";
import { dateLabel, money, contractStatusBadgeClass } from "@/app/admin/membresias/_lib";
import { buildMembershipInvoiceLink } from "@/lib/memberships/links";

type ContractDetail = {
  id: string;
  code: string;
  status: string;
  ownerType: "PERSON" | "COMPANY";
  startAt: string;
  nextRenewAt: string | null;
  billingFrequency: string;
  balance: number;
  priceLockedMonthly: number | null;
  priceLockedAnnual: number | null;
  lastInvoiceId?: string | null;
  MembershipPlan?: {
    id: string;
    name: string;
    segment: "B2C" | "B2B";
    priceMonthly: number;
    priceAnnual: number;
  };
  ClientProfile?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  MembershipPayment?: Array<{
    id: string;
    amount: number;
    method: string;
    kind: string;
    status: string;
    paidAt?: string | null;
    refNo?: string | null;
    invoiceId?: string | null;
    createdAt: string;
  }>;
};

export default function MembershipContractDetailPage() {
  const params = useParams<{ id: string }>();
  const contractId = String(params?.id || "");
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyPayment, setBusyPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "CASH",
    kind: "RENEWAL",
    status: "PAID",
    refNo: "",
    invoiceId: "",
    notes: ""
  });

  async function load() {
    if (!contractId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/memberships/contracts/${contractId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo cargar contrato");
      setContract(json.data);
    } catch (err: any) {
      setError(err?.message || "Error cargando contrato");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!contractId) {
      setLoading(false);
      setError("Contrato inválido");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!paymentForm.amount) {
      setError("Monto requerido");
      return;
    }

    try {
      setBusyPayment(true);
      const res = await fetch(`/api/memberships/contracts/${contractId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(paymentForm.amount),
          method: paymentForm.method,
          kind: paymentForm.kind,
          status: paymentForm.status,
          refNo: paymentForm.refNo || null,
          invoiceId: paymentForm.invoiceId || null,
          notes: paymentForm.notes || null
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo registrar pago");
      setPaymentForm((prev) => ({ ...prev, amount: "", refNo: "", notes: "" }));
      await load();
    } catch (err: any) {
      setError(err?.message || "No se pudo registrar pago");
    } finally {
      setBusyPayment(false);
    }
  }

  const ownerLabel = contract?.ClientProfile
    ? contract.ownerType === "COMPANY"
      ? contract.ClientProfile.companyName || "Empresa"
      : `${contract.ClientProfile.firstName || ""} ${contract.ClientProfile.lastName || ""}`.trim() || "Paciente"
    : "Sin titular";

  return (
    <MembershipsShell
      title={`Contrato ${contract?.code || ""}`}
      description="Detalle operativo del contrato, historial y registro de pagos (sin reactivación automática de estados suspendidos/cancelados)."
      actions={
        <Link
          href={buildMembershipInvoiceLink({ contractId })}
          className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
        >
          Generar factura
        </Link>
      }
    >
      {loading ? <p className="text-xs text-slate-500">Cargando contrato...</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      {contract ? (
        <div className="space-y-4">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Titular</p>
              <p className="mt-1 text-sm font-semibold text-[#2e75ba]">{ownerLabel}</p>
              <p className="text-[11px] text-slate-500">{contract.ClientProfile?.email || contract.ClientProfile?.phone || "-"}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Plan</p>
              <p className="mt-1 text-sm font-semibold text-[#2e75ba]">{contract.MembershipPlan?.name || "-"}</p>
              <p className="text-[11px] text-slate-500">{contract.MembershipPlan?.segment || "-"}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Estado</p>
              <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${contractStatusBadgeClass(contract.status)}`}>
                {contract.status}
              </span>
              <p className="mt-1 text-[11px] text-slate-500">Renueva: {dateLabel(contract.nextRenewAt)}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Saldo</p>
              <p className="mt-1 text-sm font-semibold text-[#2e75ba]">{money(contract.balance)}</p>
              <p className="text-[11px] text-slate-500">Facturación: {contract.lastInvoiceId || "Pendiente"}</p>
            </article>
          </section>

          <section className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Registrar pago</h2>
            <form onSubmit={submitPayment} className="mt-2 grid gap-2 md:grid-cols-4">
              <label className="space-y-1 text-[11px] text-slate-700">
                <span className="font-semibold">Monto</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
                  value={paymentForm.amount}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
                  required
                />
              </label>
              <label className="space-y-1 text-[11px] text-slate-700">
                <span className="font-semibold">Método</span>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
                  value={paymentForm.method}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, method: event.target.value }))}
                >
                  <option value="CASH">Efectivo</option>
                  <option value="TRANSFER">Transferencia</option>
                  <option value="CARD">Tarjeta</option>
                </select>
              </label>
              <label className="space-y-1 text-[11px] text-slate-700">
                <span className="font-semibold">Tipo</span>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
                  value={paymentForm.kind}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, kind: event.target.value }))}
                >
                  <option value="INITIAL">Inicial</option>
                  <option value="RENEWAL">Renovación</option>
                  <option value="EXTRA">Extra</option>
                </select>
              </label>
              <label className="space-y-1 text-[11px] text-slate-700">
                <span className="font-semibold">Referencia</span>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
                  value={paymentForm.refNo}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, refNo: event.target.value }))}
                />
              </label>

              <label className="space-y-1 text-[11px] text-slate-700 md:col-span-2">
                <span className="font-semibold">Invoice/Recibo ID (opcional)</span>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
                  value={paymentForm.invoiceId}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, invoiceId: event.target.value }))}
                />
              </label>

              <label className="space-y-1 text-[11px] text-slate-700 md:col-span-2">
                <span className="font-semibold">Notas</span>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
                  value={paymentForm.notes}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </label>

              <div className="md:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-60"
                  disabled={busyPayment}
                >
                  {busyPayment ? "Registrando..." : "Registrar pago"}
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-[#2e75ba]">Historial de pagos</h2>
            {contract.MembershipPayment?.length ? (
              <CompactTable columns={["Fecha", "Monto", "Método", "Tipo", "Estado", "Referencia", "Invoice"]}>
                {contract.MembershipPayment.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-3 py-2 text-slate-700">{dateLabel(payment.paidAt || payment.createdAt)}</td>
                    <td className="px-3 py-2 text-slate-900">{money(payment.amount)}</td>
                    <td className="px-3 py-2 text-slate-700">{payment.method}</td>
                    <td className="px-3 py-2 text-slate-700">{payment.kind}</td>
                    <td className="px-3 py-2 text-slate-700">{payment.status}</td>
                    <td className="px-3 py-2 text-slate-700">{payment.refNo || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{payment.invoiceId || "-"}</td>
                  </tr>
                ))}
              </CompactTable>
            ) : (
              <p className="text-xs text-slate-500">Aún no hay pagos registrados.</p>
            )}
          </section>
        </div>
      ) : null}
    </MembershipsShell>
  );
}
