import { randomUUID } from "crypto";
import { z } from "zod";
import type { Prisma, TextDocVersion } from "@prisma/client";
import type { VitalTemplateDefinition } from "@/components/medical/encounter/types";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, logPrismaSchemaIssue } from "@/lib/prisma/errors.server";
import { vitalTemplateUpsertSchema } from "@/lib/medical/schemas";
import { defaultVitalTemplates, normalizeVitalTemplatePayload } from "@/lib/medical/clinical";

const MODULE_KEY = "MEDICAL";
const SERVICE_KEY = "CONSULTAM_VITALS_TEMPLATE";
const SUBJECT_TYPE = "VITALS_TEMPLATE";

const parsedVitalTemplateSchema = vitalTemplateUpsertSchema.extend({
  id: z.string().min(1),
  updatedAt: z.string().min(1)
});

const globalForMedical = globalThis as unknown as {
  vitalsTemplateMemory?: Map<string, VitalTemplateDefinition>;
  vitalsTemplateMemoryInitialized?: boolean;
  vitalsTemplateStoreForceMemory?: boolean;
};

function getMemoryStore() {
  if (!globalForMedical.vitalsTemplateMemory) {
    globalForMedical.vitalsTemplateMemory = new Map();
  }

  if (!globalForMedical.vitalsTemplateMemoryInitialized) {
    for (const template of defaultVitalTemplates()) {
      globalForMedical.vitalsTemplateMemory.set(template.id, template);
    }
    globalForMedical.vitalsTemplateMemoryInitialized = true;
  }

  return globalForMedical.vitalsTemplateMemory;
}

function sortTemplates(list: VitalTemplateDefinition[]) {
  return list
    .slice()
    .sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.updatedAt < b.updatedAt ? 1 : -1;
    });
}

function normalizeDefaultFlag(list: VitalTemplateDefinition[]) {
  if (list.length === 0) return defaultVitalTemplates();
  const hasDefault = list.some((item) => item.isDefault);
  if (hasDefault) return sortTemplates(list);
  const [first, ...rest] = sortTemplates(list);
  return [{ ...first, isDefault: true }, ...rest];
}

function parseTemplateVersion(docId: string, docTitle: string, version: TextDocVersion | null): VitalTemplateDefinition | null {
  if (!version) return null;
  const content = version.contentJson as Record<string, unknown>;
  const candidate = {
    ...(content || {}),
    id: String(content?.id || docId),
    title: String(content?.title || docTitle || "Plantilla de signos vitales"),
    updatedAt: String(content?.updatedAt || version.createdAt.toISOString())
  };

  const parsed = parsedVitalTemplateSchema.safeParse(candidate);
  if (!parsed.success) return null;

  return normalizeVitalTemplatePayload(parsed.data);
}

function renderTemplateContentHtml(template: VitalTemplateDefinition) {
  const rows = template.fields
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(
      (field) =>
        `<tr><td>${field.label}</td><td>${field.unit || "—"}</td><td>${field.visible ? "Sí" : "No"}</td><td>${field.required ? "Sí" : "No"}</td><td>${field.source}</td></tr>`
    )
    .join("");

  return `
    <article>
      <h1>${template.title}</h1>
      <table>
        <thead>
          <tr><th>Campo</th><th>Unidad</th><th>Visible</th><th>Req.</th><th>Fuente</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </article>
  `;
}

function setMemoryTemplates(templates: VitalTemplateDefinition[]) {
  const store = getMemoryStore();
  store.clear();
  for (const template of templates) {
    store.set(template.id, template);
  }
}

function toMemoryList() {
  return normalizeDefaultFlag(Array.from(getMemoryStore().values()));
}

async function withMemoryFallback<T>(dbOperation: () => Promise<T>, memoryOperation: () => T): Promise<T> {
  if (globalForMedical.vitalsTemplateStoreForceMemory) {
    return memoryOperation();
  }

  try {
    return await dbOperation();
  } catch (error) {
    if (!isPrismaMissingTableError(error)) throw error;
    logPrismaSchemaIssue("vitals-templates", error);
    globalForMedical.vitalsTemplateStoreForceMemory = true;
    return memoryOperation();
  }
}

