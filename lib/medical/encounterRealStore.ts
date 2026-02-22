import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import type {
  EncounterOrderRequestItem,
  EncounterReconsulta,
  EncounterResult,
  EncounterResultValueRow,
  EncounterRichTextValue,
  EncounterSupplyItem
} from "@/components/medical/encounter/types";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";

export type EncounterRecord = {
  id: string;
  patientId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  closedById: string | null;
};

export type EncounterRecordLookup =
  | { source: "db"; record: EncounterRecord | null }
  | { source: "missing_table"; record: null };

export type CloseEncounterDbResult =
  | { ok: true; closedAt: string }
  | { ok: false; reason: "missing_table" | "not_found" };

export type EncounterSnapshotDocument = {
  id: string;
  encounterId: string;
  kind: "snapshot";
  title: string;
  storageRef: string | null;
  createdAt: string;
  snapshotVersion: number | null;
};

type ReconsultaInput = {
  encounterId: string;
  type: "reconsulta_resultados" | "manual_evolution";
  sourceResultId: string | null;
  sourceResultTitle: string | null;
  entryTitle: string;
  noteRich: EncounterRichTextValue;
  interpretation: string;
  conduct: string;
  therapeuticAdjustment: string;
  authorId: string | null;
  authorName: string;
};

type SupplyInput = {
  encounterId: string;
  source: "inventory" | "manual";
  inventoryItemId: string | null;
  sku: string | null;
  name: string;
  unit: string | null;
  quantity: number;
  unitPrice: number | null;
  notes: string | null;
  createdByName: string;
};

type OrderRequestInput = {
  encounterId: string;
  modality: "LAB" | "RX" | "USG";
  assignedToService: "LAB" | "RX" | "USG" | null;
  serviceId: string | null;
  serviceCode: string | null;
  title: string;
  quantity: number;
  notes: string | null;
  priority: "routine" | "urgent";
  status: "ordered" | "in_progress" | "completed" | "cancelled";
  createdByName: string;
  updatedAtIso?: string;
  updatedByName?: string | null;
};

type UpdateOrderRequestInput = {
  encounterId?: string;
  orderRequestId: string;
  assignedToService?: "LAB" | "RX" | "USG" | null;
  notes?: string | null;
  priority?: "routine" | "urgent";
  status?: "ordered" | "in_progress" | "completed" | "cancelled";
  updatedByName?: string | null;
  updatedAtIso?: string;
};

type UpsertOrderResultInput = {
  orderRequestId: string;
  pdfUrl?: string | null;
  imageUrls?: string[];
  values?: EncounterResultValueRow[];
  actorName: string | null;
  markReady?: boolean;
};

export type EncounterWorklistItem = {
  orderId: string;
  encounterId: string;
  patientName: string;
  serviceTitle: string;
  priority: "routine" | "urgent";
  status: "ordered" | "in_progress" | "completed" | "cancelled";
  modality: "LAB" | "RX" | "USG";
  createdAt: string;
  updatedAt: string;
};

const globalForMedical = globalThis as unknown as {
  encounterReconsultaMemory?: Map<string, EncounterReconsulta[]>;
  encounterSuppliesMemory?: Map<string, EncounterSupplyItem[]>;
  encounterOrderRequestsMemory?: Map<string, EncounterOrderRequestItem[]>;
  encounterResultsMemory?: Map<string, EncounterResult[]>;
};

function memoryReconsultations() {
  if (!globalForMedical.encounterReconsultaMemory) {
    globalForMedical.encounterReconsultaMemory = new Map();
  }
  return globalForMedical.encounterReconsultaMemory;
}

function memorySupplies() {
  if (!globalForMedical.encounterSuppliesMemory) {
    globalForMedical.encounterSuppliesMemory = new Map();
  }
  return globalForMedical.encounterSuppliesMemory;
}

function memoryOrderRequests() {
  if (!globalForMedical.encounterOrderRequestsMemory) {
    globalForMedical.encounterOrderRequestsMemory = new Map();
  }
  return globalForMedical.encounterOrderRequestsMemory;
}

function memoryResults() {
  if (!globalForMedical.encounterResultsMemory) {
    globalForMedical.encounterResultsMemory = new Map();
  }
  return globalForMedical.encounterResultsMemory;
}

function stripHtmlToText(raw: string) {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toStringArray(raw: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
}

function toResultValues(raw: Prisma.JsonValue | null): EncounterResultValueRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      if (typeof row.parameter !== "string" || typeof row.value !== "string") return null;
      return {
        parameter: row.parameter,
        value: row.value,
        range: typeof row.range === "string" ? row.range : null,
        flag: typeof row.flag === "string" ? row.flag : null
      } satisfies EncounterResultValueRow;
    })
    .filter((item): item is EncounterResultValueRow => Boolean(item));
}

function toNullableNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) return null;
  return value;
}

function isMissingColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();
  return message.includes("column") && message.includes("does not exist");
}

function normalizeOrderStatus(raw: string): EncounterOrderRequestItem["status"] {
  if (raw === "in_progress" || raw === "completed" || raw === "cancelled") return raw;
  return "ordered";
}

function normalizeOrderModality(raw: string): EncounterOrderRequestItem["modality"] {
  if (raw === "RX" || raw === "USG") return raw;
  return "LAB";
}

function mapOrderRow(row: {
  id: string;
  encounterId: string;
  modality: string;
  assignedToService?: string | null;
  serviceId: string | null;
  serviceCode: string | null;
  title: string;
  quantity: number;
  notes: string | null;
  priority: string;
  status: string;
  createdAt: Date;
  createdByName: string | null;
  updatedAt?: Date;
  updatedByName?: string | null;
}): EncounterOrderRequestItem {
  return {
    id: row.id,
    encounterId: row.encounterId,
    modality: normalizeOrderModality(row.modality),
    assignedToService:
      row.assignedToService === "LAB" || row.assignedToService === "RX" || row.assignedToService === "USG"
        ? row.assignedToService
        : null,
    serviceId: row.serviceId,
    serviceCode: row.serviceCode,
    title: row.title,
    quantity: Number.isFinite(row.quantity) ? Math.max(1, Math.round(row.quantity)) : 1,
    notes: row.notes,
    priority: row.priority === "urgent" ? "urgent" : "routine",
    status: normalizeOrderStatus(row.status),
    createdAt: row.createdAt.toISOString(),
    createdByName: row.createdByName || "Médico responsable",
    updatedAt: (row.updatedAt || row.createdAt).toISOString(),
    updatedByName: row.updatedByName || null
  };
}

