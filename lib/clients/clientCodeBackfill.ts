import { ClientProfileType } from "@prisma/client";
import {
  assignSequentialClientCodes,
  normalizeClientCode,
  resolveClientCodePrefix,
  CLIENT_CODE_PADDING
} from "@/lib/clients/clientCode";

export type ClientCodeBackfillPlanInput = {
  clientType: ClientProfileType;
  existingCodes: ReadonlyArray<string | null | undefined>;
  pendingClientIds: ReadonlyArray<string>;
  minDigits?: number;
};

export type ClientCodeBackfillPlan = {
  prefix: string;
  updates: Array<{ clientId: string; clientCode: string }>;
  nextNumber: number;
};

export function buildClientCodeBackfillPlan(input: ClientCodeBackfillPlanInput): ClientCodeBackfillPlan {
  const prefix = resolveClientCodePrefix(input.clientType);
  const pendingClientIds = input.pendingClientIds.filter(Boolean);
  const minDigits = Number.isFinite(input.minDigits) ? Math.max(3, Math.floor(input.minDigits as number)) : CLIENT_CODE_PADDING;

  const existingCodes = input.existingCodes
    .map((value) => normalizeClientCode(value))
    .filter((value): value is string => Boolean(value));

  const allocation = assignSequentialClientCodes({
    prefix,
    existingCodes,
    count: pendingClientIds.length,
    minDigits
  });

  const updates = pendingClientIds
    .map((clientId, index) => {
      const clientCode = allocation.codes[index];
      if (!clientId || !clientCode) return null;
      return { clientId, clientCode };
    })
    .filter((item): item is { clientId: string; clientCode: string } => Boolean(item));

  return {
    prefix,
    updates,
    nextNumber: allocation.nextNumber
  };
}

