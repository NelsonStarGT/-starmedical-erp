import { ChevronDown, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ClientBulkExportMenu({
  templateCsvHref,
  templateXlsxHref,
  dataCsvHref,
  canExportTemplate,
  canExportData,
  canExportCsvTemplate = true,
  className,
  disabledLabel = "Exportar (sin permisos)"
}: {
  templateCsvHref: string;
  templateXlsxHref: string;
  dataCsvHref: string;
  canExportTemplate: boolean;
  canExportData: boolean;
  canExportCsvTemplate?: boolean;
  className?: string;
  disabledLabel?: string;
}) {
  const disabled = !canExportTemplate && !canExportData;
  if (disabled) {
    return (
      <span
        className={cn(
          "inline-flex h-10 items-center rounded-full border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-500",
          className
        )}
      >
        {disabledLabel}
      </span>
    );
  }

  return (
    <details className={cn("group relative", className)}>
      <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]">
        <Download size={16} />
        Exportar
        <ChevronDown size={14} className="transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
        <p className="px-2 pb-2 text-[11px] text-slate-500">Plantilla oficial: Excel (XLSX).</p>
        {canExportTemplate ? (
          <a
            href={templateXlsxHref}
            className="block rounded-lg px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-[#f1f8ff] hover:text-[#2e75ba]"
          >
            Descargar plantilla Excel (oficial)
          </a>
        ) : (
          <div className="block rounded-lg px-2 py-2 text-sm font-semibold text-slate-400">Descargar plantilla Excel (sin acceso)</div>
        )}
        {canExportTemplate && canExportCsvTemplate ? (
          <a
            href={templateCsvHref}
            className="mt-1 block rounded-lg px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-[#f1f8ff] hover:text-[#2e75ba]"
          >
            Descargar plantilla CSV
          </a>
        ) : null}
        {canExportData ? (
          <a
            href={dataCsvHref}
            className="mt-1 block rounded-lg px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-[#f1f8ff] hover:text-[#2e75ba]"
          >
            Exportar datos CSV
          </a>
        ) : (
          <div className="mt-1 block rounded-lg px-2 py-2 text-sm font-semibold text-slate-400">Exportar datos CSV (sin acceso)</div>
        )}
      </div>
    </details>
  );
}