async function withMissingTableFallback<T>(context: string, dbOperation: () => Promise<T>, fallbackOperation: () => T): Promise<T> {
  try {
    return await dbOperation();
  } catch (error) {
    if (!isPrismaMissingTableError(error)) throw error;
    warnDevMissingTable(context, error);
    return fallbackOperation();
  }
}

export async function getEncounterRecord(encounterId: string): Promise<EncounterRecord | null> {
  const lookup = await getEncounterRecordLookup(encounterId);
  return lookup.record;
}

export async function getEncounterRecordLookup(encounterId: string): Promise<EncounterRecordLookup> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        patientId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        closedAt: Date | null;
        closedById: string | null;
      }>
    >`SELECT id, "patientId", status, "createdAt", "updatedAt", "closedAt", "closedById" FROM "Encounter" WHERE id = ${encounterId} LIMIT 1`;
    const row = rows[0];
    if (!row) return { source: "db", record: null };
    return {
      source: "db",
      record: {
        id: row.id,
        patientId: row.patientId,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        closedAt: row.closedAt ? row.closedAt.toISOString() : null,
        closedById: row.closedById
      }
    };
  } catch (error) {
    if (!isPrismaMissingTableError(error)) throw error;
    warnDevMissingTable("medical-encounter", error);
    return { source: "missing_table", record: null };
  }
}

export async function listEncounterResults(encounterId: string): Promise<EncounterResult[]> {
  return withMissingTableFallback(
    "medical-encounter-results",
    async () => {
      const rows = await prisma.$queryRaw<
        Array<{
          id: string;
          title: string;
          type: string;
          status: string;
          performedAt: Date;
          pdfUrl: string | null;
          imageUrls: Prisma.JsonValue | null;
          values: Prisma.JsonValue | null;
        }>
      >`SELECT id, title, type, status, "performedAt", "pdfUrl", "imageUrls", "values"
         FROM "EncounterResult"
         WHERE "encounterId" = ${encounterId}
         ORDER BY "performedAt" DESC`;

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        type: row.type as EncounterResult["type"],
        status: row.status as EncounterResult["status"],
        performedAt: row.performedAt.toISOString(),
        pdfUrl: row.pdfUrl,
        imageUrls: toStringArray(row.imageUrls),
        values: toResultValues(row.values),
        sourceOrderRequestId: null
      }));
    },
    () => memoryResults().get(encounterId) || []
  );
}

export async function listEncounterReconsultations(encounterId: string): Promise<EncounterReconsulta[]> {
  return withMissingTableFallback(
    "medical-encounter-reconsultations",
    async () => {
      const rows = await prisma.$queryRaw<
        Array<{
          id: string;
          encounterId: string;
          type: string;
          sourceResultId: string | null;
          sourceResultTitle: string | null;
          entryTitle: string;
          noteRichJson: Prisma.JsonValue | null;
          noteRichHtml: string;
          interpretation: string;
          conduct: string;
          therapeuticAdjustment: string;
          createdAt: Date;
          authorId: string | null;
          authorName: string | null;
        }>
      >`SELECT id, "encounterId", type, "sourceResultId", "sourceResultTitle", "entryTitle", "noteRichJson", "noteRichHtml", interpretation, conduct, "therapeuticAdjustment", "createdAt", "authorId", "authorName" FROM "EncounterReconsulta" WHERE "encounterId" = ${encounterId} ORDER BY "createdAt" DESC`;

      return rows.map((row) => {
        const noteText = stripHtmlToText(row.noteRichHtml || "") || row.interpretation || "";
        const noteRichJson =
          row.noteRichJson && typeof row.noteRichJson === "object" && !Array.isArray(row.noteRichJson)
            ? (row.noteRichJson as Record<string, unknown>)
            : {};
        return {
          id: row.id,
          parentEncounterId: row.encounterId,
          type: row.type as EncounterReconsulta["type"],
          sourceResultId: row.sourceResultId,
          sourceResultTitle: row.sourceResultTitle,
          createdAt: row.createdAt.toISOString(),
          authorName: row.authorName || row.authorId || "Médico responsable",
          interpretation: row.interpretation,
          conduct: row.conduct,
          therapeuticAdjustment: row.therapeuticAdjustment,
          noteRich: {
            json: noteRichJson,
            html: row.noteRichHtml || "",
            text: noteText
          },
          entryTitle: row.entryTitle
        } satisfies EncounterReconsulta;
      });
    },
    () => memoryReconsultations().get(encounterId) || []
  );
}

export async function listEncounterSupplies(encounterId: string): Promise<EncounterSupplyItem[]> {
  return withMissingTableFallback(
    "medical-encounter-supplies",
    async () => {
      const rows = await prisma.$queryRaw<
        Array<{
          id: string;
          encounterId: string;
          source: string;
          inventoryItemId: string | null;
          sku: string | null;
          name: string;
          unit: string | null;
          quantity: number;
          unitPrice: Prisma.Decimal | number | string | null;
          notes: string | null;
          createdAt: Date;
          createdByName: string | null;
        }>
      >`SELECT id, "encounterId", source, "inventoryItemId", sku, name, unit, quantity, "unitPrice", notes, "createdAt", "createdByName"
         FROM "EncounterSupply"
         WHERE "encounterId" = ${encounterId}
         ORDER BY "createdAt" DESC`;

      return rows.map((row) => ({
        id: row.id,
        encounterId: row.encounterId,
        source: row.source === "manual" ? "manual" : "inventory",
        inventoryItemId: row.inventoryItemId,
        sku: row.sku,
        name: row.name,
        unit: row.unit,
        quantity: Number.isFinite(row.quantity) ? row.quantity : 1,
        unitPrice: toNullableNumber(row.unitPrice),
        notes: row.notes,
        createdAt: row.createdAt.toISOString(),
        createdByName: row.createdByName || "Médico responsable"
      }));
    },
    () => memorySupplies().get(encounterId) || []
  );
}

