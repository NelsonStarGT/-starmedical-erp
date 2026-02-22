"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_IDENTITY, IDENTITY_EVENT, IdentityConfig, fetchIdentityConfig } from "@/lib/identity";

export function useIdentityConfig() {
  const [identity, setIdentity] = useState<IdentityConfig>(DEFAULT_IDENTITY);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const config = await fetchIdentityConfig();
    setIdentity(config);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const config = await fetchIdentityConfig();
      if (!active) return;
      setIdentity(config);
      setIsLoading(false);
    };
    void run();

    const handler = () => {
      void load();
    };
    if (typeof window !== "undefined") {
      window.addEventListener(IDENTITY_EVENT, handler);
    }

    return () => {
      active = false;
      if (typeof window !== "undefined") {
        window.removeEventListener(IDENTITY_EVENT, handler);
      }
    };
  }, [load]);

  return { identity, isLoading, refresh: load };
}
