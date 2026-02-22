import crypto from "node:crypto";

type HeaderBag = Headers | { get(name: string): string | null };

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

function isTokenValid(headers: HeaderBag, envKeys: string[]) {
  const provided =
    readBearerToken(headers) ||
    headers.get("x-ops-token")?.trim() ||
    headers.get("x-ops-service-token")?.trim() ||
    "";
  if (!provided) return false;

  for (const key of envKeys) {
    const expected = String(process.env[key] || "").trim();
    if (!expected) continue;
    if (safeEqual(provided, expected)) return true;
  }
  return false;
}

export function isOpsServiceTokenValid(headers: HeaderBag) {
  return isTokenValid(headers, [
    "OPS_SERVICE_TOKEN",
    "OPS_INTERNAL_TOKEN",
    "OPS_INTERNAL_HEALTH_TOKEN",
    "OPS_AGENT_TOKEN"
  ]);
}

export function isOpsMetricsTokenValid(headers: HeaderBag) {
  return isTokenValid(headers, [
    "OPS_METRICS_TOKEN",
    "OPS_SERVICE_TOKEN",
    "OPS_INTERNAL_TOKEN",
    "OPS_INTERNAL_METRICS_TOKEN",
    "OPS_AGENT_TOKEN"
  ]);
}
