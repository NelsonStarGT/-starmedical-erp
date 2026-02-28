import { NextRequest, NextResponse } from "next/server";
import {
  ClientBloodType,
  ClientCatalogType,
  ClientLocationType,
  ClientNoteType,
  ClientNoteVisibility,
  ClientProfileType,
  ClientServiceSegment,
  CompanyKind,
  PatientSex,
  Prisma
} from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import {
  canAnalyzeClientImport,
  canProcessClientImport,
  canProcessClientImportUpdate
} from "@/lib/clients/bulk/permissions";
import {
  buildClientBulkSuggestedMapping,
  extractClientBulkRowValues,
  getClientBulkMissingRequiredColumns,
  getClientBulkSchema,
  normalizeBulkCsvPhone,
  normalizeClientBulkHeader,
  parseBulkCsvBoolean,
  parseBulkCsvIsoDate,
  resolveClientBulkMapping,
  splitBulkCsvList
} from "@/lib/clients/bulk/clientBulkSchema";
import { importExcelViaProcessingService } from "@/lib/processing-service/excel";
import { isPrismaMissingTableError, isPrismaSchemaMismatchError } from "@/lib/prisma/errors.server";
import { recordClientsAccessBlocked } from "@/lib/clients/securityEvents";
import { prisma } from "@/lib/prisma";
import { tenantIdFromUser } from "@/lib/tenant";
import { isValidEmail } from "@/lib/utils";
import { dpiSchema } from "@/lib/validation/identity";

export const runtime = "nodejs";

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
  skipped: number;
  errors: number;
  errorsCsv: string;
  errorsPreview: Array<{ row: number; message: string }>;
  duplicates: number;
  duplicatesCsv: string;
  duplicatesPreview: DuplicateConflict[];
};

type DuplicateConflict = {
  row: number;
  rowLabel: string;
  duplicateType: "EXACT_DUPLICATE" | "PROBABLE_DUPLICATE";
  field: "document_number" | "nit" | "phone_primary" | "email_primary";
  value: string;
  existingId: string | null;
  existingLabel: string | null;
  suggestedAction: "SKIP" | "UPDATE" | "REVIEW";
};

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

function sanitizeType(raw: string | null): ClientProfileType | null {
  if (raw === ClientProfileType.PERSON) return ClientProfileType.PERSON;
  if (raw === ClientProfileType.COMPANY) return ClientProfileType.COMPANY;
  if (raw === ClientProfileType.INSTITUTION) return ClientProfileType.INSTITUTION;
  if (raw === ClientProfileType.INSURER) return ClientProfileType.INSURER;
  return null;
}

function normalizeOptional(value: unknown) {
  const normalized = String(value || "").trim();
  return normalized.length ? normalized : null;
}

