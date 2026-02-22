import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function EmptyState({ title, description, ctaHref, ctaLabel }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-[#F8FAFC] p-6 text-center">
      <h3 className="text-sm font-semibold text-[#2e75ba]">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-xs text-slate-600">{description}</p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="mt-4 inline-flex items-center rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
