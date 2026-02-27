import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ClientProfileType } from "@prisma/client";
import { buildClientBulkTemplateWorkbook } from "@/lib/clients/bulk/clientBulkTemplateWorkbook";
import {
  getClientBulkSchema,
  getClientBulkTemplateExampleRow,
  getClientBulkTemplateHeaders
} from "@/lib/clients/bulk/clientBulkSchema";

function csvEscape(value: string) {
  if (value.includes(";") || value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const outputDir = join(process.cwd(), "public", "templates", "clients");
mkdirSync(outputDir, { recursive: true });

const types = [
  ClientProfileType.PERSON,
  ClientProfileType.COMPANY,
  ClientProfileType.INSTITUTION,
  ClientProfileType.INSURER
];

for (const type of types) {
  const schema = getClientBulkSchema(type);
  const headers = getClientBulkTemplateHeaders(type);
  const sample = getClientBulkTemplateExampleRow(type);
  const csvRows = [headers, sample].map((row) => row.map(csvEscape).join(";")).join("\n");
  const csv = `\uFEFFsep=;\n${csvRows}`;
  writeFileSync(join(outputDir, schema.filenameCsv), csv, "utf8");

  const xlsxBuffer = buildClientBulkTemplateWorkbook(type);
  writeFileSync(join(outputDir, schema.filenameXlsx), xlsxBuffer);
}

writeFileSync(
  join(outputDir, "README.md"),
  [
    "# Plantillas clientes",
    "",
    "Plantillas generadas desde `lib/clients/bulk/clientBulkSchema.ts`.",
    "Regenerar con: `pnpm clients:bulk:templates`."
  ].join("\n"),
  "utf8"
);

console.log(`Plantillas generadas en ${outputDir}`);
