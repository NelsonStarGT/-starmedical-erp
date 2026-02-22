'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";

type PaperSize = "LETTER" | "LEGAL";

type Props = {
  paperSize: PaperSize;
  widthIn: number;
  heightIn: number;
  indentPx: number;
  firstIndentPx: number;
  onIndentChange: (px: number) => void;
  onFirstIndentChange: (px: number) => void;
};

const inchTicks = (lengthIn: number) => {
  const ticks = [] as { pos: number; major: boolean; label?: string }[];
  for (let i = 0; i <= lengthIn; i += 0.25) {
    const major = Number.isInteger(i);
    ticks.push({ pos: i, major, label: major ? `${i}"` : undefined });
  }
  return ticks;
};

const PX_PER_IN = 96;
const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

export default function Rulers({ paperSize, widthIn, heightIn, indentPx, firstIndentPx, onIndentChange, onFirstIndentChange }: Props) {
  const hTicks = useMemo(() => inchTicks(widthIn), [widthIn]);
  const vTicks = useMemo(() => inchTicks(heightIn), [heightIn]);
  const railRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<null | { type: "indent" | "first" }>(null);
  const [tooltip, setTooltip] = useState<{ x: number; label: string } | null>(null);
  const paperWidthPx = widthIn * PX_PER_IN;

  const markerX = (px: number) => (px / paperWidthPx) * 100;
  const firstMarkerPx = clamp(indentPx + firstIndentPx, -PX_PER_IN * 2, paperWidthPx);

  useEffect(() => {
    if (!drag) return;
    const onMove = (ev: PointerEvent) => {
      if (!railRef.current) return;
      const rect = railRef.current.getBoundingClientRect();
      const rawPx = ev.clientX - rect.left;
      if (drag.type === "indent") {
        const clamped = clamp(rawPx, 0, paperWidthPx);
        onIndentChange(clamped);
        setTooltip({ x: ev.clientX, label: `${(clamped / PX_PER_IN).toFixed(2)}"` });
      } else {
        const clamped = clamp(rawPx - indentPx, -PX_PER_IN * 2, PX_PER_IN * 2);
        onFirstIndentChange(clamped);
        setTooltip({ x: ev.clientX, label: `${(clamped / PX_PER_IN).toFixed(2)}"` });
      }
    };
    const onUp = () => {
      setDrag(null);
      setTooltip(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, indentPx, onFirstIndentChange, onIndentChange, paperWidthPx]);

  return (
    <>
      <div className="relative mb-2 ml-8">
        <div
          ref={railRef}
          className="relative h-8 w-full rounded-lg border border-slate-200 bg-white/90 shadow-sm"
          style={{ width: `${widthIn}in` }}
        >
          <div className="relative h-full w-full">
            {hTicks.map((t) => (
              <div
                key={`h-${t.pos}`}
                className="absolute flex flex-col items-center text-[10px] text-[#2e75ba]"
                style={{ left: `${(t.pos / widthIn) * 100}%`, transform: "translateX(-50%)" }}
              >
                <div className={`w-px ${t.major ? "h-4 bg-[#2e75ba]" : "h-2 bg-slate-300"}`} />
                {t.label && <span className="mt-0.5">{t.label}</span>}
              </div>
            ))}

            {/* Left indent marker */}
            <button
              type="button"
              className="absolute top-0 h-8 w-4 -translate-x-1/2 cursor-ew-resize"
              style={{ left: `${markerX(indentPx)}%` }}
              onPointerDown={(e) => {
                e.preventDefault();
                setDrag({ type: "indent" });
              }}
            >
              <div className="mx-auto mt-1 h-3 w-3 rotate-45 rounded-sm bg-[#2e75ba] shadow-sm" />
            </button>

            {/* First line indent marker */}
            <button
              type="button"
              className="absolute top-4 h-6 w-4 -translate-x-1/2 cursor-ew-resize"
              style={{ left: `${markerX(firstMarkerPx)}%` }}
              onPointerDown={(e) => {
                e.preventDefault();
                setDrag({ type: "first" });
              }}
            >
              <div className="mx-auto h-3 w-3 rotate-45 rounded-sm bg-[#4aa59c] shadow-sm" />
            </button>
          </div>
        </div>
        {tooltip && (
          <div className="pointer-events-none absolute -bottom-6 translate-x-[-50%] rounded-md bg-[#0f2943] px-2 py-1 text-[10px] font-semibold text-white shadow-lg" style={{ left: tooltip.x }}>
            {tooltip.label}
          </div>
        )}
      </div>
      <div className="absolute left-0 top-0 flex h-full flex-col items-center">
        <div className="w-8" />
        <div className="relative ml-0 mt-0 flex-1 rounded-lg border border-slate-200 bg-white/90 shadow-sm" style={{ height: `${heightIn}in` }}>
          {vTicks.map((t) => (
            <div
              key={`v-${t.pos}`}
              className="absolute flex items-center text-[10px] text-[#2e75ba]"
              style={{ top: `${(t.pos / heightIn) * 100}%`, transform: "translateY(-50%)" }}
            >
              <div className={`h-px ${t.major ? "w-4 bg-[#2e75ba]" : "w-2 bg-slate-300"}`} />
              {t.label && <span className="ml-1">{t.label}</span>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
