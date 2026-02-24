import { NextRequest, NextResponse } from "next/server";
import { ClientCatalogType, ClientProfileType, type Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { isValidEmail } from "@/lib/utils";
import { dpiSchema } from "@/lib/validation/identity";
import { importExcelViaProcessingService } from "@/lib/processing-service/excel";

export const runtime = "nodejs";

type MappingField = {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];
};

type ParsedRow = {
  row: number;
  values: Record<string, string>;
};

type ParseResult = {
  columns: string[];
  rows: ParsedRow[];
};

type ProcessResult = {
  totalRows: number;
  processedRows: number;
  created: number;
  updated: number;
  errors: number;
  errorsCsv: string;
  errorsPreview: Array<{ row: number; message: string }>;
};

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

const FIELD_MAP: Record<ClientProfileType, MappingField[]> = {
  [ClientProfileType.PERSON]: [
    { key: "firstName", label: "Primer nombre", required: true, aliases: ["first_name", "primer_nombre", "firstName"] },
    { key: "middleName", label: "Segundo nombre", required: false, aliases: ["middle_name", "segundo_nombre", "middleName"] },
    { key: "lastName", label: "Primer apellido", required: true, aliases: ["last_name", "primer_apellido", "lastName"] },
    { key: "secondLastName", label: "Segundo apellido", required: false, aliases: ["second_last_name", "segundo_apellido", "secondLastName"] },
    { key: "dpi", label: "DPI", required: true, aliases: ["dpi", "dpi_persona"] },
    { key: "phone", label: "Teléfono", required: true, aliases: ["phone", "telefono", "celular"] },
    { key: "email", label: "Email", required: false, aliases: ["email", "correo"] },
    { key: "address", label: "Dirección", required: false, aliases: ["address", "direccion", "direccion_general"] }
  ],
  [ClientProfileType.COMPANY]: [
    { key: "companyName", label: "Razón social", required: true, aliases: ["company_name", "razon_social", "companyName"] },
    { key: "tradeName", label: "Nombre comercial", required: true, aliases: ["trade_name", "nombre_comercial", "tradeName"] },
    { key: "nit", label: "NIT", required: true, aliases: ["nit", "nit_empresa"] },
    { key: "phone", label: "Teléfono", required: false, aliases: ["phone", "telefono", "telefono_corporativo"] },
    { key: "email", label: "Email", required: false, aliases: ["email", "email_corporativo"] },
    { key: "address", label: "Dirección", required: true, aliases: ["address", "direccion", "direccion_fiscal"] },
    { key: "city", label: "Ciudad", required: true, aliases: ["city", "ciudad"] },
    { key: "department", label: "Departamento", required: true, aliases: ["department", "departamento"] },
    { key: "country", label: "País", required: false, aliases: ["country", "pais"] }
  ],
  [ClientProfileType.INSTITUTION]: [
    { key: "companyName", label: "Nombre institución", required: true, aliases: ["company_name", "name", "nombre_institucion", "companyName"] },
    { key: "nit", label: "NIT", required: false, aliases: ["nit", "nit_empresa"] },
    { key: "phone", label: "Teléfono", required: false, aliases: ["phone", "telefono"] },
    { key: "email", label: "Email", required: false, aliases: ["email"] },
    { key: "address", label: "Dirección", required: true, aliases: ["address", "direccion"] },
    { key: "city", label: "Ciudad", required: true, aliases: ["city", "ciudad"] },
    { key: "department", label: "Departamento", required: true, aliases: ["department", "departamento"] },
    { key: "country", label: "País", required: false, aliases: ["country", "pais"] },
    {
      key: "institutionType",
      label: "Tipo institución",
      required: true,
      aliases: ["institution_type", "tipo_institucion", "institutionType"]
    }
  ],
  [ClientProfileType.INSURER]: [
    { key: "companyName", label: "Nombre aseguradora", required: true, aliases: ["company_name", "name", "companyName"] },
    { key: "tradeName", label: "Nombre comercial", required: false, aliases: ["trade_name", "tradeName"] },
    { key: "nit", label: "NIT", required: false, aliases: ["nit"] },
    { key: "phone", label: "Teléfono", required: false, aliases: ["phone", "telefono"] },
    { key: "email", label: "Email", required: false, aliases: ["email"] },
    { key: "address", label: "Dirección", required: false, aliases: ["address", "direccion"] },
    { key: "city", label: "Ciudad", required: false, aliases: ["city", "ciudad"] },
    { key: "department", label: "Departamento", required: false, aliases: ["department", "departamento"] },
    { key: "country", label: "País", required: false, aliases: ["country", "pais"] }
  ]
};

