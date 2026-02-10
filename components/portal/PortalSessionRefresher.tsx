"use client";

import { useEffect } from "react";

export function PortalSessionRefresher({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    void fetch("/portal/api/auth/refresh", {
      method: "POST",
      credentials: "include"
    });
  }, [enabled]);

  return null;
}
