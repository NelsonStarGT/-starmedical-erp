import Link from "next/link";

type OpsListItem = {
  id: string;
  primary: string;
  secondary?: string;
  badge?: string;
};

type OpsListCardProps = {
  title: string;
  subtitle?: string;
  items: OpsListItem[];
  emptyCopy: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function OpsListCard({ title, subtitle, items, emptyCopy, ctaLabel, ctaHref }: OpsListCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#2e75ba]">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-slate-600">{subtitle}</p> : null}
        </div>
        {ctaHref && ctaLabel ? (
          <Link
            href={ctaHref}
            className="rounded-lg border border-[#4aa59c] px-3 py-1.5 text-xs font-semibold text-[#4aa59c] transition hover:bg-[#F8FAFC]"
          >
            {ctaLabel}
          </Link>
        ) : null}
      </header>

      {items.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">{emptyCopy}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-700">{item.primary}</p>
                {item.secondary ? <p className="mt-0.5 truncate text-[11px] text-slate-500">{item.secondary}</p> : null}
              </div>
              {item.badge ? (
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#2e75ba]">
                  {item.badge}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