function sanitizeType(raw: string | null): ClientProfileType | null {
  if (raw === ClientProfileType.PERSON) return ClientProfileType.PERSON;
  if (raw === ClientProfileType.COMPANY) return ClientProfileType.COMPANY;
  if (raw === ClientProfileType.INSTITUTION) return ClientProfileType.INSTITUTION;
  if (raw === ClientProfileType.INSURER) return ClientProfileType.INSURER;
  return null;
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function csvEscape(value: string | number) {
  const text = String(value ?? "");
  if (text.includes(";") || text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function countDelimiterOutsideQuotes(line: string, delimiter: ";" | ",") {
  let inQuotes = false;
  let count = 0;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && char === delimiter) count += 1;
  }

  return count;
}

function detectCsvDelimiter(headerLine: string): ";" | "," {
  const semicolons = countDelimiterOutsideQuotes(headerLine, ";");
  const commas = countDelimiterOutsideQuotes(headerLine, ",");
  return semicolons > commas ? ";" : ",";
}

function parseCsvLine(line: string, delimiter: ";" | ",") {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

async function parseUploadedFile(
  file: File,
  context?: {
    tenantId?: string | null;
    actorId?: string | null;
  }
): Promise<ParseResult> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".csv") || file.type.includes("csv")) {
    const text = (await file.text()).replace(/^\uFEFF/, "");
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (!lines.length) return { columns: [], rows: [] };

    const firstRow = lines[0].trim().toLowerCase();
    const headerIndex = firstRow.startsWith("sep=") ? 1 : 0;
    if (!lines[headerIndex]) return { columns: [], rows: [] };
    const delimiter = detectCsvDelimiter(lines[headerIndex]);
    const columns = parseCsvLine(lines[headerIndex], delimiter);
    const rows: ParsedRow[] = [];

    for (let i = headerIndex + 1; i < lines.length; i += 1) {
      const cells = parseCsvLine(lines[i], delimiter);
      const values: Record<string, string> = {};
      columns.forEach((col, idx) => {
        values[col] = String(cells[idx] || "").trim();
      });
      rows.push({ row: i + 1, values });
    }

    return { columns, rows };
  }

  if (fileName.endsWith(".xlsx") || file.type.includes("sheet")) {
    const imported = await importExcelViaProcessingService({
      context,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
      template: "generic",
      limits: {
        maxFileMb: 8,
        maxRows: 8_000,
        maxCols: 120,
        timeoutMs: 20_000
      }
    });

    const parsed = ((imported.artifactJson || {}) as { rows?: Record<string, unknown>[]; columns?: unknown[] }) || {};
    const columns = Array.isArray(parsed.columns) ? parsed.columns.map((value) => String(value || "").trim()).filter(Boolean) : [];
    const sourceRows = Array.isArray(parsed.rows) ? parsed.rows : [];
    const rows: ParsedRow[] = sourceRows.map((row, index) => {
      const values: Record<string, string> = {};
      columns.forEach((column) => {
        values[column] = String(row[column] ?? "").trim();
      });
      return { row: index + 2, values };
    });
    return { columns, rows };
  }

  throw new Error("Solo se admite CSV o XLSX.");
}

function buildSuggestedMapping(fields: MappingField[], columns: string[]) {
  const normalizedColumns = new Map<string, string>();
  columns.forEach((column) => normalizedColumns.set(normalizeHeader(column), column));

  const mapping: Record<string, string | null> = {};
  fields.forEach((field) => {
    const source = field.aliases
      .map((alias) => normalizedColumns.get(normalizeHeader(alias)))
      .find((value) => Boolean(value));
    mapping[field.key] = source || null;
  });

  return mapping;
}

