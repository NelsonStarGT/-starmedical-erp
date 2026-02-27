"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CircleDollarSign, CreditCard, ReceiptText } from "lucide-react";
import SearchClientBar, { type SearchClientBarItem } from "@/components/recepcion/SearchClientBar";
import { cn } from "@/lib/utils";

type ServiceOption = {
  id: string;
  name: string;
  amount: number;
};

const SERVICES: ServiceOption[] = [
  { id: "svc-consulta", name: "Consulta general", amount: 250 },
  { id: "svc-lab", name: "Panel básico laboratorio", amount: 380 },
  { id: "svc-checkup", name: "Check-up ejecutivo", amount: 1200 },
  { id: "svc-ocupacional", name: "Evaluación ocupacional", amount: 520 }
];

const PAYMENT_METHODS = ["Efectivo", "Tarjeta", "Transferencia", "Seguro"] as const;

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2
  }).format(value);
}

export default function CashierV1({ canWrite }: { canWrite: boolean }) {
  const [client, setClient] = useState<SearchClientBarItem | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(SERVICES[0]?.id || "");
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("Efectivo");
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);

  const selectedService = useMemo(
    () => SERVICES.find((service) => service.id === selectedServiceId) || SERVICES[0],
    [selectedServiceId]
  );

  const total = selectedService?.amount || 0;
  const canSubmit = Boolean(client && selectedService && canWrite);

  return (
    <div className="space-y-4">
      <SearchClientBar
        title="Caja rápida v1"
        description="Busca cliente y registra cobro de un servicio rápido (stub)."
        navigateOnSelect={false}
        onSelect={(item) => setClient(item)}
      />

      <section className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-xs font-semibold text-slate-500">
            Servicio
            <select
              value={selectedServiceId}
              onChange={(event) => setSelectedServiceId(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
            >
              {SERVICES.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {formatMoney(service.amount)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-semibold text-slate-500">
            Método de pago
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as (typeof PAYMENT_METHODS)[number])}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Resumen de cobro</p>
          <p className="mt-2 text-sm text-slate-700">Cliente: <span className="font-semibold">{client?.displayName || "No seleccionado"}</span></p>
          <p className="text-sm text-slate-700">Servicio: {selectedService?.name || "N/A"}</p>
          <p className="text-sm text-slate-700">Método: {paymentMethod}</p>
          <p className="mt-1 text-xl font-semibold text-slate-900" style={{ fontFamily: '"Montserrat", "Poppins", var(--font-heading)' }}>
            Total: {formatMoney(total)}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              const ticket = `PAY-${Date.now().toString().slice(-6)}`;
              setLastReceipt(ticket);
            }}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-xl bg-[#4aa59c] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#3f988f]",
              !canSubmit && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
            )}
          >
            <CircleDollarSign size={15} />
            Registrar pago
          </button>

          <Link
            href="/admin/finanzas/receivables"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#4aadf5] hover:text-[#2e75ba]"
          >
            <CreditCard size={15} />
            Ir a Finanzas
          </Link>
        </div>

        {lastReceipt ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Pago registrado (placeholder). Comprobante: <span className="font-mono font-semibold">{lastReceipt}</span>
          </div>
        ) : null}

        {!canWrite ? <p className="mt-2 text-xs text-amber-700">Tu rol puede ver caja, pero no registrar pagos.</p> : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Integración v2</p>
        <p className="mt-1 text-xs text-slate-600">
          Este flujo está preparado para enlazar a facturación/caja real con folio fiscal y conciliación automática.
        </p>
        <Link href="/admin/facturacion/caja" className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-[#2e75ba] hover:text-[#4aadf5]">
          <ReceiptText size={14} />
          Abrir módulo de Facturación/Caja
        </Link>
      </section>
    </div>
  );
}
