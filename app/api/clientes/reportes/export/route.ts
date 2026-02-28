import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { ClientProfileType } from "@prisma/client";
import { geoMercator, geoPath } from "d3-geo";
import JSZip from "jszip";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import { feature } from "topojson-client";
import { requireAuth } from "@/lib/auth";
import { formatDateForClients } from "@/lib/clients/dateFormat";
import { getClientsDateFormat } from "@/lib/clients/dateFormatConfig";
import { getCountryCentroid } from "@/lib/clients/reports/countryCentroids";
import { type ClientsReportsExportFormat } from "@/lib/clients/reports/exportDelivery";
import {
  buildClientsReportExportMatrix,
  resolveClientsReportExportColumns
} from "@/lib/clients/reports/exportColumns";
import {
  composeClientsReportsExportPlan,
  type ReportsPdfLayoutMode
} from "@/lib/clients/reports/exportComposer";
import {
  AMERICAS_SUBREGION_OPTIONS,
  MAP_REGION_OPTIONS,
  buildAllowedIso2Set,
  resolveIso2FromMapCountryName,
  type AmericasSubregionKey,
  type MapRegionKey
} from "@/lib/clients/reports/countryRegions";
import {
  CLIENTS_REPORT_PANEL_OPTIONS,
  type ClientsReportPanelKey
} from "@/lib/clients/reports/panels";
import {
  canViewClientsReports,
  resolveClientsReportsExportScope
} from "@/lib/clients/reports/permissions";
import { buildClientsReportFiltersFromRequest } from "@/lib/clients/reports/requestFilters";
import { recordClientsAccessBlocked } from "@/lib/clients/securityEvents";
import {
  getClientsReportBirthdays,
  getClientsReportRowsForExport,
  getClientsReportSummary,
  type ClientsReportFilters
} from "@/lib/clients/reports.service";
import { exportExcelViaProcessingService } from "@/lib/processing-service/excel";
import { tenantIdFromUser } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORT_MAX_ROWS = 50_000;
const MAX_PDF_SECTIONS = 5;
const MAX_PDF_ROWS_PER_SECTION = 400;
const PDF_LETTER_WIDTH = 792;
const PDF_LETTER_HEIGHT = 612;
const GEO_MAP_WIDTH = 470;
const GEO_MAP_HEIGHT = 312;
const WORLD_TOPOJSON_PATH = path.join(process.cwd(), "public/maps/world-countries-50m.topo.json");
const DEFAULT_SECTIONS: ClientsReportPanelKey[] = ["clients_list"];
const SUMMARY_SECTION_KEYS = new Set<ClientsReportPanelKey>([
  "by_type",
  "top_channels",
  "insurers_by_line",
  "geo",
  "top_referrers"
]);

type GeoLayerMode = "map" | "bubbles" | "both";
type GeoScopeMode = "WORLD" | "REGION" | "SUBREGION" | "COUNTRY";

type GeoCountryRow = {
  label: string;
  source: "catalog" | "manual";
  total: number;
  countryId: string | null;
  countryIso2: string | null;
};

type GeoPdfListRow = {
  label: string;
  total: number;
  iso2?: string | null;
  source?: "catalog" | "manual";
};

type GeoPdfData = {
  mapPng: Uint8Array;
  layerMode: GeoLayerMode;
  selectedCountryLabel: string;
  selectedCountryIso2: string | null;
  filtersLine: string;
  topCountries: GeoPdfListRow[];
  topAdmin1: GeoPdfListRow[];
  topAdmin2: GeoPdfListRow[];
};

type ExportSectionData = {
  key: ClientsReportPanelKey;
  title: string;
  headers: string[];
  rows: string[][];
  geoPdf?: GeoPdfData;
};

export function createNoDataExportResponse() {
  return NextResponse.json({ ok: false, error: "Sin datos para filtros actuales" }, { status: 422 });
}

function normalizeMonth(value: string | null) {
  const parsed = Number(value || "");
  if (!Number.isFinite(parsed)) return null;
  return parsed >= 1 && parsed <= 12 ? parsed : null;
}

function normalizeNextDays(value: string | null) {
  const parsed = Number(value || "");
  if (!Number.isFinite(parsed)) return null;
  return parsed >= 1 && parsed <= 90 ? parsed : null;
}

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function toTypeLabel(type: ClientProfileType) {
  switch (type) {
    case ClientProfileType.PERSON:
      return "Persona";
    case ClientProfileType.COMPANY:
      return "Empresa";
    case ClientProfileType.INSTITUTION:
      return "Institución";
    case ClientProfileType.INSURER:
      return "Aseguradora";
    default:
      return type;
  }
}

function maskEmail(email: string | null) {
  if (!email) return "";
  const [localPart, domainPart] = email.split("@");
  if (!localPart || !domainPart) return "***";
  const visible = localPart.slice(0, 2);
  return `${visible}***@${domainPart}`;
}