function resolveMappingFromInput(
  fields: MappingField[],
  providedMappingRaw: string | null,
  suggested: Record<string, string | null>
) {
  const output: Record<string, string> = Object.create(null);
  const provided = (() => {
    if (!providedMappingRaw) return null;
    try {
      return JSON.parse(providedMappingRaw) as Record<string, string>;
    } catch {
      return null;
    }
  })();

  for (const field of fields) {
    const fromProvided = provided?.[field.key];
    const fromSuggested = suggested[field.key];
    const chosen = typeof fromProvided === "string" && fromProvided.trim() ? fromProvided.trim() : fromSuggested || "";
    if (chosen) output[field.key] = chosen;
  }

  return output;
}

function getValue(row: ParsedRow, mapping: Record<string, string>, key: string) {
  const column = mapping[key];
  if (!column) return "";
  return String(row.values[column] || "").trim();
}

async function getDefaultStatusId() {
  const status = await prisma.clientCatalogItem.findFirst({
    where: { type: ClientCatalogType.CLIENT_STATUS, isActive: true, name: { equals: "Activo" } },
    select: { id: true }
  });
  return status?.id ?? null;
}

async function getOrCreateInstitutionTypeId(nameRaw: string) {
  const name = nameRaw.trim();
  if (!name) return null;
  const existing = await prisma.clientCatalogItem.findFirst({
    where: { type: ClientCatalogType.INSTITUTION_TYPE, name: { equals: name, mode: "insensitive" } },
    select: { id: true }
  });
  if (existing) return existing.id;

  const created = await prisma.clientCatalogItem.create({
    data: { type: ClientCatalogType.INSTITUTION_TYPE, name, isActive: true },
    select: { id: true }
  });
  return created.id;
}

function buildErrorCsv(rows: Array<{ row: number; message: string }>) {
  const header = "row;message";
  const body = rows.map((item) => `${csvEscape(item.row)};${csvEscape(item.message)}`).join("\n");
  return `sep=;\n${header}\n${body}`;
}

