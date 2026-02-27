import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, logPrismaSchemaIssue } from "@/lib/prisma/errors.server";
import { CIE10_LOCAL_SEED } from "@/lib/medical/cie10Seed";

type Icd10Source = "WHO_OPS_PDF" | "LOCAL";
type Icd10AuditAction = "create" | "update" | "activate" | "deactivate";

export type Icd10CatalogRecord = {
  id: string;
  code: string;
  title: string;
  chapter: string | null;
  chapterRange: string | null;
  level: 3 | 4;
  parentCode: string | null;
  isActive: boolean;
  source: Icd10Source;
  createdAt: string;
  updatedAt: string;
};

export type Icd10AuditRecord = {
  id: string;
  codeId: string;
  action: Icd10AuditAction;
  diffJson: Record<string, unknown>;
  actorUserId: string | null;
  createdAt: string;
};

type ListInput = {
  query?: string;
  chapter?: string;
  level?: 3 | 4;
  active?: boolean;
  page: number;
  pageSize: number;
};

type UpsertInput = {
  code: string;
  title: string;
  chapter?: string | null;
  chapterRange?: string | null;
  level?: 3 | 4;
  parentCode?: string | null;
  source?: Icd10Source;
  isActive?: boolean;
};

const CODE_PATTERN = /^[A-Z][0-9][0-9](?:\.[0-9A-Z])?$/;
const SEARCH_PRELOAD_LIMIT = 2000;

const globalForMedical = globalThis as unknown as {
  cie10StoreForceMemory?: boolean;
  cie10MemoryInitialized?: boolean;
  cie10MemoryCodes?: Map<string, Icd10CatalogRecord>;
  cie10MemoryAudits?: Icd10AuditRecord[];
};

function getMemoryCodes() {
  if (!globalForMedical.cie10MemoryCodes) {
    globalForMedical.cie10MemoryCodes = new Map();
  }

  if (!globalForMedical.cie10MemoryInitialized) {
    const nowIso = new Date().toISOString();
    for (const item of CIE10_LOCAL_SEED) {
      const id = `mem-icd10-${item.code.replaceAll(".", "_").toLowerCase()}`;
      globalForMedical.cie10MemoryCodes.set(id, {
        id,
        code: item.code,
        title: item.title,
        chapter: item.chapter,
        chapterRange: item.chapterRange,
        level: item.level,
        parentCode: item.parentCode,
        isActive: true,
        source: item.source,
        createdAt: nowIso,
        updatedAt: nowIso
      });
    }
    globalForMedical.cie10MemoryInitialized = true;
  }

  return globalForMedical.cie10MemoryCodes;
}

function getMemoryAudits() {
  if (!globalForMedical.cie10MemoryAudits) {
    globalForMedical.cie10MemoryAudits = [];
  }
  return globalForMedical.cie10MemoryAudits;
}