function maskPhone(phone: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/\D+/g, "");
  if (!digits) return "***";
  if (digits.length <= 4) return "***";
  return `${"*".repeat(Math.max(3, digits.length - 4))}${digits.slice(-4)}`;
}

function normalizeSections(raw: string | null): ClientsReportPanelKey[] {
  const valid = new Set<ClientsReportPanelKey>(CLIENTS_REPORT_PANEL_OPTIONS.map((item) => item.key));
  const requested = String(raw || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value): value is ClientsReportPanelKey => valid.has(value as ClientsReportPanelKey));

  if (requested.length === 0) return DEFAULT_SECTIONS;

  const dedup = new Set<ClientsReportPanelKey>();
  for (const item of requested) dedup.add(item);
  return Array.from(dedup);
}

function normalizeIso2(value: string | null | undefined) {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized.length === 2 ? normalized : null;
}

function normalizeGeoLayer(value: string | null): GeoLayerMode {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "map" || normalized === "bubbles") return normalized;
  return "both";
}

function normalizeGeoScope(value: string | null): GeoScopeMode {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "REGION" || normalized === "SUBREGION" || normalized === "COUNTRY") {
    return normalized;
  }
  return "WORLD";
}

function normalizeCompactFlag(value: string | null) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized !== "0" && normalized !== "false" && normalized !== "off";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseCsvValues(raw: string | null) {
  return String(raw || "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
}

function resolveSelectedRegions(raw: string | null) {
  const options = new Set<MapRegionKey>(MAP_REGION_OPTIONS.map((option) => option.key));
  const selected = parseCsvValues(raw).filter((value): value is MapRegionKey => options.has(value as MapRegionKey));
  return new Set<MapRegionKey>(selected.length ? selected : MAP_REGION_OPTIONS.map((option) => option.key));
}

function resolveSingleRegion(raw: string | null): MapRegionKey {
  const normalized = String(raw || "").trim().toUpperCase();
  if (MAP_REGION_OPTIONS.some((option) => option.key === normalized)) {
    return normalized as MapRegionKey;
  }
  return MAP_REGION_OPTIONS[0]?.key ?? "AMERICAS";
}

function resolveSelectedAmericasSubregions(raw: string | null) {
  const options = new Set<AmericasSubregionKey>(AMERICAS_SUBREGION_OPTIONS.map((option) => option.key));
  const selected = parseCsvValues(raw).filter(
    (value): value is AmericasSubregionKey => options.has(value as AmericasSubregionKey)
  );
  return new Set<AmericasSubregionKey>(
    selected.length ? selected : AMERICAS_SUBREGION_OPTIONS.map((option) => option.key)
  );
}

function resolveSingleAmericasSubregion(raw: string | null): AmericasSubregionKey {
  const normalized = String(raw || "").trim().toUpperCase();
  if (AMERICAS_SUBREGION_OPTIONS.some((option) => option.key === normalized)) {
    return normalized as AmericasSubregionKey;
  }
  return AMERICAS_SUBREGION_OPTIONS[0]?.key ?? "CENTRAL_AMERICA";
}

function intersectIso2Sets(a: Set<string> | null, b: Set<string> | null) {
  if (!a && !b) return null;
  if (!a) return b ? new Set(b) : null;
  if (!b) return new Set(a);
  const next = new Set<string>();
  for (const item of a) {
    if (b.has(item)) next.add(item);
  }
  return next;
}

function resolveFeatureIso2(geo: { id?: string | number; properties?: Record<string, unknown> }) {
  const props = geo.properties ?? {};
  const fromIso =
    normalizeIso2(String(props.ISO_A2 ?? ""))
    || normalizeIso2(String(props.iso_a2 ?? ""))
    || normalizeIso2(String(props.ISO2 ?? ""))
    || normalizeIso2(String(props.iso2 ?? ""));
  if (fromIso) return fromIso;

  const fromId = normalizeIso2(String(geo.id ?? ""));
  if (fromId) return fromId;

  const fromName = resolveIso2FromMapCountryName(String(props.name ?? props.NAME ?? ""));
  if (fromName) return fromName;

  return null;
}

function buildCountryFillColor(total: number, peak: number) {
  if (!total || !peak) return "#eef2ff";
  const ratio = clamp(total / peak, 0, 1);
  const start = { r: 173, g: 216, b: 245 };
  const end = { r: 46, g: 117, b: 186 };
  const r = Math.round(start.r + (end.r - start.r) * ratio);
  const g = Math.round(start.g + (end.g - start.g) * ratio);
  const b = Math.round(start.b + (end.b - start.b) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

async function renderGeoMapToPng(params: {
  countries: GeoCountryRow[];
  layerMode: GeoLayerMode;
  selectedCountryIso2: string | null;
  allowedIso2Set: Set<string> | null;
  fitIso2Set: Set<string> | null;
}) {
  const topoRaw = await readFile(WORLD_TOPOJSON_PATH, "utf8");
  const topology = JSON.parse(topoRaw) as {
    objects?: Record<string, unknown>;
  };
  const countriesObject = topology.objects?.countries;
  if (!countriesObject) {
    throw new Error("No se encontró geometría de países para export PDF.");
  }

  const featuresCollection = feature(
    topology as Parameters<typeof feature>[0],
    countriesObject as Parameters<typeof feature>[1]
  ) as {
    type: "FeatureCollection";
    features: Array<{ id?: string | number; properties?: Record<string, unknown> }>;
  };

  const featuresForFit = params.fitIso2Set
    ? featuresCollection.features.filter((geo) => {
        const iso2 = resolveFeatureIso2(geo);
        return Boolean(iso2 && params.fitIso2Set?.has(iso2));
      })
    : featuresCollection.features;

  const fitObject =
    featuresForFit.length > 0
      ? ({
          type: "FeatureCollection",
          features: featuresForFit
        } as const)
      : featuresCollection;

  const projection = geoMercator();
  projection.fitExtent(
    [
      [14, 14],
      [GEO_MAP_WIDTH - 14, GEO_MAP_HEIGHT - 18]
    ],
    fitObject as Parameters<typeof projection.fitExtent>[1]
  );
  const pathBuilder = geoPath(projection);

  const peak = params.countries.reduce((max, row) => Math.max(max, row.total), 0);
  const byIso2 = new Map<string, GeoCountryRow>();
  for (const row of params.countries) {
    const iso2 = normalizeIso2(row.countryIso2);
    if (!iso2 || byIso2.has(iso2)) continue;
    byIso2.set(iso2, row);
  }

  const showChoropleth = params.layerMode === "map" || params.layerMode === "both";
  const showBubbles = params.layerMode === "bubbles" || params.layerMode === "both";
  const mapPaths: string[] = [];

  for (const geo of featuresCollection.features) {
    const path = pathBuilder(geo as Parameters<typeof pathBuilder>[0]);
    if (!path) continue;
    const iso2 = resolveFeatureIso2(geo);
    const row = iso2 ? byIso2.get(iso2) ?? null : null;
    const allowedByRegion = !params.allowedIso2Set || Boolean(iso2 && params.allowedIso2Set.has(iso2));
    const selected = Boolean(params.selectedCountryIso2 && iso2 && params.selectedCountryIso2 === iso2);
    const fill = selected
      ? "rgba(74, 165, 156, 0.62)"
      : showChoropleth && allowedByRegion
        ? buildCountryFillColor(row?.total ?? 0, peak)
        : "#f8fafc";
    const stroke = selected ? "#2e75ba" : "#e2e8f0";
    const strokeWidth = selected ? 1.15 : 0.55;
    const opacity = allowedByRegion ? 1 : 0.32;
    mapPaths.push(
      `<path d="${path}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />`
    );
  }

  const visibleCountries = params.countries.filter((row) => {
    const iso2 = normalizeIso2(row.countryIso2);
    if (!params.allowedIso2Set) return true;
    return Boolean(iso2 && params.allowedIso2Set.has(iso2));
  });
  const bubblePeak = visibleCountries.reduce((max, row) => Math.max(max, row.total), 0);
  const bubbleNodes: string[] = [];

  if (showBubbles && bubblePeak > 0) {
    for (const row of visibleCountries) {
      const iso2 = normalizeIso2(row.countryIso2);
      if (!iso2 || row.total <= 0) continue;
      const centroid = getCountryCentroid(iso2);
      if (!centroid) continue;
      const projected = projection([centroid.lng, centroid.lat]);
      if (!projected) continue;
      const ratio = Math.sqrt(row.total / bubblePeak);
      const radius = Math.round(clamp(5 + ratio * 18, 5, 24) * 10) / 10;
      const selected = Boolean(params.selectedCountryIso2 && iso2 === params.selectedCountryIso2);
      bubbleNodes.push(
        `<circle cx="${projected[0]}" cy="${projected[1]}" r="${radius}" fill="${selected ? "rgba(74, 165, 156, 0.7)" : "rgba(46, 117, 186, 0.55)"}" stroke="${selected ? "#2e75ba" : "#4aadf5"}" stroke-width="${selected ? "0.95" : "0.75"}" />`
      );
    }
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${GEO_MAP_WIDTH}" height="${GEO_MAP_HEIGHT}" viewBox="0 0 ${GEO_MAP_WIDTH} ${GEO_MAP_HEIGHT}">
  <rect x="0" y="0" width="${GEO_MAP_WIDTH}" height="${GEO_MAP_HEIGHT}" fill="#f8fbff" />
  ${mapPaths.join("\n")}
  ${bubbleNodes.join("\n")}
</svg>`;

  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  return new Uint8Array(png);
}

async function renderGeoFallbackPng() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${GEO_MAP_WIDTH}" height="${GEO_MAP_HEIGHT}" viewBox="0 0 ${GEO_MAP_WIDTH} ${GEO_MAP_HEIGHT}">
  <rect x="0" y="0" width="${GEO_MAP_WIDTH}" height="${GEO_MAP_HEIGHT}" fill="#f8fbff" />
  <rect x="12" y="12" width="${GEO_MAP_WIDTH - 24}" height="${GEO_MAP_HEIGHT - 24}" fill="#ffffff" stroke="#dce7f5" stroke-width="1" />
  <text x="${GEO_MAP_WIDTH / 2}" y="${GEO_MAP_HEIGHT / 2}" text-anchor="middle" fill="#64748b" font-size="13" font-family="Helvetica">Mapa no disponible para este export</text>
</svg>`;
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  return new Uint8Array(png);
}

function buildGeoFiltersLine(params: {
  filters: ClientsReportFilters;
  dateFormat: Awaited<ReturnType<typeof getClientsDateFormat>>;
  countryLabel: string;
  layerMode: GeoLayerMode;
  scopeMode: GeoScopeMode;
  scopeRegion?: MapRegionKey;
  scopeSubregion?: AmericasSubregionKey;
}) {
  const tokens: string[] = [`País: ${params.countryLabel}`];
  if (params.filters.from || params.filters.to) {
    const fromLabel = params.filters.from ? formatDateForClients(params.filters.from, params.dateFormat) : "Inicio";
    const toLabel = params.filters.to ? formatDateForClients(params.filters.to, params.dateFormat) : "Hoy";
    tokens.push(`Rango: ${fromLabel} - ${toLabel}`);
  } else {
    tokens.push("Rango: Últimos 30 días");
  }
  const layerLabel =
    params.layerMode === "map" ? "Mapa" : params.layerMode === "bubbles" ? "Burbujas" : "Mapa + burbujas";
  tokens.push(`Capa: ${layerLabel}`);
  const scopeLabel =
    params.scopeMode === "WORLD"
      ? "Mundo"
      : params.scopeMode === "REGION"
        ? `Región (${params.scopeRegion || "AMERICAS"})`
        : params.scopeMode === "SUBREGION"
          ? `Subregión (${params.scopeSubregion || "CENTRAL_AMERICA"})`
          : "País seleccionado";
  tokens.push(`Alcance: ${scopeLabel}`);
  return tokens.join(" · ");
}

function toCsvSection(section: ExportSectionData) {
  const lines = [section.headers.map(escapeCsv).join(",")];
  for (const row of section.rows) {
    lines.push(row.map(escapeCsv).join(","));
  }
  return lines.join("\n");
}

function compactCell(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
}

function drawGeoPdfList(params: {
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  x: number;
  y: number;
  width: number;
  title: string;
  rows: GeoPdfListRow[];
}) {
  const { page, font, fontBold, x, width } = params;
  let y = params.y;
  page.drawText(params.title, {
    x,
    y,
    size: 9,
    font: fontBold,
    color: rgb(0.18, 0.46, 0.73)
  });
  y -= 12;

  const listRows = params.rows.slice(0, 10);
  if (listRows.length === 0) {
    page.drawText("Sin datos.", { x, y, size: 8, font, color: rgb(0.43, 0.47, 0.53) });
    return y - 14;
  }

  for (let index = 0; index < listRows.length; index += 1) {
    const row = listRows[index];
    const labelSuffix = row.iso2 ? ` (${row.iso2})` : "";
    const label = compactCell(`${index + 1}. ${row.label}${labelSuffix}`, 34);
    const totalText = String(row.total);
    const totalWidth = fontBold.widthOfTextAtSize(totalText, 8);
    page.drawText(label, { x, y, size: 8, font });
    page.drawText(totalText, { x: x + width - totalWidth, y, size: 8, font: fontBold });
    y -= 10;
  }

  return y - 6;
}

async function buildPdf(params: {
  sections: ExportSectionData[];
  generatedAt: Date;
  masked: boolean;
  layoutMode: ReportsPdfLayoutMode;
}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const marginX = 26;
  const marginY = 22;
  const maxVisibleColumns = 8;
  const rowsPerPage = 33;

  if (params.layoutMode === "compact_two_column") {
    const page = doc.addPage([PDF_LETTER_WIDTH, PDF_LETTER_HEIGHT]);
    let topY = PDF_LETTER_HEIGHT - marginY;
    page.drawText("Reporte clientes (vista compacta)", {
      x: marginX,
      y: topY,
      size: 14,
      font: fontBold,
      color: rgb(0.18, 0.46, 0.73)
    });
    topY -= 14;
    page.drawText(`Generado: ${params.generatedAt.toLocaleString()} · Modo: ${params.masked ? "Enmascarado" : "Completo"}`, {
      x: marginX,
      y: topY,
      size: 8.5,
      font
    });
    topY -= 18;

    const cardGapX = 12;
    const cardGapY = 12;
    const cardWidth = (PDF_LETTER_WIDTH - marginX * 2 - cardGapX) / 2;
    const cardHeight = 170;
    const maxRowsInCard = 10;

    for (let index = 0; index < params.sections.length; index += 1) {
      const section = params.sections[index];
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = marginX + col * (cardWidth + cardGapX);
      const yTop = topY - row * (cardHeight + cardGapY);
      const yBottom = yTop - cardHeight;
      page.drawRectangle({
        x,
        y: yBottom,
        width: cardWidth,
        height: cardHeight,
        borderWidth: 1,
        borderColor: rgb(0.86, 0.91, 0.96),
        color: rgb(0.98, 0.99, 1)
      });

      let yCursor = yTop - 14;
      page.drawText(compactCell(section.title, 42), {
        x: x + 10,
        y: yCursor,
        size: 10,
        font: fontBold,
        color: rgb(0.18, 0.46, 0.73)
      });
      yCursor -= 12;
      page.drawText(`Filas: ${section.rows.length}`, {
        x: x + 10,
        y: yCursor,
        size: 8,
        font,
        color: rgb(0.39, 0.44, 0.52)
      });
      yCursor -= 10;

      const headerLine = section.headers.slice(0, maxVisibleColumns).map((item) => compactCell(item, 14)).join(" | ");
      page.drawText(compactCell(headerLine, 74), {
        x: x + 10,
        y: yCursor,
        size: 7.5,
        font: fontBold
      });
      yCursor -= 9;

      for (let rowIndex = 0; rowIndex < Math.min(section.rows.length, maxRowsInCard); rowIndex += 1) {
        const rowValues = section.rows[rowIndex].slice(0, maxVisibleColumns).map((item) => compactCell(item, 14)).join(" | ");
        page.drawText(compactCell(rowValues, 74), {
          x: x + 10,
          y: yCursor,
          size: 7,
          font
        });
        yCursor -= 8;
        if (yCursor <= yBottom + 8) break;
      }
    }

    return doc.save();
  }

  for (const section of params.sections) {
    if (section.key === "geo" && section.geoPdf) {
      const page = doc.addPage([PDF_LETTER_WIDTH, PDF_LETTER_HEIGHT]);
      let y = PDF_LETTER_HEIGHT - marginY;

      page.drawText(section.title, {
        x: marginX,
        y,
        size: 14,
        font: fontBold,
        color: rgb(0.18, 0.46, 0.73)
      });
      y -= 16;
      page.drawText(`Generado: ${params.generatedAt.toLocaleString()}`, { x: marginX, y, size: 9, font });
      y -= 12;
      page.drawText(`Modo: ${params.masked ? "Enmascarado" : "Completo"} · Filas: ${section.rows.length}`, {
        x: marginX,
        y,
        size: 9,
        font
      });
      y -= 12;
      page.drawText(compactCell(section.geoPdf.filtersLine, 120), {
        x: marginX,
        y,
        size: 8,
        font
      });
      y -= 16;

      const mapImage = await doc.embedPng(section.geoPdf.mapPng);
      const mapX = marginX;
      const mapY = y - GEO_MAP_HEIGHT;
      page.drawImage(mapImage, {
        x: mapX,
        y: mapY,
        width: GEO_MAP_WIDTH,
        height: GEO_MAP_HEIGHT
      });

      const sideX = mapX + GEO_MAP_WIDTH + 16;
      const sideWidth = PDF_LETTER_WIDTH - sideX - marginX;
      let sideY = y;
      page.drawText("Detalle geográfico", {
        x: sideX,
        y: sideY,
        size: 10,
        font: fontBold,
        color: rgb(0.18, 0.46, 0.73)
      });
      sideY -= 12;
      const selectedCountry = section.geoPdf.selectedCountryIso2
        ? `${section.geoPdf.selectedCountryLabel} (${section.geoPdf.selectedCountryIso2})`
        : section.geoPdf.selectedCountryLabel;
      page.drawText(`País seleccionado: ${compactCell(selectedCountry, 34)}`, {
        x: sideX,
        y: sideY,
        size: 8.5,
        font
      });
      sideY -= 14;

      sideY = drawGeoPdfList({
        page,
        font,
        fontBold,
        x: sideX,
        y: sideY,
        width: sideWidth,
        title: "Top países",
        rows: section.geoPdf.topCountries
      });
      sideY = drawGeoPdfList({
        page,
        font,
        fontBold,
        x: sideX,
        y: sideY,
        width: sideWidth,
        title: "Top admin1",
        rows: section.geoPdf.topAdmin1
      });
      drawGeoPdfList({
        page,
        font,
        fontBold,
        x: sideX,
        y: sideY,
        width: sideWidth,
        title: "Top admin2",
        rows: section.geoPdf.topAdmin2
      });

      continue;
    }

    const headers = section.headers.slice(0, maxVisibleColumns);
    const rows = section.rows.slice(0, MAX_PDF_ROWS_PER_SECTION).map((row) => row.slice(0, maxVisibleColumns));
    const chunks = rows.length ? Math.ceil(rows.length / rowsPerPage) : 1;

    for (let chunk = 0; chunk < chunks; chunk += 1) {
      const page = doc.addPage([PDF_LETTER_WIDTH, PDF_LETTER_HEIGHT]);
      let y = PDF_LETTER_HEIGHT - marginY;
      const chunkLabel = chunks > 1 ? ` (${chunk + 1}/${chunks})` : "";
      page.drawText(`${section.title}${chunkLabel}`, {
        x: marginX,
        y,
        size: 13,
        font: fontBold,
        color: rgb(0.18, 0.46, 0.73)
      });
      y -= 16;

      if (chunk === 0) {
        page.drawText(`Generado: ${params.generatedAt.toLocaleString()}`, { x: marginX, y, size: 9, font });
        y -= 12;
        page.drawText(`Modo: ${params.masked ? "Enmascarado" : "Completo"} · Filas: ${section.rows.length}`, {
          x: marginX,
          y,
          size: 9,
          font
        });
        y -= 14;
      } else {
        y -= 4;
      }

      const compactLine = (values: string[]) => values.map((value) => compactCell(value, 22)).join(" | ");
      page.drawText(compactLine(headers), {
        x: marginX,
        y,
        size: 8,
        font: fontBold
      });
      y -= 10;

      const start = chunk * rowsPerPage;
      const end = Math.min(start + rowsPerPage, rows.length);
      for (let i = start; i < end; i += 1) {
        page.drawText(compactLine(rows[i] || []), { x: marginX, y, size: 7.5, font });
        y -= 10;
        if (y <= marginY) break;
      }

      if (rows.length < section.rows.length && chunk + 1 === chunks) {
        page.drawText(`Nota: PDF truncado a ${MAX_PDF_ROWS_PER_SECTION} filas por sección.`, {
          x: marginX,
          y: marginY + 4,
          size: 8,
          font
        });
      }
    }
  }

  return doc.save();
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!canViewClientsReports(auth.user)) {
    await recordClientsAccessBlocked({
      user: auth.user,
      route: "/api/clientes/reportes/export",
      capability: "CLIENTS_REPORTS_VIEW",
      resourceType: "reports"
    });
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  const exportScope = resolveClientsReportsExportScope(auth.user);
  if (exportScope === "none") {
    await recordClientsAccessBlocked({
      user: auth.user,
      route: "/api/clientes/reportes/export",
      capability: "CLIENTS_REPORTS_EXPORT",
      resourceType: "reports"
    });
    return NextResponse.json({ ok: false, error: "No autorizado para exportar reportes." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const formatRaw = (searchParams.get("format") || "csv").toLowerCase();
    const format: ClientsReportsExportFormat =
      formatRaw === "xlsx" || formatRaw === "pdf" || formatRaw === "csv" ? formatRaw : "csv";
    const requestedMask = searchParams.get("mask") === "1";
    const masked = exportScope === "full" ? requestedMask : true;
    const sections = normalizeSections(searchParams.get("sections"));
    const tenantId = tenantIdFromUser(auth.user);
    const dateFormat = await getClientsDateFormat(tenantId);
    const filters = buildClientsReportFiltersFromRequest(req, dateFormat, tenantId, {
      withPagination: false,
      forcePage: 1,
      forcePageSize: 1_000
    });
    const geoLayerMode = normalizeGeoLayer(searchParams.get("geoLayer"));
    const geoScope = normalizeGeoScope(searchParams.get("geoScope"));
    const geoScopeRegion = resolveSingleRegion(searchParams.get("geoRegion"));
    const geoScopeSubregion = resolveSingleAmericasSubregion(searchParams.get("geoSubregion"));
    const compactPdf = normalizeCompactFlag(searchParams.get("compactPdf"));
    const compactXlsx = normalizeCompactFlag(searchParams.get("compactXlsx"));
    const selectedRegions = resolveSelectedRegions(searchParams.get("geoRegions"));
    const selectedAmericasSubregions = resolveSelectedAmericasSubregions(searchParams.get("geoSubregions"));
    const allowedIso2Set = buildAllowedIso2Set({
      selectedRegions,
      selectedAmericasSubregions
    });

    const needsSummary = sections.some((section) => SUMMARY_SECTION_KEYS.has(section));
    const needsClientsList = sections.includes("clients_list");
    const needsBirthdays = sections.includes("birthdays");

    const selectedColumns = resolveClientsReportExportColumns({
      columns: searchParams.get("columns"),
      groups: searchParams.get("groups")
    });

    const [summary, clientsRows, birthdays] = await Promise.all([
      needsSummary ? getClientsReportSummary(filters) : Promise.resolve(null),
      needsClientsList
        ? getClientsReportRowsForExport(filters, {
            batchSize: 1_000,
            maxRows: EXPORT_MAX_ROWS
          })
        : Promise.resolve(null),
      needsBirthdays
        ? getClientsReportBirthdays({
            tenantId,
            countryId: filters.countryId,
            q: filters.q,
            type: filters.type,
            month: normalizeMonth(searchParams.get("birthMonth")),
            nextDays: normalizeNextDays(searchParams.get("birthNextDays")),
            limit: 5_000
          })
        : Promise.resolve(null)
    ]);

    if (clientsRows?.truncated) {
      return NextResponse.json(
        {
          ok: false,
          error: `El export excede el máximo de ${clientsRows.maxRows} filas. Ajusta filtros o rango de fechas.`
        },
        { status: 422 }
      );
    }

    const exportSections: ExportSectionData[] = [];

    for (const section of sections) {
      if (section === "by_type" && summary) {
        exportSections.push({
          key: section,
          title: "Clientes por tipo",
          headers: ["Tipo", "Total"],
          rows: summary.byType.map((row) => [toTypeLabel(row.type), String(row.total)])
        });
        continue;
      }

      if (section === "top_channels" && summary) {
        exportSections.push({
          key: section,
          title: "Top canales",
          headers: ["Canal", "Total"],
          rows: summary.bySource.map((row) => [row.sourceName, String(row.total)])
        });
        continue;
      }

      if (section === "insurers_by_line" && summary) {
        exportSections.push({
          key: section,
          title: "Aseguradoras por ramo",
          headers: ["Ramo", "Total"],
          rows: summary.insurersByLine.map((row) => [row.line, String(row.total)])
        });
        continue;
      }

      if (section === "geo" && summary) {
        const selectedCountryId = filters.countryId ?? null;
        const selectedCountry = selectedCountryId
          ? summary.byGeo.countries.find((row) => row.countryId === selectedCountryId) ?? null
          : null;
        const selectedCountryLabel = selectedCountry?.label ?? "Todos los países";
        const selectedCountryIso2 = normalizeIso2(selectedCountry?.countryIso2);
        const allAmericasSubregions = new Set<AmericasSubregionKey>(
          AMERICAS_SUBREGION_OPTIONS.map((option) => option.key)
        );

        let scopeIso2Set: Set<string> | null = null;
        if (geoScope === "REGION") {
          scopeIso2Set = buildAllowedIso2Set({
            selectedRegions: new Set<MapRegionKey>([geoScopeRegion]),
            selectedAmericasSubregions: allAmericasSubregions
          });
        } else if (geoScope === "SUBREGION") {
          scopeIso2Set = buildAllowedIso2Set({
            selectedRegions: new Set<MapRegionKey>(["AMERICAS"]),
            selectedAmericasSubregions: new Set<AmericasSubregionKey>([geoScopeSubregion])
          });
        } else if (geoScope === "COUNTRY" && selectedCountryIso2) {
          scopeIso2Set = new Set([selectedCountryIso2]);
        }

        const mapAllowedIso2Set = intersectIso2Sets(allowedIso2Set, scopeIso2Set);
        const fitIso2Set = scopeIso2Set ?? mapAllowedIso2Set;
        const scopedCountries = mapAllowedIso2Set
          ? summary.byGeo.countries.filter((row) => {
              const iso2 = normalizeIso2(row.countryIso2);
              return Boolean(iso2 && mapAllowedIso2Set.has(iso2));
            })
          : summary.byGeo.countries;

        let mapPng: Uint8Array;
        try {
          mapPng = await renderGeoMapToPng({
            countries: summary.byGeo.countries as GeoCountryRow[],
            layerMode: geoLayerMode,
            selectedCountryIso2,
            allowedIso2Set: mapAllowedIso2Set,
            fitIso2Set
          });
        } catch {
          mapPng = await renderGeoFallbackPng();
        }

        exportSections.push({
          key: section,
          title: "Mapa y detalle geográfico",
          headers: ["Nivel", "Etiqueta", "ISO2", "Origen", "Total"],
          rows: [
            ...summary.byGeo.countries.map((row) => [
              "País",
              row.label,
              normalizeIso2(row.countryIso2) || "",
              row.source,
              String(row.total)
            ]),
            ...summary.byGeo.admin1.map((row) => ["Admin1", row.label, "", row.source, String(row.total)]),
            ...summary.byGeo.admin2.map((row) => ["Admin2", row.label, "", row.source, String(row.total)])
          ],
          geoPdf: {
            mapPng,
            layerMode: geoLayerMode,
            selectedCountryLabel,
            selectedCountryIso2,
            filtersLine: buildGeoFiltersLine({
              filters,
              dateFormat,
              countryLabel: selectedCountryLabel,
              layerMode: geoLayerMode,
              scopeMode: geoScope,
              scopeRegion: geoScopeRegion,
              scopeSubregion: geoScopeSubregion
            }),
            topCountries: scopedCountries.slice(0, 10).map((row) => ({
              label: row.label,
              total: row.total,
              iso2: normalizeIso2(row.countryIso2),
              source: row.source
            })),
            topAdmin1: summary.byGeo.admin1.slice(0, 10).map((row) => ({
              label: row.label,
              total: row.total,
              source: row.source
            })),
            topAdmin2: summary.byGeo.admin2.slice(0, 10).map((row) => ({
              label: row.label,
              total: row.total,
              source: row.source
            }))
          }
        });
        continue;
      }

      if (section === "top_referrers" && summary) {
        exportSections.push({
          key: section,
          title: "Top referidores",
          headers: ["Referidor", "Total"],
          rows: summary.referrals.topReferrers.map((row) => [row.referrerLabel, String(row.total)])
        });
        continue;
      }

      if (section === "birthdays" && birthdays) {
        exportSections.push({
          key: section,
          title: "Cumpleañeros",
          headers: [
            "Nombre",
            "Tipo",
            "FechaNacimiento",
            "PróximoCumpleaños",
            "DíasRestantes",
            "Edad",
            "Teléfono",
            "WhatsApp",
            "Email"
          ],
          rows: birthdays.items.map((row) => [
            row.displayName,
            toTypeLabel(row.type),
            formatDateForClients(row.birthDate, dateFormat),
            formatDateForClients(row.nextBirthday, dateFormat),
            String(row.daysUntil),
            row.age === null ? "" : String(row.age),
            masked ? maskPhone(row.phone) : row.phone || "",
            masked ? maskPhone(row.phone) : row.whatsappHref || "",
            masked ? maskEmail(row.email) : row.email || ""
          ])
        });
        continue;
      }

      if (section === "clients_list" && clientsRows) {
        const { headers, matrix } = buildClientsReportExportMatrix({
          rows: clientsRows.items,
          selectedColumns,
          masked
        });

        exportSections.push({
          key: section,
          title: "Listado de clientes",
          headers,
          rows: matrix
        });
      }
    }

    const exportPlan = composeClientsReportsExportPlan({
      filters,
      selectedSections: sections,
      format,
      masked,
      sections: exportSections,
      compact: {
        pdf: compactPdf,
        xlsx: compactXlsx
      }
    });

    if (!exportPlan.hasData) {
      return createNoDataExportResponse();
    }
    const sectionsForExport = exportPlan.nonEmptySections;

    const nowTag = new Date().toISOString().slice(0, 10);
    const nowTagCompact = nowTag.replace(/-/g, "");

    if (format === "xlsx") {
      const { buffer } = await exportExcelViaProcessingService({
        context: {
          tenantId: auth.user.tenantId,
          actorId: auth.user.id
        },
        fileName: `clientes-reportes-${nowTag}.xlsx`,
        sheets: exportPlan.xlsxSheets,
        limits: {
          maxFileMb: 8,
          maxRows: EXPORT_MAX_ROWS,
          maxCols: 120,
          timeoutMs: 20_000
        }
      });

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename=\"clientes-reportes-${nowTag}.xlsx\"`
        }
      });
    }

    if (format === "pdf") {
      if (sectionsForExport.length > MAX_PDF_SECTIONS) {
        return NextResponse.json(
          {
            ok: false,
            error: `PDF admite máximo ${MAX_PDF_SECTIONS} secciones por exportación.`
          },
          { status: 422 }
        );
      }

      const pdfBytes = await buildPdf({
        sections: sectionsForExport,
        generatedAt: new Date(),
        masked,
        layoutMode: exportPlan.pdfLayoutMode
      });

      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=\"clientes-reportes-${nowTag}.pdf\"`
        }
      });
    }

    const csvDeliveryMode = exportPlan.csvDeliveryMode;

    if (csvDeliveryMode === "zip_csv") {
      const zip = new JSZip();
      for (const section of sectionsForExport) {
        zip.file(`${section.key}.csv`, toCsvSection(section));
      }
      const zipBuffer = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE"
      });
      return new NextResponse(new Uint8Array(zipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename=\"reportes-clientes-${nowTagCompact}.zip\"`
        }
      });
    }

    const singleSection = sectionsForExport[0];
    const csv = toCsvSection(singleSection);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"clientes-reportes-${singleSection.key}-${nowTag}.csv\"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo exportar reportes.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
