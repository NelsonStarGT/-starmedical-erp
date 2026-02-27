"use client";

import { useEffect, useState } from "react";
import {
  getConfigAuthCircuitState,
  subscribeConfigAuthCircuit,
  type ConfigAuthCircuitState
} from "@/lib/config-central/clientAuth";

export function useConfigAuthCircuitState() {
  const [state, setState] = useState<ConfigAuthCircuitState>(getConfigAuthCircuitState);

  useEffect(() => {
    return subscribeConfigAuthCircuit((next) => setState(next));
  }, []);

  return state;
}
