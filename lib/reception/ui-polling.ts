"use client";

import { useEffect, useRef } from "react";

type PollingOptions = {
  intervalMs: number;
  enabled?: boolean;
  immediate?: boolean;
  onTick: (signal: AbortSignal) => void | Promise<void>;
};

export function usePolling({ intervalMs, enabled = true, immediate = false, onTick }: PollingOptions) {
  const saved = useRef(onTick);

  useEffect(() => {
    saved.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;
    let isActive = true;
    let controller = new AbortController();

    const run = async () => {
      if (!isActive) return;
      controller.abort();
      controller = new AbortController();
      try {
        await saved.current(controller.signal);
      } catch (err) {
        if ((err as any)?.name === "AbortError") return;
        console.error("[reception] polling error", err);
      }
    };

    if (immediate) {
      void run();
    }

    const timer = setInterval(run, intervalMs);
    return () => {
      isActive = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [intervalMs, enabled, immediate]);
}
