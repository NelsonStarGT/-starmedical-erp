"use client";

import { useEffect, useRef } from "react";

export type EncounterUiPreferences = {
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  focusMode: boolean;
};

type UseEncounterEditorArgs = {
  uiPrefsKey: string;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  focusMode: boolean;
  setLeftPanelOpen: (next: boolean) => void;
  setRightPanelOpen: (next: boolean) => void;
  setFocusMode: (next: boolean) => void;
  isDirty: boolean;
};

export function useEncounterEditor({
  uiPrefsKey,
  leftPanelOpen,
  rightPanelOpen,
  focusMode,
  setLeftPanelOpen,
  setRightPanelOpen,
  setFocusMode,
  isDirty
}: UseEncounterEditorArgs) {
  const prefsLoadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || prefsLoadedRef.current) return;
    try {
      const raw = window.localStorage.getItem(uiPrefsKey);
      if (!raw) {
        prefsLoadedRef.current = true;
        return;
      }
      const parsed = JSON.parse(raw) as Partial<EncounterUiPreferences>;
      if (typeof parsed.leftPanelOpen === "boolean") setLeftPanelOpen(parsed.leftPanelOpen);
      if (typeof parsed.rightPanelOpen === "boolean") setRightPanelOpen(parsed.rightPanelOpen);
      if (typeof parsed.focusMode === "boolean") setFocusMode(parsed.focusMode);
    } catch {
      // ignore malformed local prefs
    } finally {
      prefsLoadedRef.current = true;
    }
  }, [setFocusMode, setLeftPanelOpen, setRightPanelOpen, uiPrefsKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !prefsLoadedRef.current) return;
    const nextPrefs: EncounterUiPreferences = {
      leftPanelOpen,
      rightPanelOpen,
      focusMode
    };
    try {
      window.localStorage.setItem(uiPrefsKey, JSON.stringify(nextPrefs));
    } catch {
      // ignore quota errors
    }
  }, [focusMode, leftPanelOpen, rightPanelOpen, uiPrefsKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
