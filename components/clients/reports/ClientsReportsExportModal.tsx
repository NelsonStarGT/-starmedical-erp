"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { resolveClientsReportsCsvDeliveryMode } from "@/lib/clients/reports/exportDelivery";
import {
  AMERICAS_SUBREGION_OPTIONS,
  MAP_REGION_OPTIONS,
  type AmericasSubregionKey,
  type MapRegionKey
} from "@/lib/clients/reports/countryRegions";
import {
  CLIENTS_REPORT_PANEL_OPTIONS,
  type ClientsReportPanelKey
} from "@/lib/clients/reports/panels";

type ExportFormat = "csv" | "xlsx" | "pdf";
type GeoLayerMode = "map" | "bubbles" | "both";
type GeoScopeMode = "WORLD" | "REGION" | "SUBREGION" | "COUNTRY";

const DEFAULT_SELECTED_SECTIONS: ClientsReportPanelKey[] = ["by_type", "top_channels", "geo", "clients_list"];
const EXPORT_COMPACT_PREFERENCES_STORAGE_KEY = "clients:reports:v23:export-compact";

export type ClientsReportsExportPayloadInput = {
  baseFilters: Record<string, string>;
  format: ExportFormat;
  mask: boolean;
  selectedSections: ClientsReportPanelKey[];
  geoLayerMode?: GeoLayerMode;
  geoScope?: GeoScopeMode;
  geoRegion?: MapRegionKey;
  geoSubregion?: AmericasSubregionKey;
  compactPdf?: boolean;
  compactXlsx?: boolean;
};

export function buildClientsReportsExportQuery(payload: ClientsReportsExportPayloadInput) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(payload.baseFilters)) {
    if (!value) continue;
    search.set(key, value);
  }
  search.set("format", payload.format);
  if (payload.mask) search.set("mask", "1");
  if (payload.selectedSections.length > 0) {
    search.set("sections", payload.selectedSections.join(","));
  }
  if (payload.compactPdf === false) search.set("compactPdf", "0");
  if (payload.compactXlsx === false) search.set("compactXlsx", "0");
  if (payload.geoLayerMode && payload.selectedSections.includes("geo")) {
    search.set("geoLayer", payload.geoLayerMode);
    search.set("geoScope", payload.geoScope || "WORLD");
    if (payload.geoRegion) search.set("geoRegion", payload.geoRegion);
    if (payload.geoSubregion) search.set("geoSubregion", payload.geoSubregion);
  }
  return search.toString();
}

export function resolveClientsReportsExportAvailability(params: {
  selectedSections: ClientsReportPanelKey[];
  sectionCounts?: Partial<Record<ClientsReportPanelKey, number>>;
}) {
  const hasSectionCounts = Boolean(params.sectionCounts);
  const selectedRowsTotal = params.selectedSections.reduce((total, key) => {
    return total + Number(params.sectionCounts?.[key] || 0);
  }, 0);
  const noDataForSelection =
    params.selectedSections.length > 0 && hasSectionCounts && selectedRowsTotal === 0;
  return {
    hasSectionCounts,
    selectedRowsTotal,
    noDataForSelection,
    canRunExport: params.selectedSections.length > 0 && !noDataForSelection
  };
}

