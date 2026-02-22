"use client";

import { useMemo } from "react";
import type { ReceptionCapability } from "@/lib/reception/permissions";

export function useQueuePermissions(capabilities: ReceptionCapability[]) {
  return useMemo(() => {
    const has = (capability: ReceptionCapability) => capabilities.includes(capability);
    return {
      canEnqueue: has("QUEUE_ENQUEUE"),
      canCallNext: has("QUEUE_CALL_NEXT"),
      canStart: has("QUEUE_START"),
      canComplete: has("QUEUE_COMPLETE"),
      canPauseResume: has("QUEUE_PAUSE_RESUME"),
      canSkip: has("QUEUE_SKIP"),
      canTransfer: has("QUEUE_TRANSFER")
    };
  }, [capabilities]);
}

