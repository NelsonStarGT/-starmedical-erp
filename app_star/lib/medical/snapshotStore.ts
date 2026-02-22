import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import type { EncounterSnapshot } from "@/components/medical/encounter/types";
import { prisma } from "@/lib/prisma";
import { isPrismaMissingTableError, warnDevMissingTable } from "@/lib/prisma/errors";
import { getDefaultDocumentBrandingTemplate } from "@/lib/medical/documentBrandingStore";
import { renderEncounterSnapshotHtmlWithBranding } from "@/lib/medical/snapshot";

const MODULE_KEY = "MEDICAL";
const SERVICE_KEY = "CONSULTAM_SNAPSHOT";
const SUBJECT_TYPE = "ENCOUNTER_SNAPSHOT";

export type SavedSnapshot = {
  docId: string;
  versionNo: number;
  snapshot: EncounterSnapshot;
  html: string;
  createdAt: string;
};

const globalForMedical = globalThis as unknown as {
  encounterSnapshotMemory?: Map<string, SavedSnapshot>;
  encounterSnapshotForceMemory?: boolean;
};

function memoryStore() {
  if (!globalForMedical.encounterSnapshotMemory) {
    globalForMedical.encounterSnapshotMemory = new Map();
  }
  return globalForMedical.encounterSnapshotMemory;
}

async function withMemoryFallback<T>(dbOperation: () => Promise<T>, memoryOperation: () => Promise<T> | T): Promise<T> {
  if (globalForMedical.encounterSnapshotForceMemory) return await memoryOperation();

  try {
    return await dbOperation();
  } catch (error) {
    if (!isPrismaMissingTableError(error)) throw error;
    warnDevMissingTable("encounter-snapshot", error);
    globalForMedical.encounterSnapshotForceMemory = true;
    return await memoryOperation();
  }
}

export async function getEncounterSnapshot(encounterId: string): Promise<SavedSnapshot | null> {
  return withMemoryFallback(
    async () => {
      const doc = await prisma.textDoc.findFirst({
        where: {
          moduleKey: MODULE_KEY,
          serviceKey: SERVICE_KEY,
          subjectType: SUBJECT_TYPE,
          subjectRef: encounterId
        },
        include: {
          versions: {
            orderBy: { versionNo: "desc" },
            take: 1
          }
        }
      });

      const version = doc?.versions[0];
      if (!doc || !version) return null;

      const snapshot = version.contentJson as EncounterSnapshot;
      return {
        docId: doc.id,
        versionNo: version.versionNo,
        snapshot,
        html: version.contentHtml,
        createdAt: version.createdAt.toISOString()
      };
    },
    async () => memoryStore().get(encounterId) || null
  );
}

export async function createEncounterSnapshot(params: {
  encounterId: string;
  snapshot: EncounterSnapshot;
  actorUserId: string | null;
}) {
  return withMemoryFallback(
    async () => {
      const existing = await prisma.textDoc.findFirst({
        where: {
          moduleKey: MODULE_KEY,
          serviceKey: SERVICE_KEY,
          subjectType: SUBJECT_TYPE,
          subjectRef: params.encounterId
        },
        include: {
          versions: {
            orderBy: { versionNo: "desc" },
            take: 1
          }
        }
      });

      if (existing?.versions?.[0]) {
        const version = existing.versions[0];
        return {
          ok: false as const,
          reason: "already_signed",
          saved: {
            docId: existing.id,
            versionNo: version.versionNo,
            snapshot: version.contentJson as EncounterSnapshot,
            html: version.contentHtml,
            createdAt: version.createdAt.toISOString()
          }
        };
      }

      const branding = await getDefaultDocumentBrandingTemplate();
      const html = renderEncounterSnapshotHtmlWithBranding(params.snapshot, branding);

      const saved = await prisma.$transaction(async (tx) => {
        const doc =
          existing ||
          (await tx.textDoc.create({
            data: {
              id: randomUUID(),
              title: `Snapshot clínico ${params.encounterId}`,
              moduleKey: MODULE_KEY,
              serviceKey: SERVICE_KEY,
              subjectType: SUBJECT_TYPE,
              subjectRef: params.encounterId
            }
          }));

        const nextVersionNo = (existing?.versions?.[0]?.versionNo || 0) + 1;

        const version = await tx.textDocVersion.create({
          data: {
            docId: doc.id,
            versionNo: nextVersionNo,
            contentJson: params.snapshot as unknown as Prisma.InputJsonValue,
            contentHtml: html,
            createdById: params.actorUserId
          }
        });

        return {
          docId: doc.id,
          versionNo: version.versionNo,
          snapshot: params.snapshot,
          html,
          createdAt: version.createdAt.toISOString()
        };
      });

      return { ok: true as const, saved };
    },
    async () => {
      const memory = memoryStore();
      const existing = memory.get(params.encounterId);
      if (existing) {
        return {
          ok: false as const,
          reason: "already_signed",
          saved: existing
        };
      }

      const createdAt = new Date().toISOString();
      const branding = await getDefaultDocumentBrandingTemplate();
      const html = renderEncounterSnapshotHtmlWithBranding(params.snapshot, branding);
      const saved: SavedSnapshot = {
        docId: `mem-snapshot-${params.encounterId}`,
        versionNo: 1,
        snapshot: params.snapshot,
        html,
        createdAt
      };
      memory.set(params.encounterId, saved);
      return { ok: true as const, saved };
    }
  );
}
