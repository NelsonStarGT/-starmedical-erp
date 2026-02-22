import { AttendanceZoneStatus } from "@prisma/client";

export type PunchConfig = {
  siteId: string;
  employeeId?: string | null;
  lat: number;
  lng: number;
  radiusMeters: number;
  allowOutOfZone: boolean;
  requirePhoto: boolean;
  requireLiveness: "OFF" | "BASIC" | "PROVIDER";
  windowBeforeMinutes: number;
  windowAfterMinutes: number;
  antiPassback: boolean;
  allowedSources: string[];
};

export type LocationReading = { lat: number; lng: number; accuracy?: number };

const toRadians = (value: number) => (value * Math.PI) / 180;

export function distanceInMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371e3;
  const φ1 = toRadians(a.lat);
  const φ2 = toRadians(b.lat);
  const Δφ = toRadians(b.lat - a.lat);
  const Δλ = toRadians(b.lng - a.lng);
  const x = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return Math.round(R * c);
}

export function resolveZone(target: { lat: number; lng: number; radiusMeters: number }, current: { lat: number; lng: number }) {
  const distance = distanceInMeters(target, current);
  const zone: AttendanceZoneStatus = distance <= target.radiusMeters ? "IN_ZONE" : "OUT_OF_ZONE";
  return { zone, distance };
}

export function ensurePunchAllowed(config: PunchConfig, zone: AttendanceZoneStatus, photo?: string | null) {
  if (zone === "OUT_OF_ZONE" && !config.allowOutOfZone) {
    throw { status: 400, message: "Fuera de zona" };
  }
  if (config.requirePhoto && !photo) {
    throw { status: 400, message: "Selfie obligatoria" };
  }
}

export function buildRawPayload(params: {
  config: PunchConfig;
  employeeId: string;
  location: LocationReading;
  zone: AttendanceZoneStatus;
  type: "CHECK_IN" | "CHECK_OUT";
  photoBase64?: string | null;
  userAgent?: string;
}) {
  ensurePunchAllowed(params.config, params.zone, params.photoBase64);

  return {
    employeeId: params.employeeId,
    siteId: params.config.siteId,
    type: params.type,
    source: "SELFIE_WEB" as const,
    lat: params.location.lat,
    lng: params.location.lng,
    accuracy: params.location.accuracy ?? null,
    zoneStatus: params.zone,
    faceStatus: "NO_REFERENCE" as const,
    photoBase64: params.photoBase64 || undefined,
    rawPayload: {
      userAgent: params.userAgent || "",
      zone: params.zone,
      accuracy: params.location.accuracy
    }
  };
}
