import { randomUUID } from "crypto";
import { z } from "zod";
import type { Prisma, TextDocVersion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { medicalDocumentSettingsSchema } from "@/lib/medical/schemas";
import {
  defaultMedicalDocumentSettings,
  normalizeMedicalDocumentSettings,
  type MedicalDocumentSettings
} from "@/lib/medical/documentSettings";

const MODULE_KEY = "MEDICAL";
const SERVICE_KEY = "CONSULTAM_DOCUMENT_SETTINGS";
const SUBJECT_TYPE = "DOCUMENT_SETTINGS";
const SUBJECT_REF = "default";

const globalForMedical = globalThis as unknown as {
  medicalDocumentSettingsMemory?: MedicalDocumentSettings;
  medicalDocumentSettingsForceMemory?: boolean;
};

function renderSettingsHtml(settings: MedicalDocumentSettings) {
  return `
    <article>
      <h1>Configuración documentos clínicos</h1>
      <p>Logo: ${settings.logoUrl || "sin-logo"}</p>
      <p>Fondo: ${settings.letterheadBackgroundUrl || "sin-fondo"}</p>
      <p>Margen: ${settings.margins.topIn}/${settings.margins.rightIn}/${settings.margins.bottomIn}/${settings.margins.leftIn}</p>
      <p>Pie: ${settings.footerText}</p>
    </article>
  `;
}

function memorySettings() {
  if (!globalForMedical.medicalDocumentSettingsMemory) {
    globalForMedical.medicalDocumentSettingsMemory = defaultMedicalDocumentSettings();
  }
  return globalForMedical.medicalDocumentSettingsMemory;
}

function parseSettingsVersion(version: TextDocVersion | null): MedicalDocumentSettings | null {
  if (!version) return null;
  const content = (version.contentJson || {}) as Record<string, unknown>;
  const parsed = medicalDocumentSettingsSchema.safeParse({
    ...content,
    updatedAt: String(content.updatedAt || version.createdAt.toISOString())
  });
  if (!parsed.success) return null;
  return normalizeMedicalDocumentSettings(parsed.data);
}

async function withMemoryFallback<T>(dbOperation: () => Promise<T>, memoryOperation: () => T): Promise<T> {
  if (globalForMedical.medicalDocumentSettingsForceMemory) {
    return memoryOperation();
  }

  try {
    return await dbOperation();
  } catch (error) {
    if (!isPrismaMissingTableError(error)) throw error;
    warnDevMissingTable("medical-document-settings", error);
    globalForMedical.medicalDocumentSettingsForceMemory = true;
    return memoryOperation();
  }
}

export async function getMedicalDocumentSettings(): Promise<MedicalDocumentSettings> {
  return withMemoryFallback(
    async () => {
      const doc = await prisma.textDoc.findFirst({
        where: {
          moduleKey: MODULE_KEY,
          serviceKey: SERVICE_KEY,
          subjectType: SUBJECT_TYPE,
          subjectRef: SUBJECT_REF
        },
        include: {
          versions: {
            orderBy: { versionNo: "desc" },
            take: 1
          }
        }
      });

      const parsed = parseSettingsVersion(doc?.versions?.[0] || null) || defaultMedicalDocumentSettings();
      globalForMedical.medicalDocumentSettingsMemory = parsed;
      return parsed;
    },
    () => memorySettings()
  );
}

export async function saveMedicalDocumentSettings(
  input: z.infer<typeof medicalDocumentSettingsSchema>,
  actorUserId: string | null
): Promise<MedicalDocumentSettings> {
  const payload = normalizeMedicalDocumentSettings({
    ...input,
    updatedAt: new Date().toISOString()
  });

  return withMemoryFallback(
    async () => {
      const saved = await prisma.$transaction(async (tx) => {
        const existing = await tx.textDoc.findFirst({
          where: {
            moduleKey: MODULE_KEY,
            serviceKey: SERVICE_KEY,
            subjectType: SUBJECT_TYPE,
            subjectRef: SUBJECT_REF
          },
          include: {
            versions: {
              orderBy: { versionNo: "desc" },
              take: 1
            }
          }
        });

        let docId = existing?.id;
        let nextVersionNo = (existing?.versions?.[0]?.versionNo || 0) + 1;
        if (!docId) {
          const created = await tx.textDoc.create({
            data: {
              id: randomUUID(),
              title: "Configuración documentos clínicos",
              moduleKey: MODULE_KEY,
              serviceKey: SERVICE_KEY,
              subjectType: SUBJECT_TYPE,
              subjectRef: SUBJECT_REF
            }
          });
          docId = created.id;
          nextVersionNo = 1;
        } else {
          await tx.textDoc.update({
            where: { id: docId },
            data: { title: "Configuración documentos clínicos" }
          });
        }

        await tx.textDocVersion.create({
          data: {
            docId,
            versionNo: nextVersionNo,
            contentJson: payload as unknown as Prisma.InputJsonValue,
            contentHtml: renderSettingsHtml(payload),
            createdById: actorUserId
          }
        });

        return payload;
      });

      globalForMedical.medicalDocumentSettingsMemory = saved;
      return saved;
    },
    () => {
      globalForMedical.medicalDocumentSettingsMemory = payload;
      return payload;
    }
  );
}
