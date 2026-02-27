import crypto from "crypto";

const INVITE_KIND = "invite" as const;
const RECEIPT_KIND = "receipt" as const;

type InvitePayload = {
  kind: typeof INVITE_KIND;
  inviteId: string;
  tenantId: string;
  clientType: string;
  expMs: number;
};

type ReceiptPayload = {
  kind: typeof RECEIPT_KIND;
  registrationId: string;
  tenantId: string;
  expMs: number;
};

type ParsedTokenPayload = InvitePayload | ReceiptPayload;

function getClientRegistrationSecret() {
  return (
    process.env.CLIENT_REGISTRATION_TOKEN_SECRET ||
    process.env.PORTAL_AUTH_PEPPER ||
    process.env.APP_SECRET ||
    process.env.AUTH_SECRET ||
    "dev-client-registration-secret"
  );
}

function signPayload(payloadB64: string) {
  return crypto.createHmac("sha256", getClientRegistrationSecret()).update(payloadB64).digest("base64url");
}

function encodePayload(payload: ParsedTokenPayload) {
  const payloadJson = JSON.stringify(payload);
  return Buffer.from(payloadJson, "utf8").toString("base64url");
}

function decodePayload(payloadB64: string): ParsedTokenPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as ParsedTokenPayload;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.expMs !== "number" || !Number.isFinite(parsed.expMs)) return null;
    if (parsed.kind === INVITE_KIND) {
      if (!parsed.inviteId || !parsed.tenantId || !parsed.clientType) return null;
      return parsed;
    }
    if (parsed.kind === RECEIPT_KIND) {
      if (!parsed.registrationId || !parsed.tenantId) return null;
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function timingSafeEquals(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function verifySignedToken(rawToken: string): ParsedTokenPayload | null {
  const [payloadB64, signature] = String(rawToken || "").split(".");
  if (!payloadB64 || !signature) return null;

  const expectedSignature = signPayload(payloadB64);
  if (!timingSafeEquals(signature, expectedSignature)) return null;

  const payload = decodePayload(payloadB64);
  if (!payload) return null;
  if (payload.expMs <= Date.now()) return null;

  return payload;
}

export function hashClientRegistrationToken(rawToken: string) {
  return crypto
    .createHash("sha256")
    .update(`${getClientRegistrationSecret()}:${String(rawToken || "")}`)
    .digest("hex");
}

export function createClientRegistrationInviteToken(input: {
  inviteId: string;
  tenantId: string;
  clientType: string;
  expiresAt: Date;
}) {
  const payload: InvitePayload = {
    kind: INVITE_KIND,
    inviteId: input.inviteId,
    tenantId: input.tenantId,
    clientType: input.clientType,
    expMs: input.expiresAt.getTime()
  };
  const payloadB64 = encodePayload(payload);
  return `${payloadB64}.${signPayload(payloadB64)}`;
}

export function verifyClientRegistrationInviteToken(rawToken: string): InvitePayload | null {
  const payload = verifySignedToken(rawToken);
  if (!payload || payload.kind !== INVITE_KIND) return null;
  return payload;
}

export function createClientRegistrationReceiptToken(input: {
  registrationId: string;
  tenantId: string;
  expiresAt: Date;
}) {
  const payload: ReceiptPayload = {
    kind: RECEIPT_KIND,
    registrationId: input.registrationId,
    tenantId: input.tenantId,
    expMs: input.expiresAt.getTime()
  };
  const payloadB64 = encodePayload(payload);
  return `${payloadB64}.${signPayload(payloadB64)}`;
}

export function verifyClientRegistrationReceiptToken(rawToken: string): ReceiptPayload | null {
  const payload = verifySignedToken(rawToken);
  if (!payload || payload.kind !== RECEIPT_KIND) return null;
  return payload;
}
