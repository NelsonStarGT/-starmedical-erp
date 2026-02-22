'use client';

import { useEffect, useState } from "react";
import { initialAutomations, templates } from "../data";
import type { Automation, Template } from "../types";

const STORAGE_KEY = "ops-whatsapp-automations";

function randomId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function useAutomationsMock() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setAutomations(JSON.parse(stored));
      } else {
        setAutomations(initialAutomations);
      }
    } catch {
      setAutomations(initialAutomations);
    } finally {
      setReady(true);
    }
  }, []);

  const persist = (data: Automation[]) => {
    setAutomations(data);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  };

  const createFromTemplate = (templateId: string, workspaceId: string, numberId: string) => {
    const template = templates.find((tmp) => tmp.id === templateId);
    if (!template) return null;
    const newAutomation: Automation = {
      id: randomId("auto"),
      name: template.name,
      status: "active",
      trigger: template.trigger,
      action: template.steps[template.steps.length - 1] ?? "Acción",
      workspaceId,
      numberId,
      templateId: template.id,
      steps: template.steps,
      message: "Mensaje inicial desde plantilla",
      schedule: "Siempre activo",
      tags: ["auto"],
      assignment: "Equipo general"
    };
    const next = [...automations, newAutomation];
    persist(next);
    return newAutomation.id;
  };

  const toggleStatus = (id: string) => {
    persist(
      automations.map((auto) =>
        auto.id === id ? { ...auto, status: auto.status === "active" ? "paused" : "active" } : auto
      )
    );
  };

  const duplicate = (id: string) => {
    const base = automations.find((auto) => auto.id === id);
    if (!base) return null;
    const clone: Automation = {
      ...base,
      id: randomId("auto"),
      name: `${base.name} (Copia)`
    };
    persist([...automations, clone]);
    return clone.id;
  };

  const updateAutomation = (id: string, payload: Partial<Automation>) => {
    persist(
      automations.map((auto) => (auto.id === id ? { ...auto, ...payload } : auto))
    );
  };

  const getAutomationById = (id: string) => automations.find((auto) => auto.id === id) ?? null;

  return {
    automations,
    ready,
    createFromTemplate,
    toggleStatus,
    duplicate,
    updateAutomation,
    getAutomationById
  };
}