function normalizeRequired(value: unknown, message: string) {
  const normalized = normalizeOptional(value);
  if (!normalized) throw new Error(message);
  return normalized;
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
    let imported;
    try {
      imported = await importExcelViaProcessingService({
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
    } catch (error) {
      const message = (error as Error)?.message || "Error de procesamiento XLSX.";
      throw new Error(`${message} Intenta reexportar el archivo o usar CSV.`);
    }

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

function buildErrorCsv(rows: Array<{ row: number; message: string }>) {
  const header = "row;message";
  const body = rows.map((item) => `${csvEscape(item.row)};${csvEscape(item.message)}`).join("\n");
  return `sep=;\n${header}\n${body}`;
}

function buildDuplicatesCsv(rows: DuplicateConflict[]) {
  const header = "row;rowLabel;duplicateType;field;value;existingId;existingLabel;suggestedAction";
  const body = rows
    .map((item) =>
      [
        csvEscape(item.row),
        csvEscape(item.rowLabel),
        csvEscape(item.duplicateType),
        csvEscape(item.field),
        csvEscape(item.value),
        csvEscape(item.existingId ?? ""),
        csvEscape(item.existingLabel ?? ""),
        csvEscape(item.suggestedAction)
      ].join(";")
    )
    .join("\n");
  return `sep=;\n${header}\n${body}`;
}

function normalizeEmailLower(value: string | null | undefined) {
  const normalized = normalizeOptional(value);
  return normalized ? normalized.toLowerCase() : null;
}

function buildRowLabel(type: ClientProfileType, values: Record<string, string>) {
  if (type === ClientProfileType.PERSON) {
    const fullName = [values.first_name, values.middle_name, values.last_name, values.second_last_name]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(" ")
      .trim();
    return fullName || values.document_number || `Fila persona`;
  }

  const legalName = normalizeOptional(values.legal_name);
  const tradeName = normalizeOptional(values.trade_name ?? values.public_name);
  return legalName || tradeName || values.nit || `Fila organización`;
}

function formatExistingLabel(type: ClientProfileType, row: {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  secondLastName: string | null;
  companyName: string | null;
  tradeName: string | null;
  nit: string | null;
  dpi: string | null;
}) {
  if (type === ClientProfileType.PERSON) {
    const fullName = [row.firstName, row.middleName, row.lastName, row.secondLastName].filter(Boolean).join(" ").trim();
    if (fullName && row.dpi) return `${fullName} (${row.dpi})`;
    return fullName || row.dpi || null;
  }
  const name = row.companyName || row.tradeName;
  if (name && row.nit) return `${name} (${row.nit})`;
  return name || row.nit || null;
}

async function detectDuplicateConflictsForRow(params: {
  tenantId: string;
  type: ClientProfileType;
  rowNumber: number;
  values: Record<string, string>;
  includeProbables: boolean;
}) {
  const { tenantId, type, rowNumber, values, includeProbables } = params;
  const conflicts: DuplicateConflict[] = [];
  const rowLabel = buildRowLabel(type, values);

  const exactKeyValue =
    type === ClientProfileType.PERSON ? normalizeOptional(values.document_number) : normalizeOptional(values.nit);
  const phoneKeyValue = normalizeOptional(normalizeBulkCsvPhone(values.phone_primary));
  const emailKeyValue = normalizeEmailLower(values.email_primary);

  const baseSelect = {
    id: true,
    firstName: true,
    middleName: true,
    lastName: true,
    secondLastName: true,
    companyName: true,
    tradeName: true,
    nit: true,
    dpi: true
  } as const;

  type ExistingLite = {
    id: string;
    firstName: string | null;
    middleName: string | null;
    lastName: string | null;
    secondLastName: string | null;
    companyName: string | null;
    tradeName: string | null;
    nit: string | null;
    dpi: string | null;
  };

  let exactExisting: ExistingLite | null = null;

  if (exactKeyValue) {
    exactExisting = await prisma.clientProfile.findFirst({
      where:
        type === ClientProfileType.PERSON
          ? {
              tenantId,
              type,
              dpi: exactKeyValue
            }
          : {
              tenantId,
              type,
              nit: exactKeyValue
            },
      select: baseSelect
    });

    if (exactExisting) {
      conflicts.push({
        row: rowNumber,
        rowLabel,
        duplicateType: "EXACT_DUPLICATE",
        field: type === ClientProfileType.PERSON ? "document_number" : "nit",
        value: exactKeyValue,
        existingId: exactExisting.id,
        existingLabel: formatExistingLabel(type, exactExisting),
        suggestedAction: "SKIP"
      });
    }
  }

  if (!includeProbables) {
    return conflicts;
  }

  const already = new Set(conflicts.map((item) => `${item.field}:${item.existingId || "none"}:${item.value.toLowerCase()}`));

  if (phoneKeyValue) {
    const existingPhone = await prisma.clientProfile.findFirst({
      where: {
        tenantId,
        type,
        phone: phoneKeyValue
      },
      select: baseSelect
    });

    if (existingPhone) {
      const key = `phone_primary:${existingPhone.id}:${phoneKeyValue.toLowerCase()}`;
      if (!already.has(key)) {
        conflicts.push({
          row: rowNumber,
          rowLabel,
          duplicateType: "PROBABLE_DUPLICATE",
          field: "phone_primary",
          value: phoneKeyValue,
          existingId: existingPhone.id,
          existingLabel: formatExistingLabel(type, existingPhone),
          suggestedAction: "REVIEW"
        });
        already.add(key);
      }
    }
  }

  if (emailKeyValue) {
    const existingEmail = await prisma.clientProfile.findFirst({
      where: {
        tenantId,
        type,
        email: emailKeyValue
      },
      select: baseSelect
    });

    if (existingEmail) {
      const key = `email_primary:${existingEmail.id}:${emailKeyValue.toLowerCase()}`;
      if (!already.has(key)) {
        conflicts.push({
          row: rowNumber,
          rowLabel,
          duplicateType: "PROBABLE_DUPLICATE",
          field: "email_primary",
          value: emailKeyValue,
          existingId: existingEmail.id,
          existingLabel: formatExistingLabel(type, existingEmail),
          suggestedAction: "REVIEW"
        });
      }
    }
  }

  return conflicts;
}

async function analyzeRowsForDuplicateConflicts(params: {
  tenantId: string;
  type: ClientProfileType;
  rows: ParsedRow[];
  mapping: Record<string, string>;
}) {
  const conflicts: DuplicateConflict[] = [];

  for (const row of params.rows) {
    const values = extractClientBulkRowValues(params.type, row.values, params.mapping);
    const rowConflicts = await detectDuplicateConflictsForRow({
      tenantId: params.tenantId,
      type: params.type,
      rowNumber: row.row,
      values,
      includeProbables: true
    });
    conflicts.push(...rowConflicts);
  }

  return conflicts;
}

function parseServiceSegments(raw: string) {
  const normalized = splitBulkCsvList(raw)
    .map((value) => value.toUpperCase())
    .map((value) => {
      if (value === "PARTICULAR") return ClientServiceSegment.PARTICULAR;
      if (value === "EMPRESA" || value === "COMPANY") return ClientServiceSegment.COMPANY;
      if (value === "INSTITUCION" || value === "INSTITUTION") return ClientServiceSegment.INSTITUTION;
      if (value === "ASEGURADORA" || value === "INSURER") return ClientServiceSegment.INSURER;
      return null;
    })
    .filter((value): value is ClientServiceSegment => Boolean(value));

  if (!normalized.length) return [ClientServiceSegment.PARTICULAR];
  return Array.from(new Set(normalized));
}

function parseSex(raw: string) {
  const value = raw.trim().toUpperCase();
  if (!value) return null;
  if (Object.values(PatientSex).includes(value as PatientSex)) return value as PatientSex;
  if (["M", "MALE", "MASCULINO"].includes(value)) return PatientSex.M;
  if (["F", "FEMALE", "FEMENINO"].includes(value)) return PatientSex.F;
  return null;
}

function parseBloodType(raw: string) {
  const value = raw.trim().toUpperCase();
  if (!value) return null;
  if (Object.values(ClientBloodType).includes(value as ClientBloodType)) return value as ClientBloodType;
  return null;
}

async function getDefaultStatusId() {
  const status = await prisma.clientCatalogItem.findFirst({
    where: {
      type: ClientCatalogType.CLIENT_STATUS,
      isActive: true,
      name: { equals: "Activo", mode: "insensitive" }
    },
    select: { id: true }
  });
  return status?.id ?? null;
}

async function resolveCountryByToken(raw: string | null, cache: Map<string, { id: string; name: string; iso2: string } | null>) {
  const value = normalizeOptional(raw);
  if (!value) return null;
  const key = value.toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;

  const country = await prisma.geoCountry.findFirst({
    where: {
      isActive: true,
      OR: [
        { id: value },
        { iso2: { equals: value.toUpperCase(), mode: "insensitive" } },
        { name: { equals: value, mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      name: true,
      iso2: true
    }
  });

  const resolved = country ? { id: country.id, name: country.name, iso2: country.iso2 } : null;
  cache.set(key, resolved);
  return resolved;
}

async function getOrCreateCatalogItemId(
  type: ClientCatalogType,
  rawName: string | null,
  cache: Map<string, string>
) {
  const name = normalizeOptional(rawName);
  if (!name) return null;

  const key = `${type}:${name.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  const existing = await prisma.clientCatalogItem.findFirst({
    where: {
      type,
      name: { equals: name, mode: "insensitive" }
    },
    select: { id: true }
  });
  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }

  try {
    const created = await prisma.clientCatalogItem.create({
      data: { type, name, isActive: true },
      select: { id: true }
    });
    cache.set(key, created.id);
    return created.id;
  } catch (error) {
    const fallback = await prisma.clientCatalogItem.findFirst({
      where: {
        type,
        name: { equals: name, mode: "insensitive" }
      },
      select: { id: true }
    });
    if (fallback) {
      cache.set(key, fallback.id);
      return fallback.id;
    }
    throw error;
  }
}

function buildAcquisitionDetailCode(raw: string) {
  const normalized = normalizeClientBulkHeader(raw);
  if (!normalized) return `detail_${Date.now()}`;
  return normalized.slice(0, 60);
}

async function getOrCreateAcquisitionSourceId(rawName: string | null, cache: Map<string, string>) {
  const name = normalizeOptional(rawName);
  if (!name) return null;

  const key = name.toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;

  const existing = await prisma.clientAcquisitionSource.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true }
  });
  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }

  try {
    const created = await prisma.clientAcquisitionSource.create({
      data: {
        name,
        code: normalizeClientBulkHeader(name) || null,
        isActive: true
      },
      select: { id: true }
    });
    cache.set(key, created.id);
    return created.id;
  } catch {
    const fallback = await prisma.clientAcquisitionSource.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true }
    });
    if (fallback) {
      cache.set(key, fallback.id);
      return fallback.id;
    }
    throw new Error("No se pudo resolver el canal de adquisición.");
  }
}

async function getOrCreateAcquisitionDetailId(
  sourceId: string | null,
  rawName: string | null,
  cache: Map<string, string>
) {
  const name = normalizeOptional(rawName);
  if (!sourceId || !name) return null;

  const key = `${sourceId}:${name.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  const existing = await prisma.clientAcquisitionDetailOption.findFirst({
    where: {
      sourceId,
      name: { equals: name, mode: "insensitive" }
    },
    select: { id: true }
  });
  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }

  try {
    const created = await prisma.clientAcquisitionDetailOption.create({
      data: {
        sourceId,
        name,
        code: buildAcquisitionDetailCode(name),
        isActive: true
      },
      select: { id: true }
    });
    cache.set(key, created.id);
    return created.id;
  } catch {
    const fallback = await prisma.clientAcquisitionDetailOption.findFirst({
      where: {
        sourceId,
        name: { equals: name, mode: "insensitive" }
      },
      select: { id: true }
    });
    if (fallback) {
      cache.set(key, fallback.id);
      return fallback.id;
    }
    throw new Error("No se pudo resolver el detalle del canal de adquisición.");
  }
}

async function upsertPrimaryLocation(input: {
  clientId: string;
  type: ClientLocationType;
  address: string;
  country: string | null;
  department: string | null;
  city: string | null;
  postalCode: string | null;
  geoCountryId: string | null;
}) {
  const existing = await prisma.clientLocation.findFirst({
    where: {
      clientId: input.clientId,
      isPrimary: true
    },
    select: { id: true }
  });

  const payload = {
    type: input.type,
    address: input.address,
    addressLine1: input.address,
    country: input.country,
    department: input.department,
    city: input.city,
    postalCode: input.postalCode,
    geoCountryId: input.geoCountryId,
    isPrimary: true,
    isActive: true
  };

  if (existing) {
    await prisma.clientLocation.update({
      where: { id: existing.id },
      data: payload
    });
    return;
  }

  await prisma.clientLocation.create({
    data: {
      clientId: input.clientId,
      ...payload
    }
  });
}

async function upsertImportNote(clientId: string, note: string | null) {
  const normalized = normalizeOptional(note);
  if (!normalized) return;

  const existing = await prisma.clientNote.findFirst({
    where: {
      clientId,
      noteType: ClientNoteType.ADMIN,
      title: "Import CSV"
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true }
  });

  if (existing) {
    await prisma.clientNote.update({
      where: { id: existing.id },
      data: {
        body: normalized,
        visibility: ClientNoteVisibility.INTERNA
      }
    });
    return;
  }

  await prisma.clientNote.create({
    data: {
      clientId,
      title: "Import CSV",
      body: normalized,
      noteType: ClientNoteType.ADMIN,
      visibility: ClientNoteVisibility.INTERNA
    }
  });
}

function asMetadataObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, unknown>;
  return value as Record<string, unknown>;
}

async function upsertCompanyCore(input: {
  tenantId: string;
  clientProfileId: string;
  kind: CompanyKind;
  legalName: string;
  tradeName: string | null;
  taxId: string | null;
  website: string | null;
  billingEmail: string | null;
  billingPhone: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
}) {
  try {
    const existing = await prisma.company.findUnique({
      where: { clientProfileId: input.clientProfileId },
      select: { metadata: true }
    });

    const mergedMetadata = {
      ...asMetadataObject(existing?.metadata),
      ...input.metadata,
      source: "clients.bulk.import"
    } as Prisma.InputJsonValue;

    await prisma.company.upsert({
      where: { clientProfileId: input.clientProfileId },
      update: {
        kind: input.kind,
        legalName: input.legalName,
        tradeName: input.tradeName,
        taxId: input.taxId,
        website: input.website,
        billingEmail: input.billingEmail,
        billingPhone: input.billingPhone,
        notes: input.notes,
        metadata: mergedMetadata,
        status: "ACTIVE"
      },
      create: {
        tenantId: input.tenantId,
        clientProfileId: input.clientProfileId,
        kind: input.kind,
        legalName: input.legalName,
        tradeName: input.tradeName,
        taxId: input.taxId,
        website: input.website,
        billingEmail: input.billingEmail,
        billingPhone: input.billingPhone,
        notes: input.notes,
        metadata: mergedMetadata,
        status: "ACTIVE"
      }
    });
  } catch (error) {
    if (isPrismaMissingTableError(error) || isPrismaSchemaMismatchError(error)) {
      return;
    }
    throw error;
  }
}

async function processRows(params: {
  tenantId: string;
  type: ClientProfileType;
  rows: ParsedRow[];
  mapping: Record<string, string>;
  dedupeMode: "skip" | "update";
}): Promise<ProcessResult> {
  const { tenantId, type, rows, mapping, dedupeMode } = params;
  const defaultStatusId = await getDefaultStatusId();

  let processedRows = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ row: number; message: string }> = [];
  const duplicates: DuplicateConflict[] = [];

  const catalogCache = new Map<string, string>();
  const acquisitionSourceCache = new Map<string, string>();
  const acquisitionDetailCache = new Map<string, string>();
  const countryCache = new Map<string, { id: string; name: string; iso2: string } | null>();

  for (const row of rows) {
    try {
      const values = extractClientBulkRowValues(type, row.values, mapping);

      if (type === ClientProfileType.PERSON) {
        const firstName = normalizeRequired(values.first_name, "Primer nombre requerido.");
        const lastName = normalizeRequired(values.last_name, "Primer apellido requerido.");
        const documentNumber = normalizeRequired(values.document_number, "Documento requerido.");
        const phone = normalizeRequired(normalizeBulkCsvPhone(values.phone_primary), "Teléfono principal requerido.");

        const middleName = normalizeOptional(values.middle_name);
        const thirdName = normalizeOptional(values.third_name);
        const secondLastName = normalizeOptional(values.second_last_name);
        const thirdLastName = normalizeOptional(values.third_last_name);
        const email = normalizeOptional(values.email_primary);
        const documentType = normalizeOptional(values.document_type)?.toUpperCase() ?? null;
        const sex = parseSex(values.sex);
        const birthDate = parseBulkCsvIsoDate(values.birth_date);
        const bloodType = parseBloodType(values.blood_type);
        const address = normalizeOptional(values.residence_address);
        const country = normalizeOptional(values.residence_country);
        const department = normalizeOptional(values.residence_state);
        const city = normalizeOptional(values.residence_city);
        const notes = normalizeOptional(values.notes);
        const serviceSegments = parseServiceSegments(values.service_segments);

        if (email && !isValidEmail(email)) throw new Error("Email inválido.");
        if (!documentType || documentType === "DPI") {
          const parsed = dpiSchema.safeParse(documentNumber);
          if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Documento inválido.");
        }

        const acquisitionSourceId = await getOrCreateAcquisitionSourceId(values.acquisition_source, acquisitionSourceCache);
        const acquisitionDetailId = await getOrCreateAcquisitionDetailId(acquisitionSourceId, values.acquisition_detail, acquisitionDetailCache);
        const countryRow = await resolveCountryByToken(country, countryCache);

        const existing = await prisma.clientProfile.findFirst({
          where: { tenantId, type: ClientProfileType.PERSON, dpi: documentNumber },
          select: {
            id: true,
            type: true,
            firstName: true,
            middleName: true,
            lastName: true,
            secondLastName: true,
            companyName: true,
            tradeName: true,
            nit: true,
            dpi: true
          }
        });

        let clientId: string;
        if (existing) {
          if (dedupeMode === "skip") {
            duplicates.push({
              row: row.row,
              rowLabel: buildRowLabel(type, values),
              duplicateType: "EXACT_DUPLICATE",
              field: "document_number",
              value: documentNumber,
              existingId: existing.id,
              existingLabel: formatExistingLabel(type, existing),
              suggestedAction: "SKIP"
            });
            skipped += 1;
            processedRows += 1;
            continue;
          }

          const updatedClient = await prisma.clientProfile.update({
            where: { id: existing.id },
            data: {
              firstName,
              middleName,
              thirdName,
              lastName,
              secondLastName,
              thirdLastName,
              sex,
              dpi: documentNumber,
              phone,
              email,
              birthDate,
              bloodType,
              address,
              country,
              department,
              city,
              statusId: defaultStatusId,
              deletedAt: null,
              serviceSegments,
              acquisitionSourceId,
              acquisitionDetailOptionId: acquisitionDetailId
            },
            select: { id: true }
          });
          clientId = updatedClient.id;
          updated += 1;
        } else {
          const createdClient = await prisma.clientProfile.create({
            data: {
              tenantId,
              type: ClientProfileType.PERSON,
              firstName,
              middleName,
              thirdName,
              lastName,
              secondLastName,
              thirdLastName,
              sex,
              dpi: documentNumber,
              phone,
              email,
              birthDate,
              bloodType,
              address,
              country,
              department,
              city,
              statusId: defaultStatusId,
              serviceSegments,
              acquisitionSourceId,
              acquisitionDetailOptionId: acquisitionDetailId
            },
            select: { id: true }
          });
          clientId = createdClient.id;
          created += 1;
        }

        if (address || country || department || city) {
          await upsertPrimaryLocation({
            clientId,
            type: ClientLocationType.HOME,
            address: address || `${city || ""}${department ? `, ${department}` : ""}`.trim() || "N/D",
            country,
            department,
            city,
            postalCode: null,
            geoCountryId: countryRow?.id ?? null
          });
        }

        await upsertImportNote(clientId, notes);
      }

      if (type === ClientProfileType.COMPANY) {
        const legalName = normalizeRequired(values.legal_name, "Razón social requerida.");
        const tradeName = normalizeRequired(values.trade_name, "Nombre comercial requerido.");
        const nit = normalizeRequired(values.nit, "NIT requerido.");
        const address = normalizeRequired(values.address, "Dirección requerida.");
        const country = normalizeRequired(values.country, "País requerido.");
        const department = normalizeRequired(values.department, "Departamento requerido.");
        const city = normalizeRequired(values.city, "Ciudad requerida.");
        const email = normalizeOptional(values.email_primary);
        const billingEmail = normalizeOptional(values.billing_email);
        const phone = normalizeOptional(normalizeBulkCsvPhone(values.phone_primary));
        const website = normalizeOptional(values.website);
        const notes = normalizeOptional(values.notes);
        const postalCode = normalizeOptional(values.postal_code);

        if (email && !isValidEmail(email)) throw new Error("Email inválido.");
        if (billingEmail && !isValidEmail(billingEmail)) throw new Error("Correo de facturación inválido.");

        const sectorId = await getOrCreateCatalogItemId(
          ClientCatalogType.SECTOR,
          values.economic_activity_primary,
          catalogCache
        );
        const acquisitionSourceId = await getOrCreateAcquisitionSourceId(values.acquisition_source, acquisitionSourceCache);
        const acquisitionDetailId = await getOrCreateAcquisitionDetailId(acquisitionSourceId, values.acquisition_detail, acquisitionDetailCache);
        const countryRow = await resolveCountryByToken(country, countryCache);

        const existing = await prisma.clientProfile.findFirst({
          where: { tenantId, nit },
          select: {
            id: true,
            type: true,
            firstName: true,
            middleName: true,
            lastName: true,
            secondLastName: true,
            companyName: true,
            tradeName: true,
            nit: true,
            dpi: true
          }
        });

        let clientId: string;
        if (existing) {
          if (existing.type !== ClientProfileType.COMPANY) {
            throw new Error("El NIT ya pertenece a un cliente de otro tipo.");
          }

          if (dedupeMode === "skip") {
            duplicates.push({
              row: row.row,
              rowLabel: buildRowLabel(type, values),
              duplicateType: "EXACT_DUPLICATE",
              field: "nit",
              value: nit ?? "",
              existingId: existing.id,
              existingLabel: formatExistingLabel(type, existing),
              suggestedAction: "SKIP"
            });
            skipped += 1;
            processedRows += 1;
            continue;
          }

          const updatedClient = await prisma.clientProfile.update({
            where: { id: existing.id },
            data: {
              companyName: legalName,
              tradeName,
              nit,
              phone,
              email,
              address,
              city,
              department,
              country,
              sectorId,
              statusId: defaultStatusId,
              deletedAt: null,
              acquisitionSourceId,
              acquisitionDetailOptionId: acquisitionDetailId
            },
            select: { id: true }
          });
          clientId = updatedClient.id;
          updated += 1;
        } else {
          const createdClient = await prisma.clientProfile.create({
            data: {
              tenantId,
              type: ClientProfileType.COMPANY,
              companyName: legalName,
              tradeName,
              nit,
              phone,
              email,
              address,
              city,
              department,
              country,
              sectorId,
              statusId: defaultStatusId,
              acquisitionSourceId,
              acquisitionDetailOptionId: acquisitionDetailId
            },
            select: { id: true }
          });
          clientId = createdClient.id;
          created += 1;
        }

        await upsertPrimaryLocation({
          clientId,
          type: ClientLocationType.MAIN,
          address,
          country,
          department,
          city,
          postalCode,
          geoCountryId: countryRow?.id ?? null
        });

        await upsertCompanyCore({
          tenantId,
          clientProfileId: clientId,
          kind: CompanyKind.COMPANY,
          legalName,
          tradeName,
          taxId: nit,
          website,
          billingEmail,
          billingPhone: phone,
          notes,
          metadata: {
            legalForm: normalizeOptional(values.legal_form),
            legalFormOther: normalizeOptional(values.legal_form_other),
            companySizeRange: normalizeOptional(values.company_size_range),
            economicActivityPrimary: normalizeOptional(values.economic_activity_primary),
            economicActivitySecondary: splitBulkCsvList(values.economic_activity_secondary),
            preferredCurrencyCode: normalizeOptional(values.preferred_currency),
            acceptedCurrencyCodes: splitBulkCsvList(values.accepted_currencies)
          }
        });
      }

      if (type === ClientProfileType.INSTITUTION) {
        const legalName = normalizeRequired(values.legal_name, "Nombre legal requerido.");
        const institutionTypeName = normalizeRequired(values.institution_type, "Tipo de institución requerido.");
        const address = normalizeRequired(values.address, "Dirección requerida.");
        const country = normalizeRequired(values.country, "País requerido.");
        const department = normalizeRequired(values.department, "Departamento requerido.");
        const city = normalizeRequired(values.city, "Ciudad requerida.");

        const publicName = normalizeOptional(values.public_name);
        const nit = normalizeOptional(values.nit);
        const email = normalizeOptional(values.email_primary);
        const billingEmail = normalizeOptional(values.billing_email);
        const phone = normalizeOptional(normalizeBulkCsvPhone(values.phone_primary));
        const website = normalizeOptional(values.website);
        const notes = normalizeOptional(values.notes);
        const postalCode = normalizeOptional(values.postal_code);

        if (email && !isValidEmail(email)) throw new Error("Email inválido.");
        if (billingEmail && !isValidEmail(billingEmail)) throw new Error("Correo de facturación inválido.");

        const institutionTypeId = await getOrCreateCatalogItemId(
          ClientCatalogType.INSTITUTION_TYPE,
          institutionTypeName,
          catalogCache
        );
        const institutionCategoryId = await getOrCreateCatalogItemId(
          ClientCatalogType.INSTITUTION_CATEGORY,
          values.institution_category,
          catalogCache
        );
        const acquisitionSourceId = await getOrCreateAcquisitionSourceId(values.acquisition_source, acquisitionSourceCache);
        const acquisitionDetailId = await getOrCreateAcquisitionDetailId(acquisitionSourceId, values.acquisition_detail, acquisitionDetailCache);
        const countryRow = await resolveCountryByToken(country, countryCache);

        const institutionIsPublicFromFlag = parseBulkCsvBoolean(values.institution_is_public);
        const institutionSector = normalizeOptional(values.institution_sector)?.toLowerCase() ?? null;
        const institutionIsPublic =
          institutionIsPublicFromFlag !== null
            ? institutionIsPublicFromFlag
            : institutionSector === "publico"
              ? true
              : institutionSector === "privado"
                ? false
                : null;

        const existing = nit
          ? await prisma.clientProfile.findFirst({
              where: { tenantId, nit },
              select: {
                id: true,
                type: true,
                firstName: true,
                middleName: true,
                lastName: true,
                secondLastName: true,
                companyName: true,
                tradeName: true,
                nit: true,
                dpi: true
              }
            })
          : null;

        let clientId: string;
        if (existing) {
          if (existing.type !== ClientProfileType.INSTITUTION) {
            throw new Error("El NIT ya pertenece a un cliente de otro tipo.");
          }

          if (dedupeMode === "skip") {
            duplicates.push({
              row: row.row,
              rowLabel: buildRowLabel(type, values),
              duplicateType: "EXACT_DUPLICATE",
              field: "nit",
              value: nit ?? "",
              existingId: existing.id,
              existingLabel: formatExistingLabel(type, existing),
              suggestedAction: "SKIP"
            });
            skipped += 1;
            processedRows += 1;
            continue;
          }

          const updatedClient = await prisma.clientProfile.update({
            where: { id: existing.id },
            data: {
              companyName: legalName,
              tradeName: publicName,
              nit,
              phone,
              email,
              address,
              city,
              department,
              country,
              institutionTypeId,
              institutionCategoryId,
              institutionIsPublic,
              statusId: defaultStatusId,
              deletedAt: null,
              acquisitionSourceId,
              acquisitionDetailOptionId: acquisitionDetailId
            },
            select: { id: true }
          });
          clientId = updatedClient.id;
          updated += 1;
        } else {
          const createdClient = await prisma.clientProfile.create({
            data: {
              tenantId,
              type: ClientProfileType.INSTITUTION,
              companyName: legalName,
              tradeName: publicName,
              nit,
              phone,
              email,
              address,
              city,
              department,
              country,
              institutionTypeId,
              institutionCategoryId,
              institutionIsPublic,
              statusId: defaultStatusId,
              acquisitionSourceId,
              acquisitionDetailOptionId: acquisitionDetailId
            },
            select: { id: true }
          });
          clientId = createdClient.id;
          created += 1;
        }

        await upsertPrimaryLocation({
          clientId,
          type: ClientLocationType.MAIN,
          address,
          country,
          department,
          city,
          postalCode,
          geoCountryId: countryRow?.id ?? null
        });

        await upsertCompanyCore({
          tenantId,
          clientProfileId: clientId,
          kind: CompanyKind.INSTITUTION,
          legalName,
          tradeName: publicName,
          taxId: nit,
          website,
          billingEmail,
          billingPhone: phone,
          notes,
          metadata: {
            institutionCategory: normalizeOptional(values.institution_category),
            institutionSector: normalizeOptional(values.institution_sector),
            preferredCurrencyCode: normalizeOptional(values.preferred_currency),
            acceptedCurrencyCodes: splitBulkCsvList(values.accepted_currencies)
          }
        });
      }

      if (type === ClientProfileType.INSURER) {
        const legalName = normalizeRequired(values.legal_name, "Nombre legal requerido.");
        const insurerType = normalizeRequired(values.insurer_type, "Tipo de aseguradora requerido.");
        const nit = normalizeRequired(values.nit, "NIT requerido.");
        const address = normalizeRequired(values.address, "Dirección requerida.");
        const country = normalizeRequired(values.country, "País requerido.");
        const department = normalizeRequired(values.department, "Departamento requerido.");
        const city = normalizeRequired(values.city, "Ciudad requerida.");

        const tradeName = normalizeOptional(values.trade_name);
        const email = normalizeOptional(values.email_primary);
        const billingEmail = normalizeOptional(values.billing_email);
        const phone = normalizeOptional(normalizeBulkCsvPhone(values.phone_primary));
        const website = normalizeOptional(values.website);
        const notes = normalizeOptional(values.notes);
        const postalCode = normalizeOptional(values.postal_code);

        if (email && !isValidEmail(email)) throw new Error("Email inválido.");
        if (billingEmail && !isValidEmail(billingEmail)) throw new Error("Correo de facturación inválido.");

        const acquisitionSourceId = await getOrCreateAcquisitionSourceId(values.acquisition_source, acquisitionSourceCache);
        const acquisitionDetailId = await getOrCreateAcquisitionDetailId(acquisitionSourceId, values.acquisition_detail, acquisitionDetailCache);
        const countryRow = await resolveCountryByToken(country, countryCache);

        const existing = await prisma.clientProfile.findFirst({
          where: { tenantId, nit },
          select: {
            id: true,
            type: true,
            firstName: true,
            middleName: true,
            lastName: true,
            secondLastName: true,
            companyName: true,
            tradeName: true,
            nit: true,
            dpi: true
          }
        });

        let clientId: string;
        if (existing) {
          if (existing.type !== ClientProfileType.INSURER) {
            throw new Error("El NIT ya pertenece a un cliente de otro tipo.");
          }

          if (dedupeMode === "skip") {
            duplicates.push({
              row: row.row,
              rowLabel: buildRowLabel(type, values),
              duplicateType: "EXACT_DUPLICATE",
              field: "nit",
              value: nit,
              existingId: existing.id,
              existingLabel: formatExistingLabel(type, existing),
              suggestedAction: "SKIP"
            });
            skipped += 1;
            processedRows += 1;
            continue;
          }

          const updatedClient = await prisma.clientProfile.update({
            where: { id: existing.id },
            data: {
              companyName: legalName,
              tradeName,
              nit,
              phone,
              email,
              address,
              city,
              department,
              country,
              statusId: defaultStatusId,
              deletedAt: null,
              acquisitionSourceId,
              acquisitionDetailOptionId: acquisitionDetailId
            },
            select: { id: true }
          });
          clientId = updatedClient.id;
          updated += 1;
        } else {
          const createdClient = await prisma.clientProfile.create({
            data: {
              tenantId,
              type: ClientProfileType.INSURER,
              companyName: legalName,
              tradeName,
              nit,
              phone,
              email,
              address,
              city,
              department,
              country,
              statusId: defaultStatusId,
              acquisitionSourceId,
              acquisitionDetailOptionId: acquisitionDetailId
            },
            select: { id: true }
          });
          clientId = createdClient.id;
          created += 1;
        }

        await upsertPrimaryLocation({
          clientId,
          type: ClientLocationType.MAIN,
          address,
          country,
          department,
          city,
          postalCode,
          geoCountryId: countryRow?.id ?? null
        });

        await upsertCompanyCore({
          tenantId,
          clientProfileId: clientId,
          kind: CompanyKind.INSURER,
          legalName,
          tradeName,
          taxId: nit,
          website,
          billingEmail,
          billingPhone: phone,
          notes,
          metadata: {
            insurerType,
            insurerScope: normalizeOptional(values.insurer_scope),
            insurerCode: normalizeOptional(values.insurer_code),
            insurerLinePrimary: normalizeOptional(values.insurer_line_primary),
            insurerLineSecondary: splitBulkCsvList(values.insurer_line_secondary),
            authorizationPortalUrl: normalizeOptional(values.authorization_portal_url),
            authorizationEmail: normalizeOptional(values.authorization_email),
            claimsEmail: normalizeOptional(values.claims_email),
            providerSupportPhone: normalizeOptional(values.provider_support_phone),
            providerSupportWhatsApp: normalizeOptional(values.provider_support_whatsapp),
            preferredCurrencyCode: normalizeOptional(values.preferred_currency),
            acceptedCurrencyCodes: splitBulkCsvList(values.accepted_currencies)
          }
        });
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
    skipped,
    errors: errors.length,
    errorsCsv: buildErrorCsv(errors),
    errorsPreview: errors.slice(0, 25),
    duplicates: duplicates.length,
    duplicatesCsv: buildDuplicatesCsv(duplicates),
    duplicatesPreview: duplicates.slice(0, 50)
  };
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;
  if (!auth.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const modeRaw = String(formData.get("mode") || "analyze").toLowerCase();
  const mode = modeRaw === "process" ? "process" : "analyze";
  const canAnalyze = canAnalyzeClientImport(auth.user);
  const canProcess = canProcessClientImport(auth.user);

  if (mode === "analyze" && !canAnalyze) {
    await recordClientsAccessBlocked({
      user: auth.user,
      route: "/api/admin/clientes/import/csv",
      capability: "CLIENTS_IMPORT_ANALYZE",
      resourceType: "bulk_import"
    });
    return NextResponse.json({ ok: false, error: "No autorizado para analizar importaciones." }, { status: 403 });
  }
  if (mode === "process" && !canProcess) {
    await recordClientsAccessBlocked({
      user: auth.user,
      route: "/api/admin/clientes/import/csv",
      capability: "CLIENTS_IMPORT_PROCESS",
      resourceType: "bulk_import"
    });
    return NextResponse.json({ ok: false, error: "No autorizado para procesar importaciones." }, { status: 403 });
  }

  const tenantId = tenantIdFromUser(auth.user);

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

  const schema = getClientBulkSchema(type);
  const suggestedMapping = buildClientBulkSuggestedMapping(type, parsed.columns);
  const mapping = resolveClientBulkMapping(type, (formData.get("mapping") as string | null) || null, suggestedMapping);
  const missingRequired = getClientBulkMissingRequiredColumns(type, mapping);

  const mappedColumns = new Set(Object.values(mapping));
  const ignoredColumns = parsed.columns.filter((columnName) => !mappedColumns.has(columnName));
  const duplicateConflicts = await analyzeRowsForDuplicateConflicts({
    tenantId,
    type,
    rows: parsed.rows,
    mapping
  });

  if (mode === "analyze") {
    return NextResponse.json({
      ok: true,
      requiresMapping: missingRequired.length > 0,
      availableColumns: parsed.columns,
      fields: schema.columns.map((columnDef) => ({
        key: columnDef.key,
        label: `${columnDef.headerDisplay}${columnDef.required ? "*" : ""}`,
        required: Boolean(columnDef.required),
        parser: columnDef.parser,
        target: columnDef.target
      })),
      suggestedMapping,
      previewRows: parsed.rows.length,
      ignoredColumns,
      duplicateConflicts,
      duplicatesCsv: buildDuplicatesCsv(duplicateConflicts)
    });
  }

  if (missingRequired.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `Faltan encabezados requeridos: ${missingRequired
          .map((columnDef) => `${columnDef.headerDisplay}*`)
          .join(", ")}`
      },
      { status: 400 }
    );
  }

  const dedupeModeRaw = String(formData.get("dedupeMode") || "skip").toLowerCase();
  const allowUpdate = canProcessClientImportUpdate(auth.user) && dedupeModeRaw === "update";
  const dedupeMode: "skip" | "update" = allowUpdate ? "update" : "skip";

  try {
    const result = await processRows({ tenantId, type, rows: parsed.rows, mapping, dedupeMode });
    return NextResponse.json({
      ok: true,
      summary: {
        totalRows: result.totalRows,
        processedRows: result.processedRows,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
        duplicates: result.duplicates
      },
      errorsCsv: result.errorsCsv,
      errorsPreview: result.errorsPreview,
      duplicatesCsv: result.duplicatesCsv,
      duplicatesPreview: result.duplicatesPreview,
      dedupeMode,
      ignoredColumns
    });
  } catch (err) {
    const maybePrisma = err as Prisma.PrismaClientKnownRequestError;
    if (maybePrisma?.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Conflicto de unicidad detectado durante la importación." }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: (err as Error)?.message || "No se pudo procesar la importación." }, { status: 500 });
  }
}
