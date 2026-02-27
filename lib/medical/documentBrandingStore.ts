import { randomUUID } from "crypto";
import { z } from "zod";
import type { Prisma, TextDocVersion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, logPrismaSchemaIssue } from "@/lib/prisma/errors.server";
import { documentBrandingUpsertSchema } from "@/lib/medical/schemas";
import {
  createDefaultDocumentBrandingTemplate,
  normalizeDocumentBrandingTemplate,
  normalizeDocumentBrandingTemplates,
  pickDefaultDocumentBrandingTemplate,
  type DocumentBrandingScope,
  type DocumentBrandingTemplate
} from "@/lib/medical/documentBranding";

const MODULE_KEY = "MEDICAL";
const SERVICE_KEY = "CONSULTAM_DOCUMENT_BRANDING";
const SUBJECT_TYPE = "DOCUMENT_BRANDING";

const parsedSchema = documentBrandingUpsertSchema.extend({
  id: z.string().min(1),
  updatedAt: z.string().min(1)
});

const globalForMedical = globalThis as unknown as {
  documentBrandingMemory?: Map<string, DocumentBrandingTemplate>;
  documentBrandingStoreForceMemory?: boolean;
  documentBrandingMemoryInitialized?: boolean;
};

function memoryStore() {
  if (!globalForMedical.documentBrandingMemory) {
    globalForMedical.documentBrandingMemory = new Map();
  }

  if (!globalForMedical.documentBrandingMemoryInitialized) {
    const fallback = createDefaultDocumentBrandingTemplate();
    globalForMedical.documentBrandingMemory.set(fallback.id, fallback);
    globalForMedical.documentBrandingMemoryInitialized = true;
  }

  return globalForMedical.documentBrandingMemory;
}

function setMemoryTemplates(templates: DocumentBrandingTemplate[]) {
  const store = memoryStore();
  store.clear();
  for (const template of templates) {
    store.set(template.id, template);
  }
}

function memoryList() {
  return normalizeDocumentBrandingTemplates(Array.from(memoryStore().values()));
}

function filterByScope(templates: DocumentBrandingTemplate[], scope?: DocumentBrandingScope) {
  if (!scope) return templates;
  return templates.filter((item) => item.scope === scope);
}

async function withMemoryFallback<T>(dbOperation: () => Promise<T>, memoryOperation: () => Promise<T> | T): Promise<T> {
  if (globalForMedical.documentBrandingStoreForceMemory) {
    return await memoryOperation();
  }

  try {
    return await dbOperation();
  } catch (error) {
    if (!isPrismaMissingTableError(error)) throw error;
    logPrismaSchemaIssue("document-branding", error);
    globalForMedical.documentBrandingStoreForceMemory = true;
    return await memoryOperation();
  }
}

function parseTemplateVersion(docId: string, version: TextDocVersion | null): DocumentBrandingTemplate | null {
  if (!version) return null;
  const raw = (version.contentJson || {}) as Record<string, unknown>;
  const parsed = parsedSchema.safeParse({
    ...raw,
    id: String(raw.id || docId),
    updatedAt: String(raw.updatedAt || version.createdAt.toISOString())
  });
  if (!parsed.success) return null;
  return normalizeDocumentBrandingTemplate(parsed.data);
}

function renderTemplateHtml(template: DocumentBrandingTemplate) {
  return `
    <article>
      <h1>${template.title}</h1>
      <p>Logo: ${template.logoUrl || "sin-logo"}</p>
      <p>Fondo: ${template.backgroundImageUrl || "sin-fondo"}</p>
      <p>Footer: ${template.footerEnabled ? "activo" : "inactivo"}</p>
    </article>
  `;
}

const BRANDING_SCOPES: DocumentBrandingScope[] = ["clinical", "order_lab", "order_rx", "order_usg"];

async function ensureDefaultInDb(actorUserId: string | null) {
  const fullList = await listDocumentBrandingTemplates();
  for (const scope of BRANDING_SCOPES) {
    const scoped = fullList.filter((item) => item.scope === scope);
    if (scoped.length === 0) continue;
    if (scoped.some((item) => item.isDefault)) continue;
    await saveDocumentBrandingTemplate({ ...scoped[0], isDefault: true }, actorUserId);
    return listDocumentBrandingTemplates();
  }
  return fullList;
}

export async function listDocumentBrandingTemplates(scope?: DocumentBrandingScope): Promise<DocumentBrandingTemplate[]> {
  return withMemoryFallback(
    async () => {
      const docs = await prisma.textDoc.findMany({
        where: {
          moduleKey: MODULE_KEY,
          serviceKey: SERVICE_KEY,
          subjectType: SUBJECT_TYPE
        },
        include: {
          versions: {
            orderBy: { versionNo: "desc" },
            take: 1
          }
        },
        orderBy: { updatedAt: "desc" }
      });

      const parsed = docs
        .map((doc) => parseTemplateVersion(doc.id, doc.versions[0] || null))
        .filter((item): item is DocumentBrandingTemplate => Boolean(item));

      const normalized = normalizeDocumentBrandingTemplates(parsed);
      setMemoryTemplates(normalized);
      return filterByScope(normalized, scope);
    },
    async () => filterByScope(memoryList(), scope)
  );
}