async function withMemoryFallback<T>(dbOperation: () => Promise<T>, memoryOperation: () => T): Promise<T> {
  if (globalForMedical.cie10StoreForceMemory) return memoryOperation();

  try {
    return await dbOperation();
  } catch (error) {
    if (!isPrismaMissingTableError(error)) throw error;
    logPrismaSchemaIssue("medical-cie10", error);
    globalForMedical.cie10StoreForceMemory = true;
    return memoryOperation();
  }
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function normalizeText(value: string | null | undefined) {
  const clean = value?.trim();
  return clean ? clean : null;
}

function codeLevel(code: string): 3 | 4 {
  return code.includes(".") ? 4 : 3;
}

function codeParent(code: string): string | null {
  return code.includes(".") ? code.slice(0, 3) : null;
}

function assertCodeValid(code: string) {
  if (!CODE_PATTERN.test(code)) {
    throw new Error("Formato de codigo CIE-10 invalido. Use esquema de 3 o 4 caracteres (ej. I10, J06.9).");
  }
}

function sanitizeInput(input: UpsertInput, current?: Icd10CatalogRecord): UpsertInput {
  const normalizedCode = normalizeCode(input.code ?? current?.code ?? "");
  assertCodeValid(normalizedCode);
  const normalizedLevel = input.level ?? codeLevel(normalizedCode);
  const inferredLevel = codeLevel(normalizedCode);
  if (normalizedLevel !== inferredLevel) {
    throw new Error(`El nivel (${normalizedLevel}) no coincide con el codigo ${normalizedCode}.`);
  }

  const parentCode = normalizedLevel === 4 ? normalizeCode(input.parentCode || codeParent(normalizedCode) || "") : null;
  const title = (input.title ?? current?.title ?? "").trim();
  if (!title) throw new Error("El titulo es requerido.");

  return {
    code: normalizedCode,
    title,
    chapter: normalizeText(input.chapter ?? current?.chapter ?? null),
    chapterRange: normalizeText(input.chapterRange ?? current?.chapterRange ?? null),
    level: normalizedLevel,
    parentCode: normalizedLevel === 4 ? parentCode : null,
    source: input.source ?? current?.source ?? "LOCAL",
    isActive: input.isActive ?? current?.isActive ?? true
  };
}

function rankByQuery(item: Icd10CatalogRecord, queryRaw: string) {
  const query = queryRaw.trim().toUpperCase();
  if (!query) return 99;
  const code = item.code.toUpperCase();
  const title = item.title.toUpperCase();
  if (code === query) return 0;
  if (code.startsWith(query)) return 1;
  if (code.includes(query)) return 2;
  if (title.includes(query)) return 3;
  return 4;
}

function sortForQuery(items: Icd10CatalogRecord[], query?: string) {
  if (!query?.trim()) {
    return items.slice().sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
  }

  return items.slice().sort((a, b) => {
    const rankA = rankByQuery(a, query);
    const rankB = rankByQuery(b, query);
    if (rankA !== rankB) return rankA - rankB;
    return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
  });
}

function applyFilters(items: Icd10CatalogRecord[], input: ListInput) {
  const query = input.query?.trim().toUpperCase() || "";
  const chapter = input.chapter?.trim().toUpperCase() || "";

  return items.filter((item) => {
    if (typeof input.active === "boolean" && item.isActive !== input.active) return false;
    if (input.level && item.level !== input.level) return false;
    if (chapter && (item.chapter || "").toUpperCase() !== chapter) return false;
    if (!query) return true;
    const code = item.code.toUpperCase();
    const title = item.title.toUpperCase();
    return code.includes(query) || title.includes(query);
  });
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function mapDbCode(row: {
  id: string;
  code: string;
  title: string;
  chapter: string | null;
  chapterRange: string | null;
  level: number;
  parentCode: string | null;
  isActive: boolean;
  source: Icd10Source;
  createdAt: Date;
  updatedAt: Date;
}): Icd10CatalogRecord {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    chapter: row.chapter,
    chapterRange: row.chapterRange,
    level: row.level === 4 ? 4 : 3,
    parentCode: row.parentCode,
    isActive: row.isActive,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function mapDbAudit(row: {
  id: string;
  codeId: string;
  action: string;
  diffJson: Prisma.JsonValue;
  actorUserId: string | null;
  createdAt: Date;
}): Icd10AuditRecord {
  return {
    id: row.id,
    codeId: row.codeId,
    action: row.action.toLowerCase() as Icd10AuditAction,
    diffJson: (row.diffJson || {}) as Record<string, unknown>,
    actorUserId: row.actorUserId,
    createdAt: row.createdAt.toISOString()
  };
}

function buildWhere(input: ListInput): Prisma.Icd10CodeWhereInput {
  const where: Prisma.Icd10CodeWhereInput = {};
  if (typeof input.active === "boolean") where.isActive = input.active;
  if (input.level) where.level = input.level;
  if (input.chapter?.trim()) where.chapter = input.chapter.trim().toUpperCase();
  if (input.query?.trim()) {
    const queryUpper = input.query.trim().toUpperCase();
    where.OR = [
      { code: { contains: queryUpper } },
      { title: { contains: input.query.trim(), mode: "insensitive" } }
    ];
  }
  return where;
}

export async function listCie10Codes(input: ListInput) {
  const page = Number.isFinite(input.page) && input.page > 0 ? input.page : 1;
  const pageSize = Math.max(5, Math.min(100, Number.isFinite(input.pageSize) ? input.pageSize : 25));

  return withMemoryFallback(
    async () => {
      const where = buildWhere(input);
      const total = await prisma.icd10Code.count({ where });

      if (!input.query?.trim()) {
        const rows = await prisma.icd10Code.findMany({
          where,
          orderBy: [{ code: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize
        });
        return {
          items: rows.map(mapDbCode),
          total,
          page,
          pageSize
        };
      }

      const rows = await prisma.icd10Code.findMany({
        where,
        orderBy: [{ code: "asc" }],
        take: SEARCH_PRELOAD_LIMIT
      });
      const ranked = sortForQuery(rows.map(mapDbCode), input.query);
      return {
        items: paginate(ranked, page, pageSize),
        total,
        page,
        pageSize
      };
    },
    () => {
      const filtered = applyFilters(Array.from(getMemoryCodes().values()), input);
      const ordered = sortForQuery(filtered, input.query);
      return {
        items: paginate(ordered, page, pageSize),
        total: filtered.length,
        page,
        pageSize
      };
    }
  );
}

export async function getCie10CodeById(id: string) {
  return withMemoryFallback(
    async () => {
      const code = await prisma.icd10Code.findUnique({ where: { id } });
      if (!code) return null;

      const audits = await prisma.icd10Audit.findMany({
        where: { codeId: id },
        orderBy: { createdAt: "desc" },
        take: 15
      });

      return {
        code: mapDbCode(code),
        audits: audits.map(mapDbAudit)
      };
    },
    () => {
      const code = getMemoryCodes().get(id);
      if (!code) return null;
      const audits = getMemoryAudits()
        .filter((audit) => audit.codeId === id)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 15);

      return { code, audits };
    }
  );
}

export async function createCie10Code(input: UpsertInput, actorUserId: string | null) {
  const payload = sanitizeInput(input);
  const nowIso = new Date().toISOString();

  return withMemoryFallback(
    async () => {
      const existing = await prisma.icd10Code.findUnique({ where: { code: payload.code } });
      if (existing) throw new Error(`Ya existe el codigo ${payload.code}.`);

      const saved = await prisma.$transaction(async (tx) => {
        const code = await tx.icd10Code.create({
          data: {
            code: payload.code,
            title: payload.title,
            chapter: payload.chapter || null,
            chapterRange: payload.chapterRange || null,
            level: payload.level || codeLevel(payload.code),
            parentCode: payload.parentCode || null,
            isActive: payload.isActive ?? true,
            source: payload.source || "LOCAL"
          }
        });

        await tx.icd10Audit.create({
          data: {
            codeId: code.id,
            action: "CREATE",
            diffJson: { after: code } as unknown as Prisma.InputJsonValue,
            actorUserId
          }
        });

        return code;
      });

      return mapDbCode(saved);
    },
    () => {
      const memory = getMemoryCodes();
      if (Array.from(memory.values()).some((item) => item.code === payload.code)) {
        throw new Error(`Ya existe el codigo ${payload.code}.`);
      }
      const id = `mem-icd10-${randomUUID()}`;
      const saved: Icd10CatalogRecord = {
        id,
        code: payload.code,
        title: payload.title,
        chapter: payload.chapter || null,
        chapterRange: payload.chapterRange || null,
        level: payload.level || codeLevel(payload.code),
        parentCode: payload.parentCode || null,
        isActive: payload.isActive ?? true,
        source: payload.source || "LOCAL",
        createdAt: nowIso,
        updatedAt: nowIso
      };
      memory.set(id, saved);
      getMemoryAudits().push({
        id: `mem-audit-${randomUUID()}`,
        codeId: id,
        action: "create",
        diffJson: { after: saved },
        actorUserId,
        createdAt: nowIso
      });
      return saved;
    }
  );
}

export async function updateCie10Code(id: string, input: Partial<UpsertInput>, actorUserId: string | null) {
  return withMemoryFallback(
    async () => {
      const current = await prisma.icd10Code.findUnique({ where: { id } });
      if (!current) return null;
      const payload = sanitizeInput(
        {
          code: input.code ?? current.code,
          title: input.title ?? current.title,
          chapter: input.chapter ?? current.chapter,
          chapterRange: input.chapterRange ?? current.chapterRange,
          level: input.level ?? (current.level === 4 ? 4 : 3),
          parentCode: input.parentCode ?? current.parentCode,
          source: input.source ?? current.source,
          isActive: input.isActive ?? current.isActive
        },
        mapDbCode(current)
      );

      if (payload.code !== current.code) {
        const conflict = await prisma.icd10Code.findFirst({
          where: {
            code: payload.code,
            NOT: { id: current.id }
          },
          select: { id: true }
        });
        if (conflict) throw new Error(`Ya existe el codigo ${payload.code}.`);
      }

      const diff: Record<string, unknown> = {};
      for (const key of ["code", "title", "chapter", "chapterRange", "level", "parentCode", "source", "isActive"] as const) {
        const before = (current as any)[key];
        const after = (payload as any)[key];
        if (before !== after) diff[key] = { before, after };
      }

      const saved = await prisma.$transaction(async (tx) => {
        const code = await tx.icd10Code.update({
          where: { id },
          data: {
            code: payload.code,
            title: payload.title,
            chapter: payload.chapter || null,
            chapterRange: payload.chapterRange || null,
            level: payload.level || codeLevel(payload.code),
            parentCode: payload.parentCode || null,
            isActive: payload.isActive ?? current.isActive,
            source: payload.source || current.source
          }
        });

        if (Object.keys(diff).length > 0) {
          await tx.icd10Audit.create({
            data: {
              codeId: code.id,
              action: "UPDATE",
              diffJson: diff as unknown as Prisma.InputJsonValue,
              actorUserId
            }
          });
        }

        return code;
      });

      return mapDbCode(saved);
    },
    () => {
      const memory = getMemoryCodes();
      const current = memory.get(id);
      if (!current) return null;

      const payload = sanitizeInput(
        {
          code: input.code ?? current.code,
          title: input.title ?? current.title,
          chapter: input.chapter ?? current.chapter,
          chapterRange: input.chapterRange ?? current.chapterRange,
          level: input.level ?? current.level,
          parentCode: input.parentCode ?? current.parentCode,
          source: input.source ?? current.source,
          isActive: input.isActive ?? current.isActive
        },
        current
      );

      if (payload.code !== current.code && Array.from(memory.values()).some((item) => item.code === payload.code && item.id !== id)) {
        throw new Error(`Ya existe el codigo ${payload.code}.`);
      }

      const nowIso = new Date().toISOString();
      const next: Icd10CatalogRecord = {
        ...current,
        code: payload.code,
        title: payload.title,
        chapter: payload.chapter || null,
        chapterRange: payload.chapterRange || null,
        level: payload.level || current.level,
        parentCode: payload.parentCode || null,
        source: payload.source || current.source,
        isActive: payload.isActive ?? current.isActive,
        updatedAt: nowIso
      };

      const diff: Record<string, unknown> = {};
      for (const key of ["code", "title", "chapter", "chapterRange", "level", "parentCode", "source", "isActive"] as const) {
        const before = (current as any)[key];
        const after = (next as any)[key];
        if (before !== after) diff[key] = { before, after };
      }

      memory.set(id, next);
      if (Object.keys(diff).length > 0) {
        getMemoryAudits().push({
          id: `mem-audit-${randomUUID()}`,
          codeId: id,
          action: "update",
          diffJson: diff,
          actorUserId,
          createdAt: nowIso
        });
      }
      return next;
    }
  );
}

export async function toggleCie10CodeActive(id: string, actorUserId: string | null) {
  return withMemoryFallback(
    async () => {
      const current = await prisma.icd10Code.findUnique({ where: { id } });
      if (!current) return null;
      const nextValue = !current.isActive;

      const saved = await prisma.$transaction(async (tx) => {
        const code = await tx.icd10Code.update({
          where: { id },
          data: { isActive: nextValue }
        });
        await tx.icd10Audit.create({
          data: {
            codeId: code.id,
            action: nextValue ? "ACTIVATE" : "DEACTIVATE",
            diffJson: {
              isActive: {
                before: current.isActive,
                after: nextValue
              }
            } as unknown as Prisma.InputJsonValue,
            actorUserId
          }
        });
        return code;
      });

      return mapDbCode(saved);
    },
    () => {
      const memory = getMemoryCodes();
      const current = memory.get(id);
      if (!current) return null;
      const nextValue = !current.isActive;
      const nowIso = new Date().toISOString();

      const next: Icd10CatalogRecord = {
        ...current,
        isActive: nextValue,
        updatedAt: nowIso
      };
      memory.set(id, next);
      getMemoryAudits().push({
        id: `mem-audit-${randomUUID()}`,
        codeId: id,
        action: nextValue ? "activate" : "deactivate",
        diffJson: { isActive: { before: current.isActive, after: nextValue } },
        actorUserId,
        createdAt: nowIso
      });
      return next;
    }
  );
}
