"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReceptionModuleNavItem = {
  key: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  disabled?: boolean;
  activeMatch?: (pathname: string) => boolean;
  onNavigate?: (href: string) => boolean;
};

type Props = {
  items: ReceptionModuleNavItem[];
  rightSlot?: ReactNode;
  ariaLabel?: string;
  className?: string;
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
  for (let i = 0; i < a.length; i += 1) {
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

function computeActiveIndex(items: ReceptionModuleNavItem[], pathname: string) {
  let bestIndex = -1;
  let bestScore = -1;

  for (let i = 0; i < items.length; i += 1) {
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

    const base = hrefToPath(item.href);
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

export default function ReceptionModuleNav({
  items,
  rightSlot,
  ariaLabel = "Navegación de Recepción",
  className
}: Props) {
  const pathname = usePathname() || "";
  const activeIndex = useMemo(() => computeActiveIndex(items, pathname), [items, pathname]);

  const rootRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const measureRowRef = useRef<HTMLDivElement | null>(null);
  const measureItemRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const measureMoreRef = useRef<HTMLSpanElement | null>(null);

  const [visibleIndices, setVisibleIndices] = useState<number[]>(() => items.map((_, idx) => idx));
  const [menuOpen, setMenuOpen] = useState(false);

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

    if (sumWidths(allIndices, widths, gap) <= available) {
      setVisibleIndices((prev) => (arrayEqual(prev, allIndices) ? prev : allIndices));
      return;
    }

    const pinned = new Set<number>();
    if (items.length) pinned.add(0);
    if (activeIndex >= 0) pinned.add(activeIndex);

    let nextVisible = [...allIndices];
    const totalWithMore = () => sumWidths(nextVisible, widths, gap) + (nextVisible.length ? gap : 0) + moreWidth;

    while (nextVisible.length && totalWithMore() > available) {
      let removeIdx: number | undefined;
      for (let i = nextVisible.length - 1; i >= 0; i -= 1) {
        const idx = nextVisible[i];
        if (!pinned.has(idx)) {
          removeIdx = idx;
          break;
        }
      }
      if (removeIdx === undefined) break;
      nextVisible = nextVisible.filter((idx) => idx !== removeIdx);
    }

    if (items.length && totalWithMore() > available) {
      nextVisible = [0];
    }

    setVisibleIndices((prev) => (arrayEqual(prev, nextVisible) ? prev : nextVisible));
  }, [activeIndex, items]);

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

    const observer = new ResizeObserver(() => recompute());
    observer.observe(viewport);
    return () => observer.disconnect();
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

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const overflowIndices = useMemo(() => {
    const visible = new Set(visibleIndices);
    return items.map((_, idx) => idx).filter((idx) => !visible.has(idx));
  }, [items, visibleIndices]);

  const showMore = overflowIndices.length > 0;
  const moreActive = showMore && activeIndex >= 0 && overflowIndices.includes(activeIndex);

  const baseTabClasses = cn(
    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold whitespace-nowrap transition",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c] focus-visible:ring-offset-2"
  );
  const activeTabClasses = "border-[#2e75ba] bg-white text-[#2e75ba] shadow-sm";
  const inactiveTabClasses = "border-transparent bg-transparent text-slate-700 hover:border-[#4aadf5] hover:bg-white hover:text-[#2e75ba]";
  const disabledTabClasses = "cursor-not-allowed border-transparent bg-transparent text-slate-400";

  return (
    <nav
      ref={rootRef}
      aria-label={ariaLabel}
      className={cn("relative flex items-center gap-3 rounded-xl border border-[#dce7f5] bg-[#f8fafc] p-2 shadow-sm", className)}
    >
      <div ref={viewportRef} className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
          {visibleIndices.map((idx) => {
            const item = items[idx];
            const isActive = idx === activeIndex && !moreActive;
            const isDisabled = Boolean(item.disabled || !item.href);
            const Icon = item.icon;
            const className = cn(baseTabClasses, isDisabled ? disabledTabClasses : isActive ? activeTabClasses : inactiveTabClasses);

            if (isDisabled) {
              return (
                <span key={`${item.key}-${idx}`} aria-disabled="true" className={className}>
                  {Icon ? <Icon size={14} /> : null}
                  {item.label}
                </span>
              );
            }

            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={(event) => {
                  if (!item.onNavigate) return;
                  const shouldPrevent = item.onNavigate(item.href);
                  if (shouldPrevent) event.preventDefault();
                }}
                className={className}
              >
                {Icon ? <Icon size={14} /> : null}
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
                onClick={() => setMenuOpen((prev) => !prev)}
                className={cn(baseTabClasses, moreActive ? activeTabClasses : inactiveTabClasses)}
              >
                <MoreHorizontal size={14} />
                {MORE_LABEL}
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-[#dce7f5] bg-white shadow-lg"
                >
                  <div className="max-h-80 overflow-auto p-1">
                    {overflowIndices.map((idx) => {
                      const item = items[idx];
                      const isActive = idx === activeIndex;
                      const isDisabled = Boolean(item.disabled || !item.href);
                      const Icon = item.icon;

                      const rowClasses = cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition",
                        isDisabled
                          ? "cursor-not-allowed text-slate-400"
                          : isActive
                            ? "bg-[#4aadf5]/10 text-[#2e75ba]"
                            : "text-slate-700 hover:bg-[#4aadf5]/10 hover:text-[#2e75ba]"
                      );

                      if (isDisabled) {
                        return (
                          <div key={`${item.key}-${idx}`} role="menuitem" aria-disabled="true" className={rowClasses}>
                            {Icon ? <Icon size={14} /> : null}
                            <span className="truncate">{item.label}</span>
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={item.key}
                          role="menuitem"
                          href={item.href}
                          onClick={(event) => {
                            if (item.onNavigate) {
                              const shouldPrevent = item.onNavigate(item.href);
                              if (shouldPrevent) {
                                event.preventDefault();
                                return;
                              }
                            }
                            setMenuOpen(false);
                          }}
                          className={rowClasses}
                        >
                          {Icon ? <Icon size={14} /> : null}
                          <span className="truncate">{item.label}</span>
                          {isActive && (
                            <span className="ml-auto rounded-full bg-[#2e75ba] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
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

      <div className="pointer-events-none absolute -left-[10000px] top-0 opacity-0" aria-hidden="true">
        <div ref={measureRowRef} className="flex items-center gap-1.5 whitespace-nowrap">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <span
                key={`${item.key}-${idx}`}
                ref={(node) => {
                  measureItemRefs.current[idx] = node;
                }}
                className={cn(baseTabClasses, inactiveTabClasses)}
              >
                {Icon ? <Icon size={14} /> : null}
                {item.label}
              </span>
            );
          })}
          <span ref={measureMoreRef} className={cn(baseTabClasses, inactiveTabClasses)}>
            <MoreHorizontal size={14} />
            {MORE_LABEL}
          </span>
        </div>
      </div>
    </nav>
  );
}
