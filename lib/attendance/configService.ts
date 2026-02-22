import { randomUUID } from "crypto";
import { z } from "zod";
import { AttendanceLivenessLevel, AttendancePunchToken } from "@prisma/client";

export const ALLOWED_SOURCES = ["SELFIE_WEB", "BIOMETRIC", "MANUAL_IMPORT"] as const;
const MIN_RADIUS = 20;
const MAX_RADIUS = 500;
const MAX_WINDOW = 240;

const siteConfigSchema = z.object({
  siteId: z.string().trim().min(1, "siteId requerido"),
  customerId: z.string().trim().min(1).optional(),
  lat: z.number().finite(),
  lng: z.number().finite(),
  radiusMeters: z.number().int(),
  allowOutOfZone: z.boolean().optional(),
  requirePhoto: z.boolean().optional(),
  requireLiveness: z.enum(["OFF", "BASIC", "PROVIDER"]).optional(),
  windowBeforeMinutes: z.number().int().nonnegative().max(MAX_WINDOW).optional(),
  windowAfterMinutes: z.number().int().nonnegative().max(MAX_WINDOW).optional(),
  antiPassback: z.boolean().optional(),
  allowedSources: z.array(z.enum(ALLOWED_SOURCES)).optional()
});

const punchTokenSchema = z.object({
  siteId: z.string().trim().min(1, "siteId requerido"),
  employeeId: z.string().trim().min(1).optional(),
  expiresAt: z.string().datetime().optional()
});

export type SiteConfigInput = z.infer<typeof siteConfigSchema>;

export function validateSiteConfigInput(raw: unknown) {
  const parsed = siteConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };
  }
  if (parsed.data.lat < -90 || parsed.data.lat > 90 || parsed.data.lng < -180 || parsed.data.lng > 180) {
    throw { status: 400, body: { error: "Lat/Lng fuera de rango" } };
  }

  const radius = Math.min(Math.max(parsed.data.radiusMeters, MIN_RADIUS), MAX_RADIUS);
  if (radius !== parsed.data.radiusMeters) {
    throw { status: 400, body: { error: `Radio debe estar entre ${MIN_RADIUS} y ${MAX_RADIUS} metros` } };
  }

  const windowBefore = parsed.data.windowBeforeMinutes ?? 0;
  const windowAfter = parsed.data.windowAfterMinutes ?? 0;
  if (windowBefore > MAX_WINDOW || windowAfter > MAX_WINDOW) {
    throw { status: 400, body: { error: `Ventanas deben ser menores a ${MAX_WINDOW} minutos` } };
  }

  const allowedSources = parsed.data.allowedSources && parsed.data.allowedSources.length > 0 ? parsed.data.allowedSources : ["SELFIE_WEB"];

  return {
    siteId: parsed.data.siteId.trim(),
    customerId: parsed.data.customerId?.trim() || null,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    radiusMeters: radius,
    allowOutOfZone: parsed.data.allowOutOfZone ?? false,
    requirePhoto: parsed.data.requirePhoto ?? false,
    requireLiveness: (parsed.data.requireLiveness as AttendanceLivenessLevel | undefined) || AttendanceLivenessLevel.OFF,
    windowBeforeMinutes: windowBefore,
    windowAfterMinutes: windowAfter,
    antiPassback: parsed.data.antiPassback ?? false,
    allowedSources
  };
}

export function validatePunchTokenInput(raw: unknown) {
  const parsed = punchTokenSchema.safeParse(raw);
  if (!parsed.success) {
    throw { status: 400, body: { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors } };
  }

  let expiresAt: Date | null = null;
  if (parsed.data.expiresAt) {
    const ts = new Date(parsed.data.expiresAt);
    if (Number.isNaN(ts.getTime())) throw { status: 400, body: { error: "Fecha de expiración inválida" } };
    if (ts.getTime() < Date.now()) throw { status: 400, body: { error: "El token no puede expirar en el pasado" } };
    expiresAt = ts;
  }

  return {
    siteId: parsed.data.siteId.trim(),
    employeeId: parsed.data.employeeId?.trim() || null,
    expiresAt
  };
}

export function isTokenActive(token: Pick<AttendancePunchToken, "expiresAt" | "revokedAt">, now: Date = new Date()) {
  if (token.revokedAt) return false;
  if (token.expiresAt && token.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

export function generatePunchToken() {
  return randomUUID();
}
