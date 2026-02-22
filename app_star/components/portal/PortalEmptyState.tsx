export function PortalEmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d2e2f6] bg-[#f8fbff] px-4 py-6">
      <p className="text-sm font-semibold text-[#2e75ba]">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