export async function listEncounterOrderRequests(encounterId: string): Promise<EncounterOrderRequestItem[]> {
  return withMissingTableFallback(
    "medical-encounter-order-requests",
    async () => {
      try {
        const rows = await prisma.$queryRaw<
          Array<{
            id: string;
            encounterId: string;
            modality: string;
            assignedToService: string | null;
            serviceId: string | null;
            serviceCode: string | null;
            title: string;
            quantity: number;
            notes: string | null;
            priority: string;
            status: string;
            createdAt: Date;
            createdByName: string | null;
            updatedAt: Date;
            updatedByName: string | null;
          }>
        >`SELECT id, "encounterId", modality, "assignedToService", "serviceId", "serviceCode", title, quantity, notes, priority, status, "createdAt", "createdByName", "updatedAt", "updatedByName"
           FROM "EncounterOrderRequest"
           WHERE "encounterId" = ${encounterId}
           ORDER BY "createdAt" DESC`;
        return rows.map((row) => mapOrderRow(row));
      } catch (error) {
        if (!isMissingColumnError(error)) throw error;
        const legacyRows = await prisma.$queryRaw<
          Array<{
            id: string;
            encounterId: string;
            modality: string;
            serviceId: string | null;
            serviceCode: string | null;
            title: string;
            quantity: number;
            notes: string | null;
            priority: string;
            status: string;
            createdAt: Date;
            createdByName: string | null;
          }>
        >`SELECT id, "encounterId", modality, "serviceId", "serviceCode", title, quantity, notes, priority, status, "createdAt", "createdByName"
           FROM "EncounterOrderRequest"
           WHERE "encounterId" = ${encounterId}
           ORDER BY "createdAt" DESC`;
        return legacyRows.map((row) => mapOrderRow(row));
      }
    },
    () => memoryOrderRequests().get(encounterId) || []
  );
}

async function listEncounterOrderRequestsByOrderId(
  orderRequestId: string,
  encounterId?: string
): Promise<EncounterOrderRequestItem[]> {
  try {
    if (encounterId) {
      const rows = await prisma.$queryRaw<
        Array<{
          id: string;
          encounterId: string;
          modality: string;
          assignedToService: string | null;
          serviceId: string | null;
          serviceCode: string | null;
          title: string;
          quantity: number;
          notes: string | null;
          priority: string;
          status: string;
          createdAt: Date;
          createdByName: string | null;
          updatedAt: Date;
          updatedByName: string | null;
        }>
      >`SELECT id, "encounterId", modality, "assignedToService", "serviceId", "serviceCode", title, quantity, notes, priority, status, "createdAt", "createdByName", "updatedAt", "updatedByName"
         FROM "EncounterOrderRequest"
         WHERE id = ${orderRequestId} AND "encounterId" = ${encounterId}
         LIMIT 1`;
      return rows.map((row) => mapOrderRow(row));
    }

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        encounterId: string;
        modality: string;
        assignedToService: string | null;
        serviceId: string | null;
        serviceCode: string | null;
        title: string;
        quantity: number;
        notes: string | null;
        priority: string;
        status: string;
        createdAt: Date;
        createdByName: string | null;
        updatedAt: Date;
        updatedByName: string | null;
      }>
    >`SELECT id, "encounterId", modality, "assignedToService", "serviceId", "serviceCode", title, quantity, notes, priority, status, "createdAt", "createdByName", "updatedAt", "updatedByName"
       FROM "EncounterOrderRequest"
       WHERE id = ${orderRequestId}
       LIMIT 1`;
    return rows.map((row) => mapOrderRow(row));
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;

    if (encounterId) {
      const rows = await prisma.$queryRaw<
        Array<{
          id: string;
          encounterId: string;
          modality: string;
          serviceId: string | null;
          serviceCode: string | null;
          title: string;
          quantity: number;
          notes: string | null;
          priority: string;
          status: string;
          createdAt: Date;
          createdByName: string | null;
        }>
      >`SELECT id, "encounterId", modality, "serviceId", "serviceCode", title, quantity, notes, priority, status, "createdAt", "createdByName"
         FROM "EncounterOrderRequest"
         WHERE id = ${orderRequestId} AND "encounterId" = ${encounterId}
         LIMIT 1`;
      return rows.map((row) => mapOrderRow(row));
    }
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        encounterId: string;
        modality: string;
        serviceId: string | null;
        serviceCode: string | null;
        title: string;
        quantity: number;
        notes: string | null;
        priority: string;
        status: string;
        createdAt: Date;
        createdByName: string | null;
      }>
    >`SELECT id, "encounterId", modality, "serviceId", "serviceCode", title, quantity, notes, priority, status, "createdAt", "createdByName"
       FROM "EncounterOrderRequest"
       WHERE id = ${orderRequestId}
       LIMIT 1`;
    return rows.map((row) => mapOrderRow(row));
  }
}

export async function listEncounterDocuments(encounterId: string): Promise<
  Array<{
    id: string;
    encounterId: string;
    kind: "snapshot" | "pdf";
    title: string;
    storageRef: string | null;
    createdAt: string;
    snapshotVersion: number | null;
  }>