async function processRows(params: {
  type: ClientProfileType;
  rows: ParsedRow[];
  mapping: Record<string, string>;
}): Promise<ProcessResult> {
  const { type, rows, mapping } = params;
  const defaultStatusId = await getDefaultStatusId();

  let processedRows = 0;
  let created = 0;
  let updated = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (const row of rows) {
    try {
      if (type === ClientProfileType.PERSON) {
        const firstName = getValue(row, mapping, "firstName");
        const middleName = getValue(row, mapping, "middleName") || null;
        const lastName = getValue(row, mapping, "lastName");
        const secondLastName = getValue(row, mapping, "secondLastName") || null;
        const dpi = getValue(row, mapping, "dpi");
        const phone = getValue(row, mapping, "phone");
        const email = getValue(row, mapping, "email") || null;
        const address = getValue(row, mapping, "address") || null;

        if (!firstName || !lastName || !dpi || !phone) {
          throw new Error("Faltan campos requeridos (firstName, lastName, dpi, phone).");
        }

        const dpiParsed = dpiSchema.safeParse(dpi);
        if (!dpiParsed.success) {
          throw new Error(dpiParsed.error.issues[0]?.message || "DPI inválido.");
        }
        if (email && !isValidEmail(email)) throw new Error("Email inválido.");

        const existing = await prisma.clientProfile.findFirst({
          where: { type: ClientProfileType.PERSON, dpi },
          select: { id: true, type: true }
        });

        if (existing) {
          if (existing.type !== ClientProfileType.PERSON) {
            throw new Error("El DPI ya pertenece a un cliente de otro tipo.");
          }
          await prisma.clientProfile.update({
            where: { id: existing.id },
            data: {
              firstName,
              middleName,
              lastName,
              secondLastName,
              phone,
              email,
              address,
              statusId: defaultStatusId,
              deletedAt: null
            }
          });
          updated += 1;
        } else {
          await prisma.clientProfile.create({
            data: {
              type: ClientProfileType.PERSON,
              firstName,
              middleName,
              lastName,
              secondLastName,
              dpi,
              phone,
              email,
              address,
              statusId: defaultStatusId
            }
          });
          created += 1;
        }
      }

      if (type === ClientProfileType.COMPANY) {
        const companyName = getValue(row, mapping, "companyName");
        const tradeName = getValue(row, mapping, "tradeName");
        const nit = getValue(row, mapping, "nit");
        const phone = getValue(row, mapping, "phone") || null;
        const email = getValue(row, mapping, "email") || null;
        const address = getValue(row, mapping, "address");
        const city = getValue(row, mapping, "city");
        const department = getValue(row, mapping, "department");
        const country = getValue(row, mapping, "country") || null;

        if (!companyName || !tradeName || !nit || !address || !city || !department) {
          throw new Error("Faltan campos requeridos (companyName, tradeName, nit, address, city, department).");
        }
        if (email && !isValidEmail(email)) throw new Error("Email inválido.");

        const existing = await prisma.clientProfile.findFirst({ where: { nit }, select: { id: true, type: true } });

        if (existing) {
          if (existing.type !== ClientProfileType.COMPANY) {
            throw new Error("El NIT ya pertenece a un cliente de otro tipo.");
          }
          await prisma.clientProfile.update({
            where: { id: existing.id },
            data: {
              companyName,
              tradeName,
              nit,
              phone,
              email,
              address,
              city,
              department,
              country,
              statusId: defaultStatusId,
              deletedAt: null
            }
          });
          updated += 1;
        } else {
          await prisma.clientProfile.create({
            data: {
              type: ClientProfileType.COMPANY,
              companyName,
              tradeName,
              nit,
              phone,
              email,
              address,
              city,
              department,
              country,
              statusId: defaultStatusId
            }
          });
          created += 1;
        }
      }

      if (type === ClientProfileType.INSTITUTION) {
        const companyName = getValue(row, mapping, "companyName");
        const nit = getValue(row, mapping, "nit") || null;
        const phone = getValue(row, mapping, "phone") || null;
        const email = getValue(row, mapping, "email") || null;
        const address = getValue(row, mapping, "address");
        const city = getValue(row, mapping, "city");
        const department = getValue(row, mapping, "department");
        const country = getValue(row, mapping, "country") || null;
        const institutionType = getValue(row, mapping, "institutionType");

        if (!companyName || !address || !city || !department || !institutionType) {
          throw new Error("Faltan campos requeridos (companyName, address, city, department, institutionType).");
        }
        if (email && !isValidEmail(email)) throw new Error("Email inválido.");

        const institutionTypeId = await getOrCreateInstitutionTypeId(institutionType);
        if (!institutionTypeId) throw new Error("Tipo de institución inválido.");

        const existing = nit ? await prisma.clientProfile.findFirst({ where: { nit }, select: { id: true, type: true } }) : null;

        if (existing) {
          if (existing.type !== ClientProfileType.INSTITUTION) {
            throw new Error("El NIT ya pertenece a un cliente de otro tipo.");
          }
          await prisma.clientProfile.update({
            where: { id: existing.id },
            data: {
              companyName,
              nit,
              phone,
              email,
              address,
              city,
              department,
              country,
              institutionTypeId,
              statusId: defaultStatusId,
              deletedAt: null
            }
          });
          updated += 1;
        } else {
          await prisma.clientProfile.create({
            data: {
              type: ClientProfileType.INSTITUTION,
              companyName,
              nit,
              phone,
              email,
              address,
              city,
              department,
              country,
              institutionTypeId,
              statusId: defaultStatusId
            }
          });
          created += 1;
        }
      }

      if (type === ClientProfileType.INSURER) {
        const companyName = getValue(row, mapping, "companyName");
        const tradeName = getValue(row, mapping, "tradeName") || companyName;
        const nit = getValue(row, mapping, "nit") || null;
        const phone = getValue(row, mapping, "phone") || null;
        const email = getValue(row, mapping, "email") || null;
        const address = getValue(row, mapping, "address") || null;
        const city = getValue(row, mapping, "city") || null;
        const department = getValue(row, mapping, "department") || null;
        const country = getValue(row, mapping, "country") || null;

        if (!companyName) {
          throw new Error("Falta campo requerido (companyName).");
        }
        if (email && !isValidEmail(email)) throw new Error("Email inválido.");

        const existing = nit ? await prisma.clientProfile.findFirst({ where: { nit }, select: { id: true, type: true } }) : null;

        if (existing) {
          if (existing.type !== ClientProfileType.INSURER) {
            throw new Error("El NIT ya pertenece a un cliente de otro tipo.");
          }
          await prisma.clientProfile.update({
            where: { id: existing.id },
            data: {
              companyName,
              tradeName,
              nit,
              phone,
              email,
              address,
              city,
              department,
              country,
              statusId: defaultStatusId,
              deletedAt: null
            }
          });
          updated += 1;
        } else {
          await prisma.clientProfile.create({
            data: {
              type: ClientProfileType.INSURER,
              companyName,
              tradeName,
              nit,
              phone,
              email,
              address,
              city,
              department,
              country,
              statusId: defaultStatusId
            }
          });
          created += 1;
        }
      }

      processedRows += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido.";
      errors.push({ row: row.row, message });
    }
  }

  return {
    totalRows: rows.length,
    processedRows,
    created,
    updated,
    errors: errors.length,
    errorsCsv: buildErrorCsv(errors),
    errorsPreview: errors.slice(0, 25)
  };
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!auth.user || !isAdmin(auth.user)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const modeRaw = String(formData.get("mode") || "analyze").toLowerCase();
  const mode = modeRaw === "process" ? "process" : "analyze";

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Archivo requerido." }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ ok: false, error: "Archivo inválido (máx 8MB)." }, { status: 400 });
  }

  const type = sanitizeType(String(formData.get("type") || ""));
  if (!type) {
    return NextResponse.json({ ok: false, error: "Tipo de cliente inválido." }, { status: 400 });
  }

  let parsed: ParseResult;
  try {
    parsed = await parseUploadedFile(file, {
      tenantId: auth.user.tenantId,
      actorId: auth.user.id
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error)?.message || "No se pudo leer el archivo." }, { status: 400 });
  }

  if (!parsed.columns.length) {
    return NextResponse.json({ ok: false, error: "No se detectaron columnas en el archivo." }, { status: 400 });
  }

  const fields = FIELD_MAP[type];
  const suggestedMapping = buildSuggestedMapping(fields, parsed.columns);
  const mapping = resolveMappingFromInput(fields, (formData.get("mapping") as string | null) || null, suggestedMapping);

  const missingRequired = fields
    .filter((field) => field.required)
    .filter((field) => !mapping[field.key]);

  if (mode === "analyze") {
    return NextResponse.json({
      ok: true,
      requiresMapping: missingRequired.length > 0,
      availableColumns: parsed.columns,
      fields: fields.map(({ key, label, required }) => ({ key, label, required })),
      suggestedMapping,
      previewRows: parsed.rows.length
    });
  }

  if (missingRequired.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Faltan mapeos requeridos: ${missingRequired.map((field) => field.label).join(", ")}`
      },
      { status: 400 }
    );
  }

  try {
    const result = await processRows({ type, rows: parsed.rows, mapping });
    return NextResponse.json({ ok: true, summary: {
      totalRows: result.totalRows,
      processedRows: result.processedRows,
      created: result.created,
      updated: result.updated,
      errors: result.errors
    }, errorsCsv: result.errorsCsv, errorsPreview: result.errorsPreview });
  } catch (err) {
    const maybePrisma = err as Prisma.PrismaClientKnownRequestError;
    if (maybePrisma?.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Conflicto de unicidad detectado durante la importación." }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: (err as Error)?.message || "No se pudo procesar la importación." }, { status: 500 });
  }
}
