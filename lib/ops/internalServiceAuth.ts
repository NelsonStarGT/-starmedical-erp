import crypto from "node:crypto";

type HeaderBag = Headers | { get(name: string): string | null };

type VerifyInput = {
  headers: HeaderBag;
  body: string;
};

type VerifyResult =
  | { ok: true }
  | { ok: false; error: "missing_signature" | "missing_secret" | "invalid_timestamp" | "stale_timestamp" | "invalid_signature" };

const MAX_SKEW_MS = 5 * 60 * 1000;

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function readBearerToken(headers: HeaderBag) {
  const auth = headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function isOpsResetInternalTokenValid(headers: HeaderBag) {
  const provided =
    readBearerToken(headers) ||
    headers.get("x-ops-reset-token")?.trim() ||
    headers.get("x-ops-token")?.trim() ||
    "";
  if (!provided) return false;

  const candidates = [
    "OPS_APP_RESET_TOKEN",
    "OPS_RESET_TOKEN",
    "OPS_INTERNAL_RESET_TOKEN",
    "OPS_AGENT_TOKEN"
  ];

  for (const key of candidates) {
    const expected = String(process.env[key] || "").trim();
    if (!expected) continue;
    if (safeEqual(provided, expected)) return true;
  }

  return false;
}

export function verifyOpsResetInternalSignature(input: VerifyInput): VerifyResult {
  const secret =
    String(process.env.OPS_APP_RESET_HMAC_SECRET || "").trim() ||
    String(process.env.OPS_RESET_HMAC_SECRET || "").trim() ||
    String(process.env.OPS_INTERNAL_RESET_HMAC_SECRET || "").trim();

  if (!secret) return { ok: false, error: "missing_secret" };

  const signature =
    input.headers.get("x-ops-signature")?.trim() ||
    input.headers.get("x-ops-reset-signature")?.trim() ||
    "";
  const timestampRaw =
    input.headers.get("x-ops-timestamp")?.trim() ||
    input.headers.get("x-ops-reset-timestamp")?.trim() ||
    "";

  if (!signature || !timestampRaw) return { ok: false, error: "missing_signature" };

  const timestamp = Number(timestampRaw);
  if (!Number.isFinite(timestamp)) return { ok: false, error: "invalid_timestamp" };
  if (Math.abs(Date.now() - timestamp) > MAX_SKEW_MS) return { ok: false, error: "stale_timestamp" };

  const expected = crypto.createHmac("sha256", secret).update(`${timestampRaw}.${input.body}`).digest("hex");
  if (!safeEqual(signature, expected)) return { ok: false, error: "invalid_signature" };

  return { ok: true };
}
