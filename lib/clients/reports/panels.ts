export const CLIENTS_REPORT_PANEL_OPTIONS = [
  { key: "by_type", label: "Clientes por tipo" },
  { key: "top_channels", label: "Top canales" },
  { key: "insurers_by_line", label: "Aseguradoras por ramo" },
  { key: "geo", label: "Mapa + detalle geográfico" },
  { key: "top_referrers", label: "Top referidores" },
  { key: "birthdays", label: "Cumpleañeros" },
  { key: "clients_list", label: "Listado de clientes" }
] as const;

export type ClientsReportPanelKey = (typeof CLIENTS_REPORT_PANEL_OPTIONS)[number]["key"];

export const CLIENTS_REPORT_PANEL_DEFAULT_VISIBILITY: Record<ClientsReportPanelKey, boolean> = {
  by_type: true,
  top_channels: true,
  insurers_by_line: true,
  geo: true,
  top_referrers: true,
  birthdays: true,
  clients_list: true
};
