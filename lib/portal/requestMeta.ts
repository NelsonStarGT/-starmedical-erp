import { hashPortalSecret } from "@/lib/portal/security";

export type PortalRequestMeta = {
  ip: string | null;
  userAgent: string | null;
  ipHash: string | null;
  userAgentHash: string | null;
};

function normalizeIp(raw: string | null) {
  if (!raw) return null;
  const value = raw.trim();
  return value || null;
}

export function readPortalRequestMeta(headers: Headers): PortalRequestMeta {
  const forwarded = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const ip = normalizeIp(
    forwarded
      ? forwarded
          .split(",")
          .map((part) => part.trim())
          .find(Boolean) || null
      : realIp
  );
  const userAgent = normalizeIp(headers.get("user-agent"));

  return {
    ip,
    userAgent,
    ipHash: ip ? hashPortalSecret(ip) : null,
    userAgentHash: userAgent ? hashPortalSecret(userAgent) : null
  };
}
