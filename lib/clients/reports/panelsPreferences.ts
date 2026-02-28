import {
  CLIENTS_REPORT_PANEL_DEFAULT_VISIBILITY,
  CLIENTS_REPORT_PANEL_OPTIONS,
  type ClientsReportPanelKey
} from "@/lib/clients/reports/panels";

export type ClientsReportsPanelsVisibility = Record<ClientsReportPanelKey, boolean>;

export const CLIENTS_REPORTS_PANELS_STORAGE_KEY = "clients:reports:v22:panels";

export function normalizeClientsReportsPanelsVisibility(
  value: Partial<Record<ClientsReportPanelKey, boolean>> | null | undefined
): ClientsReportsPanelsVisibility {
  return {
    by_type: value?.by_type !== false,
    top_channels: value?.top_channels !== false,
    insurers_by_line: value?.insurers_by_line !== false,
    geo: value?.geo !== false,
    top_referrers: value?.top_referrers !== false,
    birthdays: value?.birthdays !== false,
    clients_list: value?.clients_list !== false
  };
}

export function parseClientsReportsPanelsVisibility(
  raw: string | null | undefined
): ClientsReportsPanelsVisibility | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<ClientsReportPanelKey, boolean>>;
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeClientsReportsPanelsVisibility(parsed);
  } catch {
    return null;
  }
}

export function serializeClientsReportsPanelsVisibility(value: ClientsReportsPanelsVisibility) {
  return JSON.stringify(value);
}

export function countActiveClientsReportsPanels(value: ClientsReportsPanelsVisibility) {
  return CLIENTS_REPORT_PANEL_OPTIONS.reduce((total, option) => total + (value[option.key] ? 1 : 0), 0);
}

export function getAllVisibleClientsReportsPanels(
  visible: boolean
): ClientsReportsPanelsVisibility {
  return normalizeClientsReportsPanelsVisibility(
    Object.fromEntries(
      CLIENTS_REPORT_PANEL_OPTIONS.map((option) => [option.key, visible])
    ) as Partial<Record<ClientsReportPanelKey, boolean>>
  );
}

export function getDefaultClientsReportsPanelsVisibility() {
  return normalizeClientsReportsPanelsVisibility(CLIENTS_REPORT_PANEL_DEFAULT_VISIBILITY);
}
