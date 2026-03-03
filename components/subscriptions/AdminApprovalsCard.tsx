import Link from "next/link";

type AdminApprovalItem = {
  id: string;
  label: string;
  count: number;
  hint?: string;
};

type AdminApprovalsCardProps = {
  isAdmin: boolean;
  items: AdminApprovalItem[];
  href?: string;
};

export function AdminApprovalsCard({ isAdmin, items, href = "/admin/suscripciones/configuracion" }: AdminApprovalsCardProps) {
  if (!isAdmin) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#2e75ba]">Aprobaciones pendientes</h3>
          <p className="mt-1 text-xs text-slate-600">Autorizaciones de cupones, cambios de fecha con recargo y reimpresiones.</p>
        </div>
        <Link
          href={href}
          className="rounded-lg bg-[#4aa59c] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
        >
          Ver aprobaciones
        </Link>
      </header>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-1 text-lg font-semibold text-[#2e75ba]">{item.count}</p>
            {item.hint ? <p className="mt-1 text-[11px] text-slate-500">{item.hint}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