export default function ClientsReportsExportModal({
  baseFilters,
  canExportFull,
  canExportMasked,
  sectionCounts
}: {
  baseFilters: Record<string, string>;
  canExportFull: boolean;
  canExportMasked: boolean;
  sectionCounts?: Partial<Record<ClientsReportPanelKey, number>>;
}) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [mask, setMask] = useState(!canExportFull);
  const [selectedSections, setSelectedSections] = useState<ClientsReportPanelKey[]>(DEFAULT_SELECTED_SECTIONS);
  const [geoLayerMode, setGeoLayerMode] = useState<GeoLayerMode>("both");
  const [geoScope, setGeoScope] = useState<GeoScopeMode>("WORLD");
  const [geoRegion, setGeoRegion] = useState<MapRegionKey>("AMERICAS");
  const [geoSubregion, setGeoSubregion] = useState<AmericasSubregionKey>("CENTRAL_AMERICA");
  const [compactPdf, setCompactPdf] = useState(true);
  const [compactXlsx, setCompactXlsx] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(EXPORT_COMPACT_PREFERENCES_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { compactPdf?: boolean; compactXlsx?: boolean };
      setCompactPdf(parsed.compactPdf !== false);
      setCompactXlsx(parsed.compactXlsx !== false);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      EXPORT_COMPACT_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        compactPdf,
        compactXlsx
      })
    );
  }, [compactPdf, compactXlsx]);

  const csvDeliveryMode = resolveClientsReportsCsvDeliveryMode({
    format,
    sectionsCount: selectedSections.length
  });
  const csvWillZip = csvDeliveryMode === "zip_csv";
  const availability = resolveClientsReportsExportAvailability({
    selectedSections,
    sectionCounts
  });
  const hasSectionCounts = availability.hasSectionCounts;
  const selectedRowsTotal = availability.selectedRowsTotal;
  const noDataForSelection = availability.noDataForSelection;
  const canRunExport = availability.canRunExport;
  const includesGeoSection = selectedSections.includes("geo");

  const selectedSectionLabels = useMemo(
    () =>
      CLIENTS_REPORT_PANEL_OPTIONS.filter((option) => selectedSections.includes(option.key)).map(
        (option) => option.label
      ),
    [selectedSections]
  );

  function toggleSection(key: ClientsReportPanelKey) {
    setSelectedSections((current) => {
      if (current.includes(key)) {
        return current.filter((value) => value !== key);
      }
      return [...current, key];
    });
  }

  function runExport() {
    if (!canRunExport) return;
    const query = buildClientsReportsExportQuery({
      baseFilters,
      format,
      mask,
      selectedSections,
      geoLayerMode,
      geoScope,
      geoRegion,
      geoSubregion,
      compactPdf,
      compactXlsx
    });
    window.open(`/api/clientes/reportes/export?${query}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  if (!canExportMasked && !canExportFull) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400"
        title="No tienes permisos para exportar reportes."
      >
        <Download size={15} />
        Exportar
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
      >
        <Download size={15} />
        Exportar
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Exportar reportes"
        subtitle="Selecciona secciones y formato con los filtros actuales."
        className="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-slate-700">Formato</span>
              <select
                value={format}
                onChange={(event) => {
                  const next = event.target.value;
                  setFormat(next === "csv" || next === "pdf" ? next : "xlsx");
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
            </label>

            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={mask}
                onChange={(event) => setMask(event.target.checked)}
                disabled={!canExportFull}
                className="h-4 w-4 rounded border-slate-300 text-[#4aa59c]"
              />
              Exportar datos enmascarados
            </label>

            <div className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">
              {canExportFull
                ? "Tu rol permite exportación completa o enmascarada."
                : "Tu rol solo permite exportación enmascarada."}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={compactXlsx}
                onChange={(event) => setCompactXlsx(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#4aa59c]"
              />
              Excel: compactar en una sola hoja cuando sea posible
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={compactPdf}
                onChange={(event) => setCompactPdf(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#4aa59c]"
              />
              PDF: compactar secciones pequeñas en una página cuando sea posible
            </label>
          </div>

          {format === "pdf" && includesGeoSection ? (
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-slate-700">Capa del mapa geográfico</span>
                <select
                  value={geoLayerMode}
                  onChange={(event) => {
                    const next = event.target.value;
                    setGeoLayerMode(next === "map" || next === "bubbles" ? next : "both");
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="map">Mapa</option>
                  <option value="bubbles">Burbujas</option>
                  <option value="both">Ambos</option>
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-slate-700">Alcance del mapa</span>
                <select
                  value={geoScope}
                  onChange={(event) => {
                    const next = event.target.value;
                    setGeoScope(
                      next === "REGION" || next === "SUBREGION" || next === "COUNTRY" ? next : "WORLD"
                    );
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="WORLD">Mundo</option>
                  <option value="REGION">Región</option>
                  <option value="SUBREGION">Subregión</option>
                  <option value="COUNTRY">País seleccionado</option>
                </select>
              </label>

              {geoScope === "REGION" ? (
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold text-slate-700">Región</span>
                  <select
                    value={geoRegion}
                    onChange={(event) => {
                      const next = event.target.value;
                      const fallback = MAP_REGION_OPTIONS[0]?.key ?? "AMERICAS";
                      setGeoRegion(
                        MAP_REGION_OPTIONS.some((option) => option.key === next)
                          ? (next as MapRegionKey)
                          : fallback
                      );
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {MAP_REGION_OPTIONS.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : geoScope === "SUBREGION" ? (
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold text-slate-700">Subregión (América)</span>
                  <select
                    value={geoSubregion}
                    onChange={(event) => {
                      const next = event.target.value;
                      const fallback = AMERICAS_SUBREGION_OPTIONS[0]?.key ?? "CENTRAL_AMERICA";
                      setGeoSubregion(
                        AMERICAS_SUBREGION_OPTIONS.some((option) => option.key === next)
                          ? (next as AmericasSubregionKey)
                          : fallback
                      );
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {AMERICAS_SUBREGION_OPTIONS.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">
                  {geoScope === "COUNTRY"
                    ? "Usa el país actualmente seleccionado en filtros/cookie."
                    : "Se exportará la vista mundial completa."}
                </div>
              )}
            </div>
          ) : null}

          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-800">¿Qué quieres exportar?</p>
            <div className="grid gap-2 md:grid-cols-2">
              {CLIENTS_REPORT_PANEL_OPTIONS.map((option) => (
                <label key={option.key} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(option.key)}
                    onChange={() => toggleSection(option.key)}
                    className="h-4 w-4 rounded border-slate-300 text-[#4aa59c]"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              PDF permite hasta 5 secciones. Excel exporta múltiples secciones en hojas separadas.
            </p>
          </div>

          <div className="rounded-xl border border-[#dce7f5] bg-[#f8fbff] p-3">
            <p className="text-sm font-semibold text-[#2e75ba]">Vista previa</p>
            <p className="mt-1 text-sm text-slate-700">
              Exportará {selectedSections.length} {selectedSections.length === 1 ? "sección" : "secciones"} en formato{" "}
              {format.toUpperCase()} con filtros activos.
            </p>
            {hasSectionCounts ? (
              <p className="mt-1 text-xs text-slate-500">Filas estimadas para selección actual: {selectedRowsTotal}</p>
            ) : null}
            {selectedSectionLabels.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedSectionLabels.map((label) => (
                  <span key={label} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-rose-700">Selecciona al menos una sección.</p>
            )}
            {noDataForSelection ? (
              <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                Sin datos para filtros actuales.
              </div>
            ) : null}
            {csvWillZip ? (
              <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
                <p className="text-xs text-amber-800">
                  CSV multi-sección se descargará como ZIP (un CSV por sección).
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSections((current) => (current.length ? [current[0]] : current));
                    }}
                    className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 hover:border-amber-400"
                  >
                    Seleccionar solo 1 sección
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={runExport}
              disabled={!canRunExport}
              className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4aadf5] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {format === "pdf" ? <FileText size={15} /> : <FileSpreadsheet size={15} />}
              Descargar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