> {
  return withMissingTableFallback(
    "medical-encounter-documents",
    async () => {
      const rows = await prisma.$queryRaw<
        Array<{
          id: string;
          encounterId: string;
          kind: string;
          title: string;
          storageRef: string | null;
          createdAt: Date;
        }>
      >`SELECT id, "encounterId", kind, title, "storageRef", "createdAt" FROM "EncounterDocument" WHERE "encounterId" = ${encounterId} ORDER BY "createdAt" DESC`;
      return rows.map((row) => ({
        id: row.id,
        encounterId: row.encounterId,
        kind: row.kind === "snapshot" ? "snapshot" : "pdf",
        title: row.title,
        storageRef: row.storageRef,
        createdAt: row.createdAt.toISOString(),
        snapshotVersion: null
      }));
    },
    () => []
  );
}

export async function closeEncounterInDb(
  encounterId: string,
  actorUserId: string | null,
  signedAtIso: string
): Promise<CloseEncounterDbResult> {
  const signedAt = new Date(signedAtIso);
  try {
    const affectedRaw = await prisma.$executeRaw`
      UPDATE "Encounter"
      SET status = 'closed',
          "closedAt" = ${signedAt},
          "closedById" = ${actorUserId},
          "updatedAt" = ${signedAt}
      WHERE id = ${encounterId}
    `;

    const affected = typeof affectedRaw === "number" ? affectedRaw : Number(affectedRaw || 0);
    if (!Number.isFinite(affected) || affected < 1) {
      return { ok: false, reason: "not_found" };
    }
    return { ok: true, closedAt: signedAt.toISOString() };
  } catch (error) {
    if (!isPrismaMissingTableError(error)) throw error;
    warnDevMissingTable("medical-encounter-close", error);
    return { ok: false, reason: "missing_table" };
  }
}

export async function upsertEncounterDocumentSnapshot(params: {
  encounterId: string;
  storageRef: string;
  title: string;
  createdAtIso: string;
  snapshotVersion: number | null;
}): Promise<EncounterSnapshotDocument | null> {
  const kind = "snapshot";
  return withMissingTableFallback(
    "medical-encounter-documents",
    async () => {
      const existingRows = await prisma.$queryRaw<
        Array<{
          id: string;
          encounterId: string;
          kind: string;
          title: string;
          storageRef: string | null;
          createdAt: Date;
        }>
      >`SELECT id, "encounterId", kind, title, "storageRef", "createdAt"
         FROM "EncounterDocument"
         WHERE "encounterId" = ${params.encounterId} AND kind = ${kind}
         ORDER BY "createdAt" DESC
         LIMIT 1`;

      const existing = existingRows[0];
      if (existing) {
        return {
          id: existing.id,
          encounterId: existing.encounterId,
          kind: "snapshot",
          title: existing.title,
          storageRef: existing.storageRef,
          createdAt: existing.createdAt.toISOString(),
          snapshotVersion: params.snapshotVersion
        };
      }

      const id = randomUUID();
      const createdAt = new Date(params.createdAtIso);

      await prisma.$executeRaw`
        INSERT INTO "EncounterDocument" (id, "encounterId", kind, title, "storageRef", "createdAt")
        VALUES (${id}, ${params.encounterId}, ${kind}, ${params.title}, ${params.storageRef}, ${createdAt})
      `;

      return {
        id,
        encounterId: params.encounterId,
        kind: "snapshot",
        title: params.title,
        storageRef: params.storageRef,
        createdAt: createdAt.toISOString(),
        snapshotVersion: params.snapshotVersion
      };
    },
    () => null
  );
}

export async function appendEncounterReconsulta(input: ReconsultaInput): Promise<EncounterReconsulta> {
  const now = new Date();
  const entry: EncounterReconsulta = {
    id: randomUUID(),
    parentEncounterId: input.encounterId,
    type: input.type,
    sourceResultId: input.sourceResultId,
    sourceResultTitle: input.sourceResultTitle,
    createdAt: now.toISOString(),
    authorName: input.authorName,
    interpretation: input.interpretation,
    conduct: input.conduct,
    therapeuticAdjustment: input.therapeuticAdjustment,
    noteRich: input.noteRich,
    entryTitle: input.entryTitle
  };

  return withMissingTableFallback(
    "medical-encounter-reconsultations",
    async () => {
      await prisma.$executeRaw`
        INSERT INTO "EncounterReconsulta"
          (id, "encounterId", type, "sourceResultId", "sourceResultTitle", "entryTitle", "noteRichJson", "noteRichHtml", interpretation, conduct, "therapeuticAdjustment", "createdAt", "authorId", "authorName")
        VALUES
          (${entry.id}, ${input.encounterId}, ${input.type}, ${input.sourceResultId}, ${input.sourceResultTitle}, ${input.entryTitle}, ${input.noteRich.json as unknown as Prisma.JsonValue}, ${input.noteRich.html}, ${input.interpretation}, ${input.conduct}, ${input.therapeuticAdjustment}, ${now}, ${input.authorId}, ${input.authorName})
      `;
      return entry;
    },
    () => {
      const memory = memoryReconsultations();
      const list = memory.get(input.encounterId) || [];
      memory.set(input.encounterId, [entry, ...list]);
      return entry;
    }
  );
}

export async function appendEncounterSupply(input: SupplyInput): Promise<EncounterSupplyItem> {
  const now = new Date();
  const entry: EncounterSupplyItem = {
    id: randomUUID(),
    encounterId: input.encounterId,
    source: input.source,
    inventoryItemId: input.inventoryItemId,
    sku: input.sku,
    name: input.name,
    unit: input.unit,
    quantity: Math.max(1, Math.round(input.quantity)),
    unitPrice: input.unitPrice,
    notes: input.notes,
    createdAt: now.toISOString(),
    createdByName: input.createdByName
  };

  return withMissingTableFallback(
    "medical-encounter-supplies",
    async () => {
      await prisma.$executeRaw`
        INSERT INTO "EncounterSupply"
          (id, "encounterId", source, "inventoryItemId", sku, name, unit, quantity, "unitPrice", notes, "createdAt", "createdByName")
        VALUES
          (${entry.id}, ${entry.encounterId}, ${entry.source}, ${entry.inventoryItemId}, ${entry.sku}, ${entry.name}, ${entry.unit}, ${entry.quantity}, ${entry.unitPrice}, ${entry.notes}, ${now}, ${entry.createdByName})
      `;
      return entry;
    },
    () => {
      const memory = memorySupplies();
      const list = memory.get(input.encounterId) || [];
      memory.set(input.encounterId, [entry, ...list]);
      return entry;
    }
  );
}