export async function getDocumentBrandingTemplateById(id: string): Promise<DocumentBrandingTemplate | null> {
  return withMemoryFallback(
    async () => {
      const doc = await prisma.textDoc.findFirst({
        where: {
          id,
          moduleKey: MODULE_KEY,
          serviceKey: SERVICE_KEY,
          subjectType: SUBJECT_TYPE
        },
        include: {
          versions: {
            orderBy: { versionNo: "desc" },
            take: 1
          }
        }
      });

      if (!doc) return null;
      return parseTemplateVersion(doc.id, doc.versions[0] || null);
    },
    async () => memoryStore().get(id) || null
  );
}

export async function getDefaultDocumentBrandingTemplate(scope: DocumentBrandingScope = "clinical"): Promise<DocumentBrandingTemplate> {
  const list = await listDocumentBrandingTemplates(scope);
  return pickDefaultDocumentBrandingTemplate(list, scope);
}

export async function saveDocumentBrandingTemplate(
  input: z.infer<typeof documentBrandingUpsertSchema>,
  actorUserId: string | null
): Promise<DocumentBrandingTemplate> {
  const nowIso = new Date().toISOString();
  const id = input.id?.trim() || randomUUID();
  const payload = normalizeDocumentBrandingTemplate({
    ...input,
    id,
    updatedAt: nowIso
  });

  return withMemoryFallback(
    async () => {
      const saved = await prisma.$transaction(async (tx) => {
        const existing = await tx.textDoc.findFirst({
          where: {
            id,
            moduleKey: MODULE_KEY,
            serviceKey: SERVICE_KEY,
            subjectType: SUBJECT_TYPE
          },
          include: {
            versions: {
              orderBy: { versionNo: "desc" },
              take: 1
            }
          }
        });

        const docs = await tx.textDoc.findMany({
          where: {
            moduleKey: MODULE_KEY,
            serviceKey: SERVICE_KEY,
            subjectType: SUBJECT_TYPE
          },
          include: {
            versions: {
              orderBy: { versionNo: "desc" },
              take: 1
            }
          }
        });

        const parsedDocs = docs
          .map((doc) => parseTemplateVersion(doc.id, doc.versions[0] || null))
          .filter((item): item is DocumentBrandingTemplate => Boolean(item));
        const scopedDocs = parsedDocs.filter((item) => item.scope === payload.scope);
        const isFirstTemplate = !existing && scopedDocs.length === 0;
        const normalizedPayload = isFirstTemplate ? { ...payload, isDefault: true } : payload;

        if (normalizedPayload.isDefault) {
          for (const doc of docs) {
            if (doc.id === id) continue;
            const current = parseTemplateVersion(doc.id, doc.versions[0] || null);
            if (!current || !current.isDefault || current.scope !== normalizedPayload.scope) continue;
            const nextVersion = (doc.versions[0]?.versionNo || 0) + 1;
            const downgraded = normalizeDocumentBrandingTemplate({
              ...current,
              isDefault: false,
              updatedAt: nowIso
            });
            await tx.textDocVersion.create({
              data: {
                docId: doc.id,
                versionNo: nextVersion,
                contentJson: downgraded as unknown as Prisma.InputJsonValue,
                contentHtml: renderTemplateHtml(downgraded),
                createdById: actorUserId
              }
            });
          }
        }

        let docId = id;
        let nextVersionNo = 1;
        if (existing) {
          docId = existing.id;
          nextVersionNo = (existing.versions[0]?.versionNo || 0) + 1;
          await tx.textDoc.update({
            where: { id: existing.id },
            data: { title: normalizedPayload.title, subjectRef: normalizedPayload.id }
          });
        } else {
          const created = await tx.textDoc.create({
            data: {
              id,
              title: normalizedPayload.title,
              moduleKey: MODULE_KEY,
              serviceKey: SERVICE_KEY,
              subjectType: SUBJECT_TYPE,
              subjectRef: normalizedPayload.id
            }
          });
          docId = created.id;
        }

        await tx.textDocVersion.create({
          data: {
            docId,
            versionNo: nextVersionNo,
            contentJson: normalizedPayload as unknown as Prisma.InputJsonValue,
            contentHtml: renderTemplateHtml(normalizedPayload),
            createdById: actorUserId
          }
        });

        return normalizedPayload;
      });

      await ensureDefaultInDb(actorUserId);
      const next = await listDocumentBrandingTemplates();
      setMemoryTemplates(next);
      return next.find((item) => item.id === saved.id) || saved;
    },
    async () => {
      const current = memoryList();
      let next = current.filter((item) => item.id !== payload.id);
      const sameScope = next.filter((item) => item.scope === payload.scope);
      if (payload.isDefault || sameScope.length === 0) {
        next = next.map((item) => (item.scope === payload.scope ? { ...item, isDefault: false } : item));
      }
      next.unshift(payload);
      const normalized = normalizeDocumentBrandingTemplates(next);
      setMemoryTemplates(normalized);
      return normalized.find((item) => item.id === payload.id) || payload;
    }
  );
}

export async function deleteDocumentBrandingTemplate(id: string, actorUserId: string | null): Promise<boolean> {
  return withMemoryFallback(
    async () => {
      await prisma.textDoc.deleteMany({
        where: {
          id,
          moduleKey: MODULE_KEY,
          serviceKey: SERVICE_KEY,
          subjectType: SUBJECT_TYPE
        }
      });
      await ensureDefaultInDb(actorUserId);
      const next = await listDocumentBrandingTemplates();
      setMemoryTemplates(next);
      return true;
    },
    async () => {
      const store = memoryStore();
      store.delete(id);
      const normalized = normalizeDocumentBrandingTemplates(Array.from(store.values()));
      setMemoryTemplates(normalized);
      return true;
    }
  );
}
