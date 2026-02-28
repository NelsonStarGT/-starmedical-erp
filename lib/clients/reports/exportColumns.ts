import type { ClientsReportRow } from "@/lib/clients/reports.service";

export const CLIENTS_REPORT_EXPORT_GROUPS = {
  IDENTITY: "IDENTITY",
  CONTACT: "CONTACT",
  FISCAL: "FISCAL",
  LOCATION: "LOCATION",
  AFFILIATIONS: "AFFILIATIONS"
} as const;

export type ClientsReportExportGroupKey =
  (typeof CLIENTS_REPORT_EXPORT_GROUPS)[keyof typeof CLIENTS_REPORT_EXPORT_GROUPS];

type ClientsReportExportColumn = {
  key: string;
  label: string;
  groups: ClientsReportExportGroupKey[];
  pii?: boolean;
  getValue: (row: ClientsReportRow) => string;
};

function normalizeString(value: string | null | undefined) {
  return String(value || "").trim();
}

function maskPhone(value: string) {
  const trimmed = normalizeString(value);
  if (!trimmed) return "";
  const tail = trimmed.slice(-4);
  const maskedLen = Math.max(trimmed.length - tail.length, 2);
  return `${"*".repeat(maskedLen)}${tail}`;
}

function maskEmail(value: string) {
  const trimmed = normalizeString(value);
  if (!trimmed.includes("@")) return maskPhone(trimmed);
  const [name, domain] = trimmed.split("@");
  if (!name) return `***@${domain}`;
  return `${name.slice(0, 1)}***@${domain}`;
}

function maskIdentifier(value: string) {
  const trimmed = normalizeString(value);
  if (!trimmed) return "";
  if (trimmed.length <= 4) return "***";
  return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
}

export const CLIENTS_REPORT_EXPORT_COLUMNS: ClientsReportExportColumn[] = [
  {
    key: "createdAt",
    label: "Fecha creación",
    groups: [CLIENTS_REPORT_EXPORT_GROUPS.IDENTITY],
    getValue: (row) => row.createdAt.toISOString()
  },
  {
    key: "clientId",
    label: "ID Cliente",
    groups: [CLIENTS_REPORT_EXPORT_GROUPS.IDENTITY],
    getValue: (row) => row.id
  },
  {
    key: "displayName",
    label: "Nombre",
    groups: [CLIENTS_REPORT_EXPORT_GROUPS.IDENTITY],
    getValue: (row) => row.displayName
  },
  {
    key: "type",
    label: "Tipo",
    groups: [CLIENTS_REPORT_EXPORT_GROUPS.IDENTITY],
    getValue: (row) => row.type
  },
  {
    key: "identifier",
    label: "Documento / NIT",
    groups: [CLIENTS_REPORT_EXPORT_GROUPS.IDENTITY, CLIENTS_REPORT_EXPORT_GROUPS.FISCAL],
    pii: true,
    getValue: (row) => row.identifier ?? ""
  },
  {
    key: "phone",
    label: "Teléfono",
    groups: [CLIENTS_REPORT_EXPORT_GROUPS.CONTACT],
    pii: true,
    getValue: (row) => row.phone ?? ""
  },
  {
    key: "email",
    label: "Email",
    groups: [CLIENTS_REPORT_EXPORT_GROUPS.CONTACT],
    pii: true,
    getValue: (row) => row.email ?? ""
  },
  {
    key: "country",
    label: "País",
    groups: [CLIENTS_REPORT_EXPORT_GROUPS.LOCATION],
    getValue: (row) => row.country ?? ""
  },
  {
    key: "department",
    label: "Departamento",
    groups: [CLIENTS_REPORT_EXPORT_GROUPS.LOCATION],
    getValue: (row) => row.department ?? ""
  },
  {
    key: "city",
    label: "Ciudad",
    groups: [CLIENTS_REPORT_EXPORT_GROUPS.LOCATION],
    getValue: (row) => row.city ?? ""
  },
  {
    key: "acquisitionSource",
    label: "Canal",
    groups: [CLIENTS_REPORT_EXPORT_GROUPS.AFFILIATIONS],
    getValue: (row) => row.acquisitionSource ?? ""
  },
  {
    key: "acquisitionDetail",
    label: "Detalle canal",
    groups: [CLIENTS_REPORT_EXPORT_GROUPS.AFFILIATIONS],
    getValue: (row) => row.acquisitionDetail ?? ""
  },
  {
    key: "referredBy",
    label: "Referido por",
    groups: [CLIENTS_REPORT_EXPORT_GROUPS.AFFILIATIONS, CLIENTS_REPORT_EXPORT_GROUPS.CONTACT],
    getValue: (row) => row.referredBy ?? ""
  }
];

export function getClientsReportExportColumnOptions() {
  return CLIENTS_REPORT_EXPORT_COLUMNS.map((column) => ({
    key: column.key,
    label: column.label,
    groups: column.groups,
    pii: Boolean(column.pii)
  }));
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function resolveClientsReportExportColumns(params: {
  columns?: string | null;
  groups?: string | null;
}) {
  const allKeys = CLIENTS_REPORT_EXPORT_COLUMNS.map((column) => column.key);
  const requestedColumns = dedupe(String(params.columns || "").split(",").map((value) => value.trim()));
  if (requestedColumns.length) {
    const set = new Set(allKeys);
    const selected = requestedColumns.filter((value) => set.has(value));
    return selected.length ? selected : allKeys;
  }

  const requestedGroups = dedupe(
    String(params.groups || "")
      .split(",")
      .map((value) => value.trim().toUpperCase())
  ) as ClientsReportExportGroupKey[];

  if (!requestedGroups.length) return allKeys;

  const selected = CLIENTS_REPORT_EXPORT_COLUMNS.filter((column) =>
    column.groups.some((group) => requestedGroups.includes(group))
  ).map((column) => column.key);

  return selected.length ? selected : allKeys;
}

function applyMaskIfNeeded(column: ClientsReportExportColumn, rawValue: string, masked: boolean) {
  if (!masked || !column.pii) return rawValue;
  if (column.key === "email") return maskEmail(rawValue);
  if (column.key === "phone") return maskPhone(rawValue);
  if (column.key === "identifier") return maskIdentifier(rawValue);
  return rawValue;
}

export function buildClientsReportExportMatrix(params: {
  rows: ClientsReportRow[];
  selectedColumns: string[];
  masked: boolean;
}) {
  const selected = CLIENTS_REPORT_EXPORT_COLUMNS.filter((column) => params.selectedColumns.includes(column.key));
  const headers = selected.map((column) => column.label);
  const matrix = params.rows.map((row) =>
    selected.map((column) => applyMaskIfNeeded(column, normalizeString(column.getValue(row)), params.masked))
  );
  return { headers, matrix, selectedColumns: selected.map((column) => column.key) };
}
