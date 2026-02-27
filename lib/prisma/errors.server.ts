import "server-only";

import { recordPrismaSchemaEvent } from "@/lib/ops/eventLog.server";
import { setPrismaSchemaEventWriter, type PrismaSchemaEventPayload } from "@/lib/prisma/errors";

let writerInitialized = false;

function writePrismaSchemaEvent(payload: PrismaSchemaEventPayload) {
  return recordPrismaSchemaEvent({
    domain: payload.domain,
    context: payload.context,
    issue: payload.issue,
    classification: payload.classification,
    code: payload.code,
    table: payload.table,
    actionHint: payload.actionHint,
    detail: payload.detail
  });
}

function ensurePrismaSchemaEventWriter() {
  if (writerInitialized) return;
  setPrismaSchemaEventWriter(writePrismaSchemaEvent);
  writerInitialized = true;
}

ensurePrismaSchemaEventWriter();

export * from "@/lib/prisma/errors";
