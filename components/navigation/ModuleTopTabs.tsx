"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type ModuleTopTabItem = {
  label: string;
  href?: string;
  matchPrefix?: string;
  disabled?: boolean;
  activeMatch?: (pathname: string) => boolean;
  onClick?: (href: string) => boolean;
};

type Props = {
  items: ModuleTopTabItem[];
  rightSlot?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
};

const MORE_LABEL = "⋯ Más";
const ACTIVE_MATCH_BONUS = 10_000;

function hrefToPath(href: string) {
  return href.split(/[?#]/)[0];
}

function matchesPathBoundary(pathname: string, base: string) {
  if (pathname === base) return true;
  if (!pathname.startsWith(base)) return false;
  const next = pathname.charAt(base.length);
  return next === "/";
}

function arrayEqual(a: number[], b: number[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function sumWidths(indices: number[], widths: number[], gap: number) {
  if (!indices.length) return 0;
  let total = 0;
  for (const idx of indices) total += widths[idx] ?? 0;
  total += gap * (indices.length - 1);
  return total;
}

function isValidIndex(idx: number, length: number) {
  return Number.isInteger(idx) && idx >= 0 && idx < length;
}

function computeActiveIndex(items: ModuleTopTabItem[], pathname: string) {
  let bestIndex = -1;
  let bestScore = -1;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.href || item.disabled) continue;

    if (item.activeMatch) {
      if (!item.activeMatch(pathname)) continue;
      const score = ACTIVE_MATCH_BONUS;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
      continue;
    }

    const base = item.matchPrefix ?? hrefToPath(item.href);
    if (!base) continue;
    if (!matchesPathBoundary(pathname, base)) continue;

    const score = base.length;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

export default function ModuleTopTabs({
  items,
  rightSlot,
  className,
  ariaLabel = "Sub-navegación del módulo"
}: Props) {
  const pathname = usePathname() || "";

  const activeIndex = useMemo(() => computeActiveIndex(items, pathname), [items, pathname]);

  const rootRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const measureRowRef = useRef<HTMLDivElement | null>(null);
  const measureItemRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const measureMoreRef = useRef<HTMLSpanElement | null>(null);

  const [visibleIndices, setVisibleIndices] = useState<number[]>(() => items.map((_, i) => i));
  const [menuOpen, setMenuOpen] = useState(false);
  const safeVisibleIndices = useMemo(() => visibleIndices.filter((idx) => isValidIndex(idx, items.length)), [visibleIndices, items.length]);

  const recompute = useCallback(() => {
    const viewport = viewportRef.current;
    const measureRow = measureRowRef.current;
    if (!viewport || !measureRow) return;

    const available = viewport.clientWidth;
    if (!available) return;

    const computed = getComputedStyle(measureRow);
    const gap = parseFloat(computed.columnGap || computed.gap || "0") || 0;

    const widths = items.map((_, idx) => measureItemRefs.current[idx]?.getBoundingClientRect().width ?? 0);
    const moreWidth = measureMoreRef.current?.getBoundingClientRect().width ?? 0;
    const allIndices = items.map((_, idx) => idx);

    const fitsAll = sumWidths(allIndices, widths, gap) <= available;
    if (fitsAll) {
      setVisibleIndices((prev) => (arrayEqual(prev, allIndices) ? prev : allIndices));
      return;
    }

    const pinned = new Set<number>();
    if (items.length) pinned.add(0);
    if (activeIndex >= 0) pinned.add(activeIndex);

    let nextVisible = [...allIndices];
    const totalWithMore = () => sumWidths(nextVisible, widths, gap) + (nextVisible.length ? gap : 0) + moreWidth;

    while (nextVisible.length && totalWithMore() > available) {
      let toRemove: number | undefined;
      for (let i = nextVisible.length - 1; i >= 0; i--) {
        const idx = nextVisible[i];
        if (!pinned.has(idx)) {
          toRemove = idx;
          break;
        }
      }
      if (toRemove === undefined) break;
      nextVisible = nextVisible.filter((idx) => idx !== toRemove);
    }

    if (items.length && totalWithMore() > available) {
      nextVisible = [0];
    }

    setVisibleIndices((prev) => (arrayEqual(prev, nextVisible) ? prev : nextVisible));
  }, [items, activeIndex]);

  useLayoutEffect(() => {
    recompute();
  }, [recompute]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (typeof ResizeObserver === "undefined") {
      const handleResize = () => recompute();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }

    const ro = new ResizeObserver(() => recompute());
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [recompute]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (event.target instanceof Node && root.contains(event.target)) return;
      setMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const overflowIndices = useMemo(() => {
    const visible = new Set(safeVisibleIndices);
    return items.map((_, idx) => idx).filter((idx) => !visible.has(idx));
  }, [items, safeVisibleIndices]);

  const showMore = overflowIndices.length > 0;
  const moreActive = showMore && activeIndex >= 0 && overflowIndices.includes(activeIndex);

  const baseTabClasses = cn(
    "module-top-tabs__tab inline-flex items-center rounded-lg border px-3 py-2 text-sm font-semibold whitespace-nowrap transition",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-diagnostics-primary focus-visible:ring-offset-2"
  );

  const inactiveClasses = "border-transparent text-slate-700 hover:border-diagnostics-secondary hover:bg-white hover:text-diagnostics-corporate";
  const activeClasses = "border-diagnostics-primary bg-white text-diagnostics-corporate shadow-sm";
  const disabledClasses = "border-transparent text-slate-400 cursor-not-allowed";

  return (
    <nav
      ref={rootRef}
      aria-label={ariaLabel}
      className={cn(
        "module-top-tabs relative flex items-center gap-3 rounded-xl border border-slate-200 bg-diagnostics-background p-2 shadow-sm",
        className
      )}
    >
      <div ref={viewportRef} className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
          {safeVisibleIndices.map((idx) => {
            const item = items[idx];
            if (!item) return null;
            const isActive = idx === activeIndex && !moreActive;
            const isDisabled = Boolean(item.disabled || !item.href);
            const tabClassName = cn(baseTabClasses, isDisabled ? disabledClasses : isActive ? activeClasses : inactiveClasses);

            if (isDisabled) {
              return (
                <span key={`${item.label}-${idx}`} aria-disabled="true" className={tabClassName}>
                  {item.label}
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href!}
                aria-current={isActive ? "page" : undefined}
                onClick={(event) => {
                  if (!item.onClick) return;
                  const shouldPrevent = item.onClick(item.href!);
                  if (shouldPrevent) event.preventDefault();
                }}
                className={tabClassName}
              >
                {item.label}
              </Link>
            );
          })}

          {showMore && (
            <div className="relative shrink-0">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className={cn(baseTabClasses, moreActive ? activeClasses : inactiveClasses)}
              >
                {MORE_LABEL}
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                >
                  <div className="max-h-80 overflow-auto p-1">
                    {overflowIndices.map((idx) => {
                      const item = items[idx];
                      if (!item) return null;
                      const isActive = idx === activeIndex;
                      const isDisabled = Boolean(item.disabled || !item.href);
                      const rowClasses = cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition",
                        isDisabled
                          ? "cursor-not-allowed text-slate-400"
                          : isActive
                            ? "bg-diagnostics-primary/10 text-diagnostics-corporate"
                            : "text-slate-700 hover:bg-diagnostics-secondary/10 hover:text-diagnostics-corporate"
                      );

                      if (isDisabled) {
                        return (
                          <div key={`${item.label}-${idx}`} role="menuitem" aria-disabled="true" className={rowClasses}>
                            <span className="truncate">{item.label}</span>
                            <span className="ml-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">No disponible</span>
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={item.href}
                          role="menuitem"
                          href={item.href!}
                          onClick={(event) => {
                            if (item.onClick) {
                              const shouldPrevent = item.onClick(item.href!);
                              if (shouldPrevent) {
                                event.preventDefault();
                                return;
                              }
                            }
                            setMenuOpen(false);
                          }}
                          className={rowClasses}
                        >
                          <span className="truncate">{item.label}</span>
                          {isActive && (
                            <span className="ml-2 rounded-full bg-diagnostics-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white">
                              Activo
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}

      <div className="absolute -left-[10000px] top-0 opacity-0 pointer-events-none" aria-hidden="true">
        <div ref={measureRowRef} className="flex items-center gap-1.5 whitespace-nowrap">
          {items.map((item, idx) => (
            <span
              key={`${item.label}-${idx}`}
              ref={(el) => {
                measureItemRefs.current[idx] = el;
              }}
              className={cn(baseTabClasses, inactiveClasses)}
            >
              {item.label}
            </span>
          ))}
          <span ref={measureMoreRef} className={cn(baseTabClasses, inactiveClasses)}>
            {MORE_LABEL}
          </span>
        </div>
      </div>
    </nav>
  );
}
