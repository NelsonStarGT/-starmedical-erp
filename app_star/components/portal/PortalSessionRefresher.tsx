"use client";

import { useEffect, useRef } from "react";
import { PORTAL_ACCESS_TTL_MINUTES } from "@/lib/portal/constants";

const REFRESH_THRESHOLD_MS = 5 * 60_000;
const RECHECK_INTERVAL_MS = 3 * 60_000;
const REFRESH_ERROR_COOLDOWN_MS = 30_000;
const REFRESH_INTERVAL_JITTER_MS = 10_000;

type PortalSessionRefresherProps = {
  enabled: boolean;
  authSource: "access" | "refresh_fallback";
  accessExpiresAt: number;
};

export function PortalSessionRefresher({ enabled, authSource, accessExpiresAt }: PortalSessionRefresherProps) {
  const accessExpiresAtRef = useRef(accessExpiresAt);
  const nextRetryAtRef = useRef(0);

  useEffect(() => {
    accessExpiresAtRef.current = accessExpiresAt;
  }, [accessExpiresAt]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let inFlight = false;
    let firstCheck = true;
    let timerId: number | null = null;

    const getNextDelayMs = () =>
      RECHECK_INTERVAL_MS + Math.floor(Math.random() * (REFRESH_INTERVAL_JITTER_MS + 1));

    const refreshSessionIfNeeded = async () => {
      if (cancelled || inFlight) return;
      if (document.visibilityState !== "visible") return;
      if (Date.now() < nextRetryAtRef.current) return;

      const now = Date.now();
      const msRemaining = accessExpiresAtRef.current - now;
      const shouldRefresh =
        msRemaining < REFRESH_THRESHOLD_MS || (firstCheck && authSource === "refresh_fallback");
      firstCheck = false;
      if (!shouldRefresh) return;

      inFlight = true;
      try {
        const response = await fetch("/portal/api/auth/refresh", {
          method: "POST",
          credentials: "include"
        });
        if (response.status === 401) {
          window.location.assign("/portal");
          return;
        }
        if (response.ok) {
          type RefreshPayload = {
            accessExpiresAt?: unknown;
            rotationCounter?: unknown;
          };
          const payload = (await response.json().catch(() => null)) as RefreshPayload | null;
          const rawAccessExpiresAt = payload?.accessExpiresAt;
          const accessExpiresAtValue =
            typeof rawAccessExpiresAt === "number"
              ? rawAccessExpiresAt
              : typeof rawAccessExpiresAt === "string"
                ? (Number.isFinite(Number(rawAccessExpiresAt)) ? Number(rawAccessExpiresAt) : Date.parse(rawAccessExpiresAt))
                : Number.NaN;
          if (Number.isFinite(accessExpiresAtValue) && accessExpiresAtValue > Date.now()) {
            accessExpiresAtRef.current = accessExpiresAtValue;
          } else {
            accessExpiresAtRef.current = Date.now() + PORTAL_ACCESS_TTL_MINUTES * 60_000;
          }
          nextRetryAtRef.current = 0;
        } else {
          nextRetryAtRef.current = Date.now() + REFRESH_ERROR_COOLDOWN_MS;
        }
      } catch {
        // Network failures are retried with cooldown to avoid retry loops.
        nextRetryAtRef.current = Date.now() + REFRESH_ERROR_COOLDOWN_MS;
      } finally {
        inFlight = false;
      }
    };

    const scheduleNextTick = () => {
      if (cancelled) return;
      const delayMs = getNextDelayMs();
      timerId = window.setTimeout(() => {
        void (async () => {
          await refreshSessionIfNeeded();
          scheduleNextTick();
        })();
      }, delayMs);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshSessionIfNeeded();
      }
    };

    void refreshSessionIfNeeded();
    scheduleNextTick();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authSource, enabled]);

  return null;
}
