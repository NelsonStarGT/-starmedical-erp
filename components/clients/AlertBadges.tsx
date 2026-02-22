import { cn } from "@/lib/utils";

type DocPreview = { title: string; expiresAt: Date | null };

function DocTooltip({
  label,
  docs,
  tone
}: {
  label: string;
  docs: DocPreview[];
  tone: "danger" | "warning";
}) {
  const visible = docs.slice(0, 5);
  const hasMore = docs.length > 5;

  return (
    <div className="group relative inline-flex">
      <span
        className={cn(
          "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
          tone === "danger" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-sky-200 bg-sky-50 text-sky-800"
        )}
      >
        {label}
      </span>
      <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden min-w-64 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-md group-hover:block">
        <p className="font-semibold text-slate-900">{label}</p>
        <ul className="mt-1 space-y-1">
          {visible.map((doc, idx) => (
            <li key={`${doc.title}-${idx}`} className="truncate">
              {doc.title}
            </li>
          ))}
        </ul>
        {hasMore && <p className="mt-1 text-slate-500">Ver más en perfil...</p>}
      </div>
    </div>
  );
}

export default function AlertBadges({
  isIncomplete,
  hasExpiredDocs,
  hasExpiringDocs,
  expiredDocsPreview,
  expiringDocsPreview
}: {
  isIncomplete: boolean;
  hasExpiredDocs: boolean;
  hasExpiringDocs: boolean;
  expiredDocsPreview: DocPreview[];
  expiringDocsPreview: DocPreview[];
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {isIncomplete && (
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
          Incompleto
        </span>
      )}
      {hasExpiredDocs && <DocTooltip label="Docs vencidos" docs={expiredDocsPreview} tone="danger" />}
      {!hasExpiredDocs && hasExpiringDocs && <DocTooltip label="Por vencer" docs={expiringDocsPreview} tone="warning" />}
      {!isIncomplete && !hasExpiredDocs && !hasExpiringDocs && <span className="text-xs text-slate-500">—</span>}
    </div>
  );
}
