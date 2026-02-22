import Link from "next/link";
import { FileCheck2, FileX2, FileText } from "lucide-react";
import BillingStatusBadge from "@/components/facturacion/BillingStatusBadge";
import { formatBillingDate, formatBillingMoney } from "@/lib/billing/format";
import { listBillingCases } from "@/lib/billing/service";

export default function FacturacionDocumentosPage() {
  const cases = listBillingCases();
  const pendingDocs = cases.filter((item) => item.status === "PAGADO_PEND_DOC");
  const adjustments = cases.filter((item) => item.status === "AJUSTADO_NC" || item.status === "ANULADO");
  const recentIssued = cases
    .flatMap((item) => item.documents.map((doc) => ({ caseId: item.id, caseNumber: item.caseNumber, patient: item.patientName, doc })))
    .filter((row) => row.doc.status === "EMITIDO")
    .sort((a, b) => Date.parse(b.doc.issuedAt ?? "") - Date.parse(a.doc.issuedAt ?? ""))
    .slice(0, 8);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Facturación · Documentos</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-billing-heading)" }}>
          Emisión y ajustes fiscales
        </h1>
        <p className="mt-1 text-sm text-slate-600">Control de emisión, anulación y notas de crédito por expediente de cobro.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[#2e75ba]">
            <FileText className="h-4 w-4" />
            <p className="text-sm font-semibold">Pendientes de emisión</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-[#102a43]">{pendingDocs.length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-700">
            <FileCheck2 className="h-4 w-4" />
            <p className="text-sm font-semibold">Emitidos recientes</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-[#102a43]">{recentIssued.length}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-rose-700">
            <FileX2 className="h-4 w-4" />
            <p className="text-sm font-semibold">Ajustes / anulaciones</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-[#102a43]">{adjustments.length}</p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-billing-heading)" }}>
            Documentos pendientes por emitir
          </h2>
          <Link href="/admin/facturacion/bandeja/DOCUMENTOS_POR_EMITIR" className="text-xs font-semibold text-[#2e75ba] hover:underline">
            Abrir bandeja
          </Link>
        </div>

        {pendingDocs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No hay documentos pendientes.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Expediente</th>
                  <th className="px-3 py-2 font-semibold">Paciente</th>
                  <th className="px-3 py-2 font-semibold">Pagado</th>
                  <th className="px-3 py-2 font-semibold">Último pago</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingDocs.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      <Link href={`/admin/facturacion/expedientes/${item.id}`} className="hover:text-[#2e75ba]">
                        {item.caseNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{item.patientName}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{formatBillingMoney(item.paidAmount)}</td>
                    <td className="px-3 py-2 text-slate-600">{formatBillingDate(item.lastPaymentAt)}</td>
                    <td className="px-3 py-2">
                      <BillingStatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
