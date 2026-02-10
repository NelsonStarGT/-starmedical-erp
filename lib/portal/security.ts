import crypto from "crypto";
import { PORTAL_ACCESS_TTL_MINUTES, PORTAL_CHALLENGE_TTL_MINUTES, PORTAL_SESSION_TTL_HOURS } from "@/lib/portal/constants";

function getPortalPepper() {
  return (
    process.env.PORTAL_AUTH_PEPPER ||
    process.env.APP_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.EMAIL_SECRET_KEY ||
    "dev-star-portal-pepper"
  );
}

export function hashPortalSecret(raw: string) {
  return crypto.createHash("sha256").update(`${getPortalPepper()}:${raw}`).digest("hex");
}

export function generatePortalToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString("base64url");
}

export function generatePortalOtpCode(length = 6) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

export function addMinutes(baseDate: Date, minutes: number) {
  return new Date(baseDate.getTime() + minutes * 60_000);
}

export function buildPortalChallengeExpiry(now = new Date()) {
  return addMinutes(now, PORTAL_CHALLENGE_TTL_MINUTES);
}

export function buildPortalAccessExpiry(now = new Date()) {
  return addMinutes(now, PORTAL_ACCESS_TTL_MINUTES);
}

export function buildPortalRefreshExpiry(now = new Date()) {
  return addMinutes(now, PORTAL_SESSION_TTL_HOURS * 60);
}

export function buildPortalSessionExpiry(now = new Date()) {
  return buildPortalRefreshExpiry(now);
}

export function normalizeEmail(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || null;
}

export function normalizePhone(value?: string | null) {
  const normalized = String(value || "").replace(/[^\d]/g, "");
  return normalized.length >= 8 ? normalized : null;
}

export function normalizeDpi(value?: string | null) {
  const normalized = String(value || "").replace(/[^\d]/g, "");
  return normalized.length >= 6 ? normalized : null;
}

export function maskDestination(destination: string) {
  const value = String(destination || "").trim();
  if (!value) return "destino oculto";

  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    if (!domain) return "***";
    const visible = local.slice(0, 2);
    return `${visible}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
  }

  const digits = value.replace(/[^\d]/g, "");
  if (digits.length >= 4) {
    const suffix = digits.slice(-4);
    return `${"*".repeat(Math.max(1, digits.length - 4))}${suffix}`;
  }

  return "***";
}