export async function appendEncounterOrderRequest(input: OrderRequestInput): Promise<EncounterOrderRequestItem> {
  const now = input.updatedAtIso ? new Date(input.updatedAtIso) : new Date();
  const updatedByName = input.updatedByName || input.createdByName;
  const entry: EncounterOrderRequestItem = {
    id: randomUUID(),
    encounterId: input.encounterId,
    modality: input.modality,
    assignedToService: input.assignedToService,
    serviceId: input.serviceId,
    serviceCode: input.serviceCode,
    title: input.title,
    quantity: Math.max(1, Math.round(input.quantity)),
    notes: input.notes,
    priority: input.priority,
    status: input.status,
    createdAt: now.toISOString(),
    createdByName: input.createdByName,
    updatedAt: now.toISOString(),
    updatedByName
  };

  return withMissingTableFallback(
    "medical-encounter-order-requests",
    async () => {
      try {
        await prisma.$executeRaw`
          INSERT INTO "EncounterOrderRequest"
            (id, "encounterId", modality, "assignedToService", "serviceId", "serviceCode", title, quantity, notes, priority, status, "createdAt", "createdByName", "updatedAt", "updatedByName")
          VALUES
            (${entry.id}, ${entry.encounterId}, ${entry.modality}, ${entry.assignedToService}, ${entry.serviceId}, ${entry.serviceCode}, ${entry.title}, ${entry.quantity}, ${entry.notes}, ${entry.priority}, ${entry.status}, ${now}, ${entry.createdByName}, ${now}, ${entry.updatedByName})
        `;
      } catch (error) {
        if (!isMissingColumnError(error)) throw error;
        await prisma.$executeRaw`
          INSERT INTO "EncounterOrderRequest"
            (id, "encounterId", modality, "serviceId", "serviceCode", title, quantity, notes, priority, status, "createdAt", "createdByName")
          VALUES
            (${entry.id}, ${entry.encounterId}, ${entry.modality}, ${entry.serviceId}, ${entry.serviceCode}, ${entry.title}, ${entry.quantity}, ${entry.notes}, ${entry.priority}, ${entry.status}, ${now}, ${entry.createdByName})
        `;
      }
      return entry;
    },
    () => {
      const memory = memoryOrderRequests();
      const list = memory.get(input.encounterId) || [];
      memory.set(input.encounterId, [entry, ...list]);
      return entry;
    }
  );
}

export async function deleteEncounterSupply(encounterId: string, supplyId: string): Promise<boolean> {
  return withMissingTableFallback(
    "medical-encounter-supplies",
    async () => {
      const affectedRaw = await prisma.$executeRaw`
        DELETE FROM "EncounterSupply"
        WHERE id = ${supplyId} AND "encounterId" = ${encounterId}
      `;
      const affected = typeof affectedRaw === "number" ? affectedRaw : Number(affectedRaw || 0);
      return Number.isFinite(affected) && affected > 0;
    },
    () => {
      const memory = memorySupplies();
      const list = memory.get(encounterId) || [];
      const next = list.filter((item) => item.id !== supplyId);
      memory.set(encounterId, next);
      return next.length !== list.length;
    }
  );
}

export async function deleteEncounterOrderRequest(encounterId: string, orderRequestId: string): Promise<boolean> {
  return withMissingTableFallback(
    "medical-encounter-order-requests",
    async () => {
      const affectedRaw = await prisma.$executeRaw`
        DELETE FROM "EncounterOrderRequest"
        WHERE id = ${orderRequestId} AND "encounterId" = ${encounterId}
      `;
      const affected = typeof affectedRaw === "number" ? affectedRaw : Number(affectedRaw || 0);
      return Number.isFinite(affected) && affected > 0;
    },
    () => {
      const memory = memoryOrderRequests();
      const list = memory.get(encounterId) || [];
      const next = list.filter((item) => item.id !== orderRequestId);
      memory.set(encounterId, next);
      return next.length !== list.length;
    }
  );
}

