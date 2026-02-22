'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Placement = "top" | "bottom";
type Align = "start" | "end";

type Options = {
  offset?: number;
  align?: Align;
  minWidthFromTrigger?: boolean;
  minWidth?: number;
  maxWidth?: number;
  width?: number;
  preferPlacement?: Placement;
};

export function useAnchoredPopover({
  offset = 8,
  align = "start",
  minWidthFromTrigger = false,
  minWidth,
  maxWidth = 360,
  width,
  preferPlacement = "bottom"
}: Options = {}) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: "hidden" });
  const [placement, setPlacement] = useState<Placement>("bottom");
  const triggerRef = useRef<HTMLElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const computePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const pop = popoverRef.current;
    if (!trigger || !pop) return;

    const triggerRect = trigger.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    const viewportPadding = 12;
    const baseDesired =
      width ??
      (minWidthFromTrigger
        ? Math.max(triggerRect.width, minWidth || 0, popRect.width || 0)
        : Math.max(minWidth || 0, popRect.width || 0));
    const viewportLimit = Math.max(0, window.innerWidth - viewportPadding * 2);
    const finalWidth = Math.min(baseDesired || 240, maxWidth, viewportLimit || 320);
    const popWidth = finalWidth;
    const popHeight = popRect.height || 240;

    let left = align === "start" ? triggerRect.left : triggerRect.right - popWidth;
    let top = preferPlacement === "bottom" ? triggerRect.bottom + offset : triggerRect.top - offset - popHeight;
    let nextPlacement: Placement = preferPlacement;

    if (nextPlacement === "bottom" && top + popHeight > window.innerHeight - viewportPadding) {
      nextPlacement = "top";
      top = triggerRect.top - offset - popHeight;
    } else if (nextPlacement === "top" && top < viewportPadding) {
      nextPlacement = "bottom";
      top = triggerRect.bottom + offset;
    }

    if (left + popWidth > window.innerWidth - viewportPadding) {
      left = window.innerWidth - viewportPadding - popWidth;
    }
    if (left < viewportPadding) left = viewportPadding;

    setPlacement(nextPlacement);
    setStyle({
      position: "fixed",
      top,
      left,
      width: popWidth,
      zIndex: 60,
      visibility: "visible"
    });
  }, [align, maxWidth, minWidth, minWidthFromTrigger, offset, preferPlacement, width]);

  const setTriggerRef = (el: HTMLElement | null) => {
    triggerRef.current = el;
  };
  const setPopoverRef = (el: HTMLDivElement | null) => {
    popoverRef.current = el;
  };

  useEffect(() => {
    if (!open) return;
    setStyle((prev) => ({ ...prev, visibility: "hidden" }));
    const id = requestAnimationFrame(computePosition);
    const onResize = () => computePosition();
    const onScroll = () => computePosition();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(false);
    };
    const onPointer = (ev: PointerEvent) => {
      const target = ev.target as Node;
      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer, true);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onResize);
      window.visualViewport.addEventListener("scroll", onScroll);
    }
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer, true);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", onResize);
        window.visualViewport.removeEventListener("scroll", onScroll);
      }
    };
  }, [open, computePosition]);

  return { open, setOpen, triggerRef, popoverRef, style, placement, setTriggerRef, setPopoverRef };
}

export const PopoverPortal = ({ children }: { children: React.ReactNode }) =>
  typeof document !== "undefined" ? createPortal(children, document.body) : null;

export default useAnchoredPopover;
