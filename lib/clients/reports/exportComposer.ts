import type { ClientsReportFilters } from "@/lib/clients/reports.service";
import {
  resolveClientsReportsCsvDeliveryMode,
  type ClientsReportsCsvDeliveryMode,
  type ClientsReportsExportFormat
} from "@/lib/clients/reports/exportDelivery";
import type { ClientsReportPanelKey } from "@/lib/clients/reports/panels";

export type ReportExportSectionLike = {
  key: ClientsReportPanelKey;
  title: string;
  headers: string[];
  rows: string[][];
};

export type ReportsPdfLayoutMode = "compact_two_column" | "section_per_page";
export type ReportsXlsxLayoutMode = "summary_sheet" | "section_sheets";

export type ReportsExportSheet = {
  name: string;
  headers: string[];
  rows: string[][];
};

export type ReportsExportComposerInput<TSection extends ReportExportSectionLike> = {
  filters: ClientsReportFilters;
  selectedSections: ClientsReportPanelKey[];
  format: ClientsReportsExportFormat;
  masked: boolean;
  sections: TSection[];
  compact?: {
    pdf?: boolean;
    xlsx?: boolean;
  };
};

export type ReportsExportComposerResult<TSection extends ReportExportSectionLike> = {
  effectiveFilters: ClientsReportFilters;
  selectedSections: ClientsReportPanelKey[];
  format: ClientsReportsExportFormat;
  masked: boolean;
  hasData: boolean;
  nonEmptySections: TSection[];
  csvDeliveryMode: ClientsReportsCsvDeliveryMode;
  pdfLayoutMode: ReportsPdfLayoutMode;
  xlsxLayoutMode: ReportsXlsxLayoutMode;
  xlsxSheets: ReportsExportSheet[];
};

const PDF_COMPACT_MAX_SECTIONS = 3;
const PDF_COMPACT_MAX_ROWS_PER_SECTION = 12;
const XLSX_SUMMARY_MAX_SECTIONS = 3;
const XLSX_SUMMARY_MAX_ROWS_PER_SECTION = 20;
const NON_COMPACT_PDF_SECTION_KEYS = new Set<ClientsReportPanelKey>(["geo"]);
const NON_COMPACT_XLSX_SECTION_KEYS = new Set<ClientsReportPanelKey>(["geo"]);

function isSectionSmall(section: ReportExportSectionLike, maxRows: number) {
  return section.rows.length <= maxRows && section.headers.length <= 8;
}

function shouldUseCompactPdf(sections: ReportExportSectionLike[]) {
  if (sections.length === 0 || sections.length > PDF_COMPACT_MAX_SECTIONS) return false;
  if (sections.some((section) => NON_COMPACT_PDF_SECTION_KEYS.has(section.key))) return false;
  return sections.every((section) => isSectionSmall(section, PDF_COMPACT_MAX_ROWS_PER_SECTION));
}

function shouldUseSummaryXlsx(sections: ReportExportSectionLike[]) {
  if (sections.length === 0 || sections.length > XLSX_SUMMARY_MAX_SECTIONS) return false;
  if (sections.some((section) => NON_COMPACT_XLSX_SECTION_KEYS.has(section.key))) return false;
  return sections.every((section) => isSectionSmall(section, XLSX_SUMMARY_MAX_ROWS_PER_SECTION));
}

function sanitizeSheetName(title: string, index: number) {
  const prefix = `${index + 1}-`;
  const maxTitleLength = Math.max(1, 31 - prefix.length);
  return `${prefix}${title.slice(0, maxTitleLength)}`;
}

function padTo(values: string[], length: number) {
  if (values.length >= length) return values.slice(0, length);
  return [...values, ...Array.from({ length: length - values.length }, () => "")];
}

function buildSummarySheet(sections: ReportExportSectionLike[]): ReportsExportSheet {
  const maxColumnCount = Math.max(
    1,
    ...sections.map((section) => Math.max(section.headers.length, ...section.rows.map((row) => row.length)))
  );
  const headers = ["Sección", ...Array.from({ length: maxColumnCount }, (_, index) => `Columna ${index + 1}`)];
  const rows: string[][] = [];

  for (const section of sections) {
    rows.push([section.title, ...Array.from({ length: maxColumnCount }, () => "")]);
    rows.push(["Encabezados", ...padTo(section.headers, maxColumnCount)]);

    if (section.rows.length === 0) {
      rows.push(["Sin datos", ...Array.from({ length: maxColumnCount }, () => "")]);
    } else {
      for (const row of section.rows) {
        rows.push(["", ...padTo(row, maxColumnCount)]);
      }
    }

    rows.push(Array.from({ length: maxColumnCount + 1 }, () => ""));
  }

  return {
    name: "Resumen",
    headers,
    rows
  };
}

function buildXlsxSheets(sections: ReportExportSectionLike[], layoutMode: ReportsXlsxLayoutMode): ReportsExportSheet[] {
  if (layoutMode === "summary_sheet") {
    return [buildSummarySheet(sections)];
  }

  return sections.map((section, index) => ({
    name: sanitizeSheetName(section.title, index),
    headers: section.headers,
    rows: section.rows
  }));
}

export function composeClientsReportsExportPlan<TSection extends ReportExportSectionLike>(
  input: ReportsExportComposerInput<TSection>
): ReportsExportComposerResult<TSection> {
  const compactPdfEnabled = input.compact?.pdf !== false;
  const compactXlsxEnabled = input.compact?.xlsx !== false;
  const nonEmptySections = input.sections.filter((section) => section.rows.length > 0);
  const hasData = nonEmptySections.length > 0;
  const pdfLayoutMode: ReportsPdfLayoutMode = compactPdfEnabled && shouldUseCompactPdf(nonEmptySections)
    ? "compact_two_column"
    : "section_per_page";
  const xlsxLayoutMode: ReportsXlsxLayoutMode = compactXlsxEnabled && shouldUseSummaryXlsx(nonEmptySections)
    ? "summary_sheet"
    : "section_sheets";

  return {
    effectiveFilters: input.filters,
    selectedSections: input.selectedSections,
    format: input.format,
    masked: input.masked,
    hasData,
    nonEmptySections,
    csvDeliveryMode: resolveClientsReportsCsvDeliveryMode({
      format: input.format,
      sectionsCount: nonEmptySections.length
    }),
    pdfLayoutMode,
    xlsxLayoutMode,
    xlsxSheets: buildXlsxSheets(nonEmptySections, xlsxLayoutMode)
  };
}