export async function updateEncounterOrderRequest(input: UpdateOrderRequestInput): Promise<EncounterOrderRequestItem | null> {
  return withMissingTableFallback(
    "medical-encounter-order-requests",
    async () => {
      const hasNotes = input.notes !== undefined;
      const hasPriority = input.priority !== undefined;
      const hasStatus = input.status !== undefined;
      const hasAssignedToService = input.assignedToService !== undefined;
      const now = input.updatedAtIso ? new Date(input.updatedAtIso) : new Date();
      const applyWhereUpdate = async (legacy: boolean) => {
        if (legacy) {
          if (input.encounterId) {
            await prisma.$executeRaw`
              UPDATE "EncounterOrderRequest"
              SET notes = CASE WHEN ${hasNotes} THEN ${input.notes ?? null} ELSE notes END,
                  priority = CASE WHEN ${hasPriority} THEN ${input.priority ?? null} ELSE priority END,
                  status = CASE WHEN ${hasStatus} THEN ${input.status ?? null} ELSE status END
              WHERE id = ${input.orderRequestId} AND "encounterId" = ${input.encounterId}
            `;
            return;
          }
          await prisma.$executeRaw`
            UPDATE "EncounterOrderRequest"
            SET notes = CASE WHEN ${hasNotes} THEN ${input.notes ?? null} ELSE notes END,
                priority = CASE WHEN ${hasPriority} THEN ${input.priority ?? null} ELSE priority END,
                status = CASE WHEN ${hasStatus} THEN ${input.status ?? null} ELSE status END
            WHERE id = ${input.orderRequestId}
          `;
          return;
        }

        if (input.encounterId) {
          await prisma.$executeRaw`
            UPDATE "EncounterOrderRequest"
            SET notes = CASE WHEN ${hasNotes} THEN ${input.notes ?? null} ELSE notes END,
                priority = CASE WHEN ${hasPriority} THEN ${input.priority ?? null} ELSE priority END,
                status = CASE WHEN ${hasStatus} THEN ${input.status ?? null} ELSE status END,
                "assignedToService" = CASE WHEN ${hasAssignedToService} THEN ${input.assignedToService ?? null} ELSE "assignedToService" END,
                "updatedAt" = ${now},
                "updatedByName" = ${input.updatedByName ?? null}
            WHERE id = ${input.orderRequestId} AND "encounterId" = ${input.encounterId}
          `;
          return;
        }
        await prisma.$executeRaw`
          UPDATE "EncounterOrderRequest"
          SET notes = CASE WHEN ${hasNotes} THEN ${input.notes ?? null} ELSE notes END,
              priority = CASE WHEN ${hasPriority} THEN ${input.priority ?? null} ELSE priority END,
              status = CASE WHEN ${hasStatus} THEN ${input.status ?? null} ELSE status END,
              "assignedToService" = CASE WHEN ${hasAssignedToService} THEN ${input.assignedToService ?? null} ELSE "assignedToService" END,
              "updatedAt" = ${now},
              "updatedByName" = ${input.updatedByName ?? null}
          WHERE id = ${input.orderRequestId}
        `;
      };

      try {
        await applyWhereUpdate(false);
      } catch (error) {
        if (!isMissingColumnError(error)) throw error;
        await applyWhereUpdate(true);
      }

      const rows = await listEncounterOrderRequestsByOrderId(input.orderRequestId, input.encounterId);
      return rows[0] || null;
    },
    () => {
      const memory = memoryOrderRequests();
      const list =
        input.encounterId !== undefined
          ? memory.get(input.encounterId) || []
          : Array.from(memory.values()).flat();
      const index = list.findIndex((item) => item.id === input.orderRequestId);
      if (index < 0) return null;
      const current = list[index];
      const updatedAt = input.updatedAtIso || new Date().toISOString();
      const updated: EncounterOrderRequestItem = {
        ...current,
        assignedToService: input.assignedToService === undefined ? current.assignedToService : input.assignedToService,
        notes: input.notes === undefined ? current.notes : input.notes,
        priority: input.priority || current.priority,
        status: input.status || current.status,
        updatedAt,
        updatedByName: input.updatedByName === undefined ? current.updatedByName : input.updatedByName
      };
      const targetEncounterId = current.encounterId;
      const encounterList = (memory.get(targetEncounterId) || []).slice();
      const encounterIndex = encounterList.findIndex((item) => item.id === input.orderRequestId);
      if (encounterIndex < 0) return null;
      encounterList[encounterIndex] = updated;
      memory.set(targetEncounterId, encounterList);
      return updated;
    }
  );
}

function mapResultRow(row: {
  id: string;
  title: string;
  type: string;
  status: string;
  performedAt: Date;
  pdfUrl: string | null;
  imageUrls: Prisma.JsonValue | null;
  values: Prisma.JsonValue | null;
}): EncounterResult {
  return {
    id: row.id,
    title: row.title,
    type: row.type === "RX" || row.type === "USG" ? row.type : "LAB",
    status: row.status === "ready" || row.status === "in_progress" ? row.status : "pending",
    performedAt: row.performedAt.toISOString(),
    pdfUrl: row.pdfUrl,
    imageUrls: toStringArray(row.imageUrls),
    values: toResultValues(row.values),
    sourceOrderRequestId: null
  };
}

export async function getEncounterOrderRequestById(orderRequestId: string): Promise<EncounterOrderRequestItem | null> {
  return withMissingTableFallback(
    "medical-encounter-order-requests",
    async () => {
      const rows = await listEncounterOrderRequestsByOrderId(orderRequestId);
      return rows[0] || null;
    },
    () => {
      for (const items of memoryOrderRequests().values()) {
        const found = items.find((item) => item.id === orderRequestId);
        if (found) return found;
      }
      return null;
    }
  );
}

