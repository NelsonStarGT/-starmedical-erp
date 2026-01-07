"use client";

import { useEffect } from "react";
import { Cita } from "@/lib/types/agenda";

type Handler = (event: { type: string; data: any }) => void;

export function useAgendaUpdates(onEvent: Handler) {
  useEffect(() => {
    const es = new EventSource("/api/agenda/updates");
    const types = ["appointment_created", "appointment_updated", "appointment_deleted"];
    types.forEach((t) =>
      es.addEventListener(t, (evt) => {
        try {
          const data = JSON.parse((evt as MessageEvent).data) as Cita | { id: string };
          onEvent({ type: t, data });
        } catch (e) {
          console.error("Error parsing update", e);
        }
      })
    );
    es.onerror = () => {
      es.close();
    };
    return () => es.close();
  }, [onEvent]);
}
