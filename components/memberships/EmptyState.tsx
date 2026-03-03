import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
};

export function EmptyState({
  title,
  description,
  ctaHref,
  ctaLabel,
  secondaryCtaHref,
  secondaryCtaLabel
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-[#F8FAFC] p-6 text-center">
      <h3 className="text-sm font-semibold text-[#2e75ba]">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-xs text-slate-600">{description}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {secondaryCtaHref && secondaryCtaLabel ? (
          <Link
            href={secondaryCtaHref}
            className="inline-flex items-center rounded-lg border border-[#4aa59c] px-3 py-2 text-xs font-semibold text-[#4aa59c] transition hover:bg-white"
          >
            {secondaryCtaLabel}
          </Link>
        ) : null}
        {ctaHref && ctaLabel ? (
          <Link
            href={ctaHref}
            className="inline-flex items-center rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
          >
            {ctaLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
