export type ClientsReportsExportFormat = "csv" | "xlsx" | "pdf";

export type ClientsReportsCsvDeliveryMode = "single_csv" | "zip_csv";

export function resolveClientsReportsCsvDeliveryMode(params: {
  format: ClientsReportsExportFormat;
  sectionsCount: number;
}): ClientsReportsCsvDeliveryMode {
  if (params.format !== "csv") return "single_csv";
  return params.sectionsCount > 1 ? "zip_csv" : "single_csv";
}
