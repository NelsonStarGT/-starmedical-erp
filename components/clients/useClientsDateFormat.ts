"use client";

import { useMemo } from "react";
import { normalizeClientsDateFormat, type ClientsDateFormat } from "@/lib/clients/dateFormat";

export function useClientsDateFormat(value: unknown): ClientsDateFormat {
  return useMemo(() => normalizeClientsDateFormat(value), [value]);
}