export async function listWorklistOrders(params: {
  modality: "LAB" | "RX" | "USG";
  priority?: "routine" | "urgent" | null;
  patientQuery?: string | null;
  statusFilter?: Array<"ordered" | "in_progress" | "completed" | "cancelled"> | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}): Promise<EncounterWorklistItem[]> {
  return withMissingTableFallback(
    "medical-worklist-orders",
    async () => {
      const rows = await prisma.$queryRaw<
        Array<{
          orderId: string;
          encounterId: string;
          patientId: string | null;
          serviceTitle: string;
          priority: string;
          status: string;
          modality: string;
          createdAt: Date;
          updatedAt: Date | null;
        }>
      >`SELECT o.id as "orderId",
               o."encounterId",
               e."patientId",
               o.title as "serviceTitle",
               o.priority,
               o.status,
               o.modality,
               o."createdAt",
               o."updatedAt"
        FROM "EncounterOrderRequest" o
        LEFT JOIN "Encounter" e ON e.id = o."encounterId"
        WHERE o.modality = ${params.modality}
        ORDER BY
          CASE WHEN o.priority = 'urgent' THEN 0 ELSE 1 END,
          o."createdAt" ASC
        LIMIT 800`;

      const normalized = rows.map((row) => ({
        orderId: row.orderId,
        encounterId: row.encounterId,
        patientName: row.patientId ? `Paciente ${row.patientId}` : "Paciente",
        serviceTitle: row.serviceTitle,
        priority: row.priority === "urgent" ? "urgent" : "routine",
        status: normalizeOrderStatus(row.status),
        modality: normalizeOrderModality(row.modality),
        createdAt: row.createdAt.toISOString(),
        updatedAt: (row.updatedAt || row.createdAt).toISOString()
      } satisfies EncounterWorklistItem));

      const fromTime = params.dateFrom ? Date.parse(params.dateFrom) : Number.NaN;
      const toTime = params.dateTo ? Date.parse(params.dateTo) : Number.NaN;
      const patientNeedle = (params.patientQuery || "").trim().toLowerCase();
      const statusSet = new Set((params.statusFilter || []).map((item) => item));

      return normalized.filter((row) => {
        if (params.priority && row.priority !== params.priority) return false;
        if (statusSet.size > 0 && !statusSet.has(row.status)) return false;
        if (patientNeedle && !row.patientName.toLowerCase().includes(patientNeedle) && !row.encounterId.toLowerCase().includes(patientNeedle)) {
          return false;
        }
        if (Number.isFinite(fromTime)) {
          const rowTime = Date.parse(row.createdAt);
          if (!Number.isFinite(rowTime) || rowTime < fromTime) return false;
        }
        if (Number.isFinite(toTime)) {
          const rowTime = Date.parse(row.createdAt);
          if (!Number.isFinite(rowTime) || rowTime > toTime) return false;
        }
        return true;
      });
    },
    () => {
      const seedMemoryIfNeeded = () => {
        const memory = memoryOrderRequests();
        const existing = Array.from(memory.values()).flat();
        if (existing.some((item) => item.modality === params.modality)) return;

        const encounterId = "demo-open";
        const now = Date.now();
        const demoOrders: EncounterOrderRequestItem[] = [
          {
            id: `ord-fallback-${params.modality.toLowerCase()}-001`,
            encounterId,
            modality: params.modality,
            assignedToService: params.modality,
            serviceId: null,
            serviceCode: params.modality === "LAB" ? "LAB-HMG" : params.modality === "RX" ? "RX-TOR-APLAT" : "USG-ABD",
            title:
              params.modality === "LAB"
                ? "Hemograma completo"
                : params.modality === "RX"
                  ? "Rayos X de tórax (AP/Lat)"
                  : "Ultrasonido abdominal",
            quantity: 1,
            notes: null,
            priority: "urgent",
            status: "ordered",
            createdAt: new Date(now - 90 * 60_000).toISOString(),
            createdByName: "Sistema (mock)",
            updatedAt: new Date(now - 90 * 60_000).toISOString(),
            updatedByName: "Sistema (mock)"
          },
          {
            id: `ord-fallback-${params.modality.toLowerCase()}-002`,
            encounterId,
            modality: params.modality,
            assignedToService: params.modality,
            serviceId: null,
            serviceCode: params.modality === "LAB" ? "LAB-LIP" : params.modality === "RX" ? "RX-COL-LUM" : "USG-PEL",
            title:
              params.modality === "LAB"
                ? "Perfil lipídico"
                : params.modality === "RX"
                  ? "Rayos X columna lumbar"
                  : "Ultrasonido pélvico",
            quantity: 1,
            notes: null,
            priority: "routine",
            status: "in_progress",
            createdAt: new Date(now - 150 * 60_000).toISOString(),
            createdByName: "Sistema (mock)",
            updatedAt: new Date(now - 45 * 60_000).toISOString(),
            updatedByName: "Sistema (mock)"
          }
        ];

        const encounterItems = memory.get(encounterId) || [];
        memory.set(encounterId, [...demoOrders, ...encounterItems]);
      };

      const memoryItems = Array.from(memoryOrderRequests().entries())
        .flatMap(([encounterId, list]) =>
          list.map((order) => ({
            orderId: order.id,
            encounterId,
            patientName: `Paciente ${encounterId}`,
            serviceTitle: order.title,
            priority: order.priority,
            status: order.status,
            modality: order.modality,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt || order.createdAt
          }))
        )
        .filter((item) => item.modality === params.modality);

      if (memoryItems.length === 0) {
        seedMemoryIfNeeded();
      }

      const source = Array.from(memoryOrderRequests().entries())
        .flatMap(([encounterId, list]) =>
          list.map((order) => ({
            orderId: order.id,
            encounterId,
            patientName: `Paciente ${encounterId}`,
            serviceTitle: order.title,
            priority: order.priority,
            status: order.status,
            modality: order.modality,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt || order.createdAt
          }))
        )
        .filter((item) => item.modality === params.modality);

      const fromTime = params.dateFrom ? Date.parse(params.dateFrom) : Number.NaN;
      const toTime = params.dateTo ? Date.parse(params.dateTo) : Number.NaN;
      const patientNeedle = (params.patientQuery || "").trim().toLowerCase();
      const statusSet = new Set(params.statusFilter || []);

      return source
        .filter((item) => {
          if (params.priority && item.priority !== params.priority) return false;
          if (statusSet.size > 0 && !statusSet.has(item.status)) return false;
          if (
            patientNeedle &&
            !item.patientName.toLowerCase().includes(patientNeedle) &&
            !item.encounterId.toLowerCase().includes(patientNeedle)
          ) {
            return false;
          }
          if (Number.isFinite(fromTime)) {
            const itemTime = Date.parse(item.createdAt);
            if (!Number.isFinite(itemTime) || itemTime < fromTime) return false;
          }
          if (Number.isFinite(toTime)) {
            const itemTime = Date.parse(item.createdAt);
            if (!Number.isFinite(itemTime) || itemTime > toTime) return false;
          }
          return true;
        })
        .sort((a, b) => {
          if (a.priority !== b.priority) return a.priority === "urgent" ? -1 : 1;
          return a.createdAt < b.createdAt ? -1 : 1;
        });
    }
  );
}

function isAllowedOrderTransition(current: EncounterOrderRequestItem["status"], next: EncounterOrderRequestItem["status"]) {
  if (current === "cancelled") return false;
  if (current === next) return true;
  if (current === "ordered") return next === "in_progress" || next === "completed" || next === "cancelled";
  if (current === "in_progress") return next === "completed" || next === "cancelled";
  if (current === "completed") return next === "completed";
  return false;
}

