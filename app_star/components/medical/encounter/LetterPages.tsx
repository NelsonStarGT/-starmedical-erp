"use client";

import { type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { DocumentBrandingTemplate } from "@/lib/medical/documentBranding";

export type LetterViewMode = "paged" | "continuous";

type LetterPageItem = {
  id: string;
  title?: string;
  subtitle?: string | null;
  content: React.ReactNode;
};

function logoPositionClass(position: DocumentBrandingTemplate["logoPosition"]) {
  if (position === "top-left") return "left-6";
  if (position === "top-right") return "right-6";
  return "left-1/2 -translate-x-1/2";
}

function backgroundPositionValue(position: DocumentBrandingTemplate["backgroundPosition"]) {
  if (position === "top") return "top center";
  if (position === "bottom") return "bottom center";
  return "center";
}

function footerBlock(brandingTemplate: DocumentBrandingTemplate | null | undefined) {
  if (!brandingTemplate?.footerEnabled) return null;
  return (
    <footer className="relative z-[2] border-t border-slate-200/70 bg-white/85 px-5 py-2 text-[11px] text-slate-600 lg:px-10">
      <div className="flex items-center justify-between gap-3">
        <span>{brandingTemplate.footerLeftText || " "}</span>
        <span>{brandingTemplate.footerRightText || " "}</span>
      </div>
    </footer>
  );
}

function logoBlock(brandingTemplate: DocumentBrandingTemplate | null | undefined) {
  if (!brandingTemplate?.logoUrl) return null;
  return (
    <div className={cn("pointer-events-none absolute top-5 z-[1]", logoPositionClass(brandingTemplate.logoPosition))}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={brandingTemplate.logoUrl}
        alt="Logo institucional"
        style={{ width: `${brandingTemplate.logoWidthPx}px` }}
        className="max-h-14 object-contain opacity-95"
      />
    </div>
  );
}

function backgroundBlock(brandingTemplate: DocumentBrandingTemplate | null | undefined) {
  if (!brandingTemplate?.backgroundImageUrl) return null;
  const style: CSSProperties = {
    backgroundImage: `url(${brandingTemplate.backgroundImageUrl})`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: backgroundPositionValue(brandingTemplate.backgroundPosition),
    backgroundSize: `${Math.round(brandingTemplate.backgroundScale * 100)}% auto`,
    opacity: brandingTemplate.backgroundOpacity
  };
  return (
    <div className="pointer-events-none absolute inset-0 z-[0] overflow-hidden">
      <div className="letter-page-background absolute inset-0" style={style} />
    </div>
  );
}

function LetterContainer({
  children,
  brandingTemplate
}: {
  children: React.ReactNode;
  brandingTemplate?: DocumentBrandingTemplate | null;
}) {
  return (
    <article className="letter-page relative w-full max-w-[850px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      {backgroundBlock(brandingTemplate)}
      {logoBlock(brandingTemplate)}
      <div className="relative z-[2]">{children}</div>
      {footerBlock(brandingTemplate)}
    </article>
  );
}

export default function LetterPages({
  pages,
  mode,
  onModeChange,
  className,
  showModeToggle = true,
  brandingTemplate
}: {
  pages: LetterPageItem[];
  mode: LetterViewMode;
  onModeChange?: (next: LetterViewMode) => void;
  className?: string;
  showModeToggle?: boolean;
  brandingTemplate?: DocumentBrandingTemplate | null;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {showModeToggle ? (
        <div className="print:hidden flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onModeChange?.("paged")}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
              mode === "paged" ? "border-[#2e75ba] bg-[#2e75ba] text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            Vista carta
          </button>
          <button
            type="button"
            onClick={() => onModeChange?.("continuous")}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
              mode === "continuous"
                ? "border-[#2e75ba] bg-[#2e75ba] text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            Vista continua
          </button>
        </div>
      ) : null}

      {mode === "paged" ? (
        <div className="letter-pages-container flex flex-col items-center gap-5">
          {pages.map((page) => (
            <LetterContainer key={page.id} brandingTemplate={brandingTemplate}>
              {page.title ? (
                <header className="border-b border-slate-200 bg-[#f8fafc] px-5 py-3 lg:px-10">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Documento clínico</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">{page.title}</h3>
                  {page.subtitle ? <p className="mt-1 text-xs text-slate-600">{page.subtitle}</p> : null}
                </header>
              ) : null}
              <div className={cn("letter-page-content break-inside-avoid-page px-5 py-7 lg:px-10", page.title ? "lg:py-10" : "lg:py-12")}>
                {page.content}
              </div>
            </LetterContainer>
          ))}
        </div>
      ) : (
        <div className="letter-continuous relative mx-auto w-full max-w-[850px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          {backgroundBlock(brandingTemplate)}
          {logoBlock(brandingTemplate)}
          <div className="relative z-[2] px-5 py-7 lg:px-10 lg:py-12">
            <div className="space-y-6">
              {pages.map((page, index) => (
                <section key={page.id} className={cn("break-inside-avoid-page", index > 0 && "border-t border-slate-200 pt-6")}>
                  {page.title ? (
                    <header className="mb-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Documento clínico</p>
                      <h3 className="mt-1 text-base font-semibold text-slate-900">{page.title}</h3>
                      {page.subtitle ? <p className="text-xs text-slate-600">{page.subtitle}</p> : null}
                    </header>
                  ) : null}
                  {page.content}
                </section>
              ))}
            </div>
          </div>
          {footerBlock(brandingTemplate)}
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: Letter;
            margin: 0.75in;
          }

          .letter-pages-container {
            gap: 0 !important;
          }

          .letter-page {
            width: 8.5in !important;
            max-width: 8.5in !important;
            min-height: 10.5in;
            margin: 0 auto !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-after: always;
            break-after: page;
            break-inside: avoid;
          }

          .letter-page-background {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .letter-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .letter-page-content,
          .break-inside-avoid-page {
            break-inside: avoid-page;
          }

          .letter-continuous {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }

          .letter-continuous img,
          .letter-page img {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
