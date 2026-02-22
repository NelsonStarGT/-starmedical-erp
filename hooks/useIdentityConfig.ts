"use client";

import { useEffect, useMemo, useState } from "react";

type IdentityState = {
  appName: string;
  orgName?: string;
  logoSrc?: string;
  tenantId?: string;
};

type IdentityApiResponse = {
  appName?: string;
  orgName?: string;
  logoSrc?: string;
  logoUrl?: string;
  tenantId?: string;
  data?: {
    appName?: string;
    orgName?: string;
    logoSrc?: string;
    logoUrl?: string;
    tenantId?: string;
  };
};

function toOptional(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseIdentityPayload(payload: unknown): Partial<IdentityState> {
  if (!payload || typeof payload !== "object") return {};
  const response = payload as IdentityApiResponse;
  const source = response.data && typeof response.data === "object" ? response.data : response;

  return {
    appName: toOptional(source.appName),
    orgName: toOptional(source.orgName),
    logoSrc: toOptional(source.logoSrc) || toOptional(source.logoUrl),
    tenantId: toOptional(source.tenantId)
  };
}

function getDefaults(): IdentityState {
  const appName =
    process.env.NEXT_PUBLIC_APP_NAME ||
    process.env.NEXT_PUBLIC_ORG_NAME ||
    process.env.NEXT_PUBLIC_APP_TITLE ||
    "StarMedical";

  const orgName = process.env.NEXT_PUBLIC_ORG_NAME || appName;

  return {
    appName,
    orgName,
    logoSrc:
      process.env.NEXT_PUBLIC_LOGO_SRC ||
      process.env.NEXT_PUBLIC_LOGO_URL ||
      undefined,
    tenantId: process.env.NEXT_PUBLIC_TENANT_ID || undefined
  };
}

export function useIdentityConfig() {
  const [identity, setIdentity] = useState<IdentityState>(() => getDefaults());

  useEffect(() => {
    const controller = new AbortController();

    async function hydrateIdentity() {
      try {
        const response = await fetch("/api/identity", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal
        });

        if (!response.ok) return;

        const json = (await response.json().catch(() => null)) as unknown;
        const parsed = parseIdentityPayload(json);
        if (controller.signal.aborted) return;

        setIdentity((prev) => ({
          appName: parsed.appName || prev.appName,
          orgName: parsed.orgName || prev.orgName,
          logoSrc: parsed.logoSrc || prev.logoSrc,
          tenantId: parsed.tenantId || prev.tenantId
        }));
      } catch {
        // Fallback silencioso: si /api/identity no existe o falla, mantenemos defaults.
      }
    }

    hydrateIdentity();

    return () => {
      controller.abort();
    };
  }, []);

  return useMemo(
    () => ({
      appName: identity.appName,
      orgName: identity.orgName,
      logoSrc: identity.logoSrc,
      tenantId: identity.tenantId,
      identity: {
        name: identity.orgName || identity.appName,
        logoUrl: identity.logoSrc,
        tenantId: identity.tenantId
      }
    }),
    [identity]
  );
}