async function ensureResultForCompletedOrder(order: EncounterOrderRequestItem): Promise<EncounterResult> {
  const now = new Date();
  return withMissingTableFallback(
    "medical-encounter-results",
    async () => {
      const existingRows = await prisma.$queryRaw<
        Array<{
          id: string;
          title: string;
          type: string;
          status: string;
          performedAt: Date;
          pdfUrl: string | null;
          imageUrls: Prisma.JsonValue | null;
          values: Prisma.JsonValue | null;
        }>
      >`SELECT id, title, type, status, "performedAt", "pdfUrl", "imageUrls", "values"
         FROM "EncounterResult"
         WHERE "encounterId" = ${order.encounterId}
           AND type = ${order.modality}
           AND title = ${order.title}
         ORDER BY "performedAt" DESC
         LIMIT 1`;

      const existing = existingRows[0];
      if (existing) return mapResultRow(existing);

      const id = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO "EncounterResult"
          (id, "encounterId", type, status, title, "performedAt", "pdfUrl", "imageUrls", "values")
        VALUES
          (${id}, ${order.encounterId}, ${order.modality}, 'pending', ${order.title}, ${now}, ${null}, ${[] as unknown as Prisma.JsonValue}, ${[] as unknown as Prisma.JsonValue})
      `;

      return {
        id,
        title: order.title,
        type: order.modality,
        status: "pending",
        performedAt: now.toISOString(),
        pdfUrl: null,
        imageUrls: [],
        values: [],
        sourceOrderRequestId: null
      };
    },
    () => {
      const memory = memoryResults();
      const list = memory.get(order.encounterId) || [];
      const existing = list.find((item) => item.type === order.modality && item.title === order.title);
      if (existing) return existing;

      const created: EncounterResult = {
        id: randomUUID(),
        title: order.title,
        type: order.modality,
        status: "pending",
        performedAt: now.toISOString(),
        pdfUrl: null,
        imageUrls: [],
        values: [],
        sourceOrderRequestId: null
      };
      memory.set(order.encounterId, [created, ...list]);
      return created;
    }
  );
}

export async function transitionEncounterOrderStatus(params: {
  orderRequestId: string;
  nextStatus: EncounterOrderRequestItem["status"];
  actorName: string | null;
}): Promise<
  | { ok: true; order: EncounterOrderRequestItem; generatedResult: EncounterResult | null; event: string }
  | { ok: false; code: "NOT_FOUND" | "CANCELLED" | "INVALID_TRANSITION"; message: string }
> {
  const existing = await getEncounterOrderRequestById(params.orderRequestId);
  if (!existing) {
    return { ok: false, code: "NOT_FOUND", message: "Orden médica no encontrada." };
  }
  if (existing.status === "cancelled") {
    return { ok: false, code: "CANCELLED", message: "La orden está cancelada y no permite cambios." };
  }
  if (!isAllowedOrderTransition(existing.status, params.nextStatus)) {
    return { ok: false, code: "INVALID_TRANSITION", message: "Transición de estado no permitida." };
  }

  const updated = await updateEncounterOrderRequest({
    orderRequestId: existing.id,
    encounterId: existing.encounterId,
    status: params.nextStatus,
    assignedToService: existing.modality,
    updatedAtIso: new Date().toISOString(),
    updatedByName: params.actorName || null
  });
  if (!updated) {
    return { ok: false, code: "NOT_FOUND", message: "Orden médica no encontrada." };
  }

  let generatedResult: EncounterResult | null = null;
  if (params.nextStatus === "completed") {
    generatedResult = await ensureResultForCompletedOrder(updated);
  }

  const event =
    params.nextStatus === "in_progress"
      ? "order.started"
      : params.nextStatus === "completed"
        ? "order.completed"
        : params.nextStatus === "cancelled"
          ? "order.cancelled"
          : "order.ordered";

  return {
    ok: true,
    order: updated,
    generatedResult,
    event
  };
}

export async function uploadEncounterOrderResult(input: UpsertOrderResultInput): Promise<EncounterResult | null> {
  const order = await getEncounterOrderRequestById(input.orderRequestId);
  if (!order) return null;
  const ensured = await ensureResultForCompletedOrder(order);

  const nextPdfUrl = input.pdfUrl === undefined ? ensured.pdfUrl : input.pdfUrl;
  const nextImageUrls = input.imageUrls === undefined ? ensured.imageUrls : input.imageUrls.filter((item) => typeof item === "string" && item.trim().length > 0);
  const nextValues = input.values === undefined ? ensured.values : input.values;
  const nextStatus: EncounterResult["status"] = input.markReady === false ? "pending" : "ready";
  const now = new Date();

  return withMissingTableFallback(
    "medical-encounter-results",
    async () => {
      await prisma.$executeRaw`
        UPDATE "EncounterResult"
        SET status = ${nextStatus},
            "performedAt" = ${now},
            "pdfUrl" = ${nextPdfUrl},
            "imageUrls" = ${nextImageUrls as unknown as Prisma.JsonValue},
            "values" = ${nextValues as unknown as Prisma.JsonValue}
        WHERE id = ${ensured.id}
      `;
      const rows = await prisma.$queryRaw<
        Array<{
          id: string;
          title: string;
          type: string;
          status: string;
          performedAt: Date;
          pdfUrl: string | null;
          imageUrls: Prisma.JsonValue | null;
          values: Prisma.JsonValue | null;
        }>
      >`SELECT id, title, type, status, "performedAt", "pdfUrl", "imageUrls", "values"
         FROM "EncounterResult"
         WHERE id = ${ensured.id}
         LIMIT 1`;
      const row = rows[0];
      return row ? mapResultRow(row) : ensured;
    },
    () => {
      const memory = memoryResults();
      const list = memory.get(order.encounterId) || [];
      const nextList = list.map((item) =>
        item.id === ensured.id
          ? {
              ...item,
              status: nextStatus,
              performedAt: now.toISOString(),
              pdfUrl: nextPdfUrl ?? null,
              imageUrls: nextImageUrls,
              values: nextValues
            }
          : item
      );
      memory.set(order.encounterId, nextList);
      return nextList.find((item) => item.id === ensured.id) || ensured;
    }
  );
}
