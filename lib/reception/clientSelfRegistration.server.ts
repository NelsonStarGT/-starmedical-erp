import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { reserveNextClientRegistrationCodeTx } from "@/lib/reception/clientRegistrationCode";
import {
  createClientRegistrationReceiptToken,
  hashClientRegistrationToken,
  verifyClientRegistrationInviteToken,
  verifyClientRegistrationReceiptToken
} from "@/lib/reception/clientRegistrationTokens";
import {
  getClientSelfRegistrationFormOptions,
  summarizeClientSelfRegistrationPayload,
  validateClientSelfRegistrationPayload
} from "@/lib/reception/clientSelfRegistration";

export type ResolvedClientRegistrationInvite = {
  id: string;
  tenantId: string;
  clientType: "PERSON" | "COMPANY" | "INSTITUTION" | "INSURER";
  note: string | null;
  expiresAt: Date;
};

export async function resolveClientRegistrationInviteByToken(rawToken: string): Promise<ResolvedClientRegistrationInvite | null> {
  const payload = verifyClientRegistrationInviteToken(rawToken);
  if (!payload) return null;

  const invite = await prisma.clientRegistrationInvite.findFirst({
    where: {
      id: payload.inviteId,
      tenantId: payload.tenantId,
      tokenHash: hashClientRegistrationToken(rawToken),
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    select: {
      id: true,
      tenantId: true,
      clientType: true,
      note: true,
      expiresAt: true
    }
  });

  if (!invite) return null;
  if (invite.clientType !== payload.clientType) return null;

  return invite;
}

export async function getClientSelfRegistrationPublicContext(rawToken: string) {
  const invite = await resolveClientRegistrationInviteByToken(rawToken);
  if (!invite) return null;

  const options = await getClientSelfRegistrationFormOptions(invite.tenantId);
  return {
    invite,
    options
  };
}

export async function createClientSelfRegistrationPendingFromToken(input: {
  rawToken: string;
  payload: unknown;
  requestMeta?: {
    ipHash?: string | null;
    userAgentHash?: string | null;
  };
}) {
  const invite = await resolveClientRegistrationInviteByToken(input.rawToken);
  if (!invite) {
    throw new Error("El enlace de registro no es válido o expiró.");
  }

  const normalizedPayload = validateClientSelfRegistrationPayload({
    clientType: invite.clientType,
    payload: input.payload
  });

  const summary = summarizeClientSelfRegistrationPayload(normalizedPayload);

  const created = await prisma.$transaction(async (tx) => {
    const reservedCode = await reserveNextClientRegistrationCodeTx(tx, {
      tenantId: invite.tenantId,
      clientType: invite.clientType
    });

    return tx.clientSelfRegistration.create({
      data: {
        tenantId: invite.tenantId,
        inviteId: invite.id,
        clientType: invite.clientType,
        provisionalCode: reservedCode.code,
        payloadJson: normalizedPayload as unknown as Prisma.InputJsonValue,
        displayName: summary.displayName,
        documentRef: summary.documentRef,
        email: summary.email,
        phone: summary.phone,
        submittedFromIpHash: input.requestMeta?.ipHash ?? null,
        submittedFromUserAgent: input.requestMeta?.userAgentHash ?? null
      },
      select: {
        id: true,
        provisionalCode: true,
        clientType: true,
        status: true,
        createdAt: true,
        tenantId: true,
        displayName: true
      }
    });
  });

  const receiptToken = createClientRegistrationReceiptToken({
    registrationId: created.id,
    tenantId: created.tenantId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3)
  });

  return {
    id: created.id,
    provisionalCode: created.provisionalCode,
    clientType: created.clientType,
    status: created.status,
    createdAt: created.createdAt,
    tenantId: created.tenantId,
    displayName: created.displayName,
    receiptToken
  };
}

export async function resolveClientSelfRegistrationByReceiptToken(rawToken: string) {
  const payload = verifyClientRegistrationReceiptToken(rawToken);
  if (!payload) return null;

  const row = await prisma.clientSelfRegistration.findFirst({
    where: {
      id: payload.registrationId,
      tenantId: payload.tenantId
    },
    select: {
      id: true,
      tenantId: true,
      provisionalCode: true,
      clientType: true,
      status: true,
      displayName: true,
      createdAt: true
    }
  });

  return row;
}