export async function listVitalTemplates() {
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

      const templates = docs
        .map((doc) => parseTemplateVersion(doc.id, doc.title, doc.versions[0] || null))
        .filter((item): item is VitalTemplateDefinition => Boolean(item));

      if (templates.length === 0) {
        const defaults = defaultVitalTemplates();
        setMemoryTemplates(defaults);
        return defaults;
      }

      setMemoryTemplates(templates);
      return normalizeDefaultFlag(templates);
    },
    () => toMemoryList()
  );
}

export async function getVitalTemplateById(id: string) {
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
      return parseTemplateVersion(doc.id, doc.title, doc.versions[0] || null);
    },
    () => getMemoryStore().get(id) || null
  );
}

export async function saveVitalTemplate(input: z.infer<typeof vitalTemplateUpsertSchema>, actorUserId: string | null) {
  const nowIso = new Date().toISOString();
  const id = input.id || randomUUID();
  const payload: VitalTemplateDefinition = normalizeVitalTemplatePayload({
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

        if (payload.isDefault) {
          const others = await tx.textDoc.findMany({
            where: {
              moduleKey: MODULE_KEY,
              serviceKey: SERVICE_KEY,
              subjectType: SUBJECT_TYPE,
              NOT: { id }
            },
            include: {
              versions: {
                orderBy: { versionNo: "desc" },
                take: 1
              }
            }
          });

          for (const doc of others) {
            const current = parseTemplateVersion(doc.id, doc.title, doc.versions[0] || null);
            if (!current || !current.isDefault) continue;
            const nextVersionNo = (doc.versions[0]?.versionNo || 0) + 1;
            const downgraded: VitalTemplateDefinition = {
              ...current,
              isDefault: false,
              updatedAt: nowIso
            };

            await tx.textDoc.update({
              where: { id: doc.id },
              data: { title: downgraded.title }
            });

            await tx.textDocVersion.create({
              data: {
                docId: doc.id,
                versionNo: nextVersionNo,
                contentJson: downgraded as unknown as Prisma.InputJsonValue,
                contentHtml: renderTemplateContentHtml(downgraded),
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
            data: { title: payload.title }
          });
        } else {
          const created = await tx.textDoc.create({
            data: {
              id,
              title: payload.title,
              moduleKey: MODULE_KEY,
              serviceKey: SERVICE_KEY,
              subjectType: SUBJECT_TYPE,
              subjectRef: id
            }
          });
          docId = created.id;
        }

        await tx.textDocVersion.create({
          data: {
            docId,
            versionNo: nextVersionNo,
            contentJson: payload as unknown as Prisma.InputJsonValue,
            contentHtml: renderTemplateContentHtml(payload),
            createdById: actorUserId
          }
        });

        return payload;
      });

      const nextList = await listVitalTemplates();
      setMemoryTemplates(nextList);
      return saved;
    },
    () => {
      const store = getMemoryStore();
      let list = Array.from(store.values()).filter((item) => item.id !== payload.id);
      if (payload.isDefault) {
        list = list.map((item) => ({ ...item, isDefault: false, updatedAt: nowIso }));
      }
      list.push(payload);
      const normalized = normalizeDefaultFlag(list);
      setMemoryTemplates(normalized);
      return normalized.find((item) => item.id === payload.id) || payload;
    }
  );
}

export async function deleteVitalTemplate(id: string) {
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

      const next = await listVitalTemplates();
      setMemoryTemplates(next);
      return true;
    },
    () => {
      const store = getMemoryStore();
      store.delete(id);
      const normalized = normalizeDefaultFlag(Array.from(store.values()));
      setMemoryTemplates(normalized);
      return true;
    }
  );
}
