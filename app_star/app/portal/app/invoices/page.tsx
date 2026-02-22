import Link from "next/link";
import { headers } from "next/headers";
import { DocStatus } from "@prisma/client";
import { auditPortalView } from "@/lib/portal/audit";
import { getPortalInvoices } from "@/lib/portal/data";
import { formatPortalCurrency, formatPortalDate } from "@/lib/portal/format";
import { readPortalRequestMeta } from "@/lib/portal/requestMeta";
import { requirePortalSessionContext } from "@/lib/portal/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStatusLabel(status: string) {
  if (status === DocStatus.PAID) return "Pagada";
  if (status === DocStatus.PARTIAL) return "Parcial";
  if (status === DocStatus.OPEN) return "Pendiente";
  if (status === DocStatus.CANCELLED) return "Cancelada";
  return status;
}

function getStatusClasses(status: string) {
  if (status === DocStatus.PAID) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === DocStatus.PARTIAL) return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === DocStatus.OPEN) return "border-[#d2e2f6] bg-[#f6fbff] text-[#2e75ba]";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default async function PortalInvoicesPage() {
  const session = await requirePortalSessionContext();
  const requestMeta = readPortalRequestMeta(await headers());
  await auditPortalView({
    clientId: session.clientId,
    view: "invoices",
    ip: requestMeta.ip,
    userAgent: requestMeta.userAgent
  });

  const invoicesLookup = await getPortalInvoices(session.client);
  const invoices = invoicesLookup.items;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[#d2e2f6] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Facturación</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Mis facturas</h2>
        <p className="mt-2 text-sm text-slate-600">
          Puedes revisar estado de pago y descargar adjuntos cuando estén disponibles.
        </p>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d2e2f6] bg-[#f8fbff] p-8 text-sm text-slate-600">
          No se encontraron facturas asociadas a tu perfil por el momento.
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <article key={invoice.id} className="rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{invoice.reference || `Factura ${invoice.id.slice(-6).toUpperCase()}`}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{invoice.partyName}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(invoice.status)}`}>
                  {getStatusLabel(invoice.status)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Fecha</p>
                  <p className="mt-1 text-slate-800">{formatPortalDate(invoice.date)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Vence</p>
                  <p className="mt-1 text-slate-800">{formatPortalDate(invoice.dueDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Monto</p>
                  <p className="mt-1 text-slate-800">{formatPortalCurrency(invoice.amount)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pagado</p>
                  <p className="mt-1 text-slate-800">{formatPortalCurrency(invoice.paidAmount)}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Adjuntos</p>
                {invoice.attachments.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">Sin archivos adjuntos disponibles.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {invoice.attachments.map((attachment) => (
                      <Link
                        key={`${invoice.id}-${attachment.fileUrl}`}
                        href={attachment.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-[#d2e2f6] bg-[#f6fbff] px-3 py-1 text-xs font-semibold text-[#2e75ba] hover:border-[#4aadf5]"
                      >
                        Descargar {attachment.fileName}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {invoicesLookup.warning && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {invoicesLookup.warning}
        </div>
      )}
    </section>
  );
}
