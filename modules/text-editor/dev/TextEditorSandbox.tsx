'use client';

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import TextEditorEngine, { defaultEditorContent, type PaperSize, type EditorApi, type EditorVariant } from "../TextEditorEngine";
import { editorFonts } from "../tokens";
import DocMenuBar from "./DocMenuBar";

function ExportMenu({ onPdf, onDocx, onTxt, onPrint }: { onPdf: () => void; onDocx: () => void; onTxt: () => void; onPrint: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="rounded-xl border border-[#2e75ba] px-4 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm hover:bg-[#eaf3ff]"
      >
        Exportar / Crear
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg">
          {[
            { label: "PDF", action: onPdf },
            { label: "DOCX", action: onDocx },
            { label: "TXT", action: onTxt },
            { label: "Imprimir", action: onPrint }
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#0f2943] hover:bg-[#f8fafc]"
              onClick={() => {
                item.action();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TextEditorSandbox() {
  const searchParams = useSearchParams();
  const [paperSize, setPaperSize] = useState<PaperSize>("LETTER");
  const queryVariant = searchParams.get("variant") === "medical" ? "medical" : "general";
  const [variant, setVariant] = useState<EditorVariant>(queryVariant);
  const [content, setContent] = useState<JSONContent>(defaultEditorContent);
  const [html, setHtml] = useState<string>("");
  const [text, setText] = useState<string>("");
  const editorApiRef = useRef<EditorApi | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    setVariant(queryVariant);
  }, [queryVariant]);

  const onVariantChange = (next: EditorVariant) => {
    setVariant(next);
    const url = new URL(window.location.href);
    if (next === "general") {
      url.searchParams.delete("variant");
    } else {
      url.searchParams.set("variant", next);
    }
    window.history.replaceState({}, "", url.toString());
  };

  const exportPdf = async () => {
    const paper = document.querySelector('[data-editor-paper="true"]') as HTMLElement | null;
    if (!paper) {
      setStatus("No se encontró el documento para exportar");
      return;
    }
    setExporting(true);
    let sandbox: HTMLElement | null = null;
    try {
      const DOMPurify = (await import("dompurify")).default;
      const cleanHtml = DOMPurify.sanitize(paper.innerHTML, {
        USE_PROFILES: { html: true },
        FORBID_ATTR: [
          "onerror",
          "onload",
          "onclick",
          "onmouseover",
          "onmouseenter",
          "onmouseleave",
          "onfocus",
          "onblur",
          "onchange",
          "onsubmit",
          "onreset",
          "onwheel",
          "onanimationstart",
          "onanimationend"
        ],
        ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|\.\.\/|\.\/)/i
      });

      // Clonamos el contenido en un contenedor fuera de pantalla para evitar mutar el DOM visible
      sandbox = document.createElement("div");
      sandbox.setAttribute("data-html2pdf-sandbox", "true");
      sandbox.className = paper.className;
      sandbox.style.cssText = paper.getAttribute("style") || "";
      sandbox.style.position = "fixed";
      sandbox.style.left = "-99999px";
      sandbox.style.top = "0";
      sandbox.style.width = `${paper.offsetWidth || paper.clientWidth}px`;
      sandbox.innerHTML = cleanHtml;
      document.body.appendChild(sandbox);

      const html2pdf = (await import("html2pdf.js")).default as any;
      await html2pdf()
        .from(sandbox)
        .set({
          margin: [0.6, 0.75],
          filename: `documento.pdf`,
          pagebreak: { mode: ["avoid-all"] },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "in", format: paperSize === "LEGAL" ? [8.5, 14] : [8.5, 11], orientation: "portrait" }
        })
        .save();
      setStatus("PDF exportado");
    } catch (err) {
      console.error("[exportPdf]", err);
      setStatus("Error al exportar PDF");
    } finally {
      if (sandbox) {
        document.body.removeChild(sandbox);
      }
      setExporting(false);
    }
  };

  const exportTxt = () => {
    const txt = editorApiRef.current?.getText?.() || text;
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `documento.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("TXT descargado");
  };

  const exportDocx = async () => {
    const htmlContent = editorApiRef.current?.getHTML?.() || html;
    if (!htmlContent.trim()) return;
    try {
      const response = await fetch("/api/text-docs/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: htmlContent, title: "documento" })
      });
      if (!response.ok) throw new Error("DOCX_FAIL");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documento.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("DOCX descargado");
    } catch (err) {
      console.error(err);
      setStatus("Error al exportar DOCX");
    }
  };

  const printDoc = () => {
    window.print();
  };

  const handleLocalImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setStatus("Subiendo imagen...");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/text-docs/upload", {
        method: "POST",
        body
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok || !payload?.data?.url) {
        throw new Error(payload?.error || "UPLOAD_FAILED");
      }
      editorApiRef.current?.insertImage?.(payload.data.url);
      setStatus("Imagen insertada");
    } catch (err) {
      console.error("[uploadImage]", err);
      setStatus("Error al subir imagen");
    } finally {
      setUploadingImage(false);
      input.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] via-white to-[#eef5fb] pb-10" style={{ fontFamily: editorFonts.body }}>
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-4">
        <div data-editor-nonprint="true" className="flex flex-wrap items-center gap-3 justify-between rounded-2xl border border-[#d9e4f2] bg-white/95 px-4 py-3 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Text Editor Engine</p>
            <h1 className="text-xl font-semibold text-[#0b2c4c]" style={{ fontFamily: editorFonts.heading }}>Motor limpio StarMedical</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as PaperSize)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#0f2943] shadow-inner focus:border-[#4aa59c]"
            >
              <option value="LETTER">Carta (8.5 x 11)</option>
              <option value="LEGAL">Legal (8.5 x 14)</option>
            </select>
            <select
              value={variant}
              onChange={(e) => onVariantChange(e.target.value as EditorVariant)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#0f2943] shadow-inner focus:border-[#4aa59c]"
            >
              <option value="general">General (con reglas)</option>
              <option value="medical">Medical (sin reglas)</option>
            </select>
            <ExportMenu onPdf={exportPdf} onDocx={exportDocx} onTxt={exportTxt} onPrint={printDoc} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#e2e8f0] bg-white/90 shadow-sm">
          <div data-editor-nonprint="true">
            <DocMenuBar
              apiRef={editorApiRef}
              onExportPdf={exportPdf}
              onExportDocx={exportDocx}
              onExportTxt={exportTxt}
              onPrint={printDoc}
              onPickImage={() => {
                if (!uploadingImage) fileInputRef.current?.click();
              }}
            />
          </div>
          <div className="p-4">
          <TextEditorEngine
            initialContent={content}
            paperSize={paperSize}
            variant={variant}
            onChange={({ json, html, text }) => {
              setContent(json);
              setHtml(html);
              setText(text);
            }}
            onEditorReady={(api) => {
              editorApiRef.current = api;
            }}
          />
          </div>
        </div>

        {status && <p data-editor-nonprint="true" className="text-xs font-semibold text-[#2e75ba]">{status}</p>}
      </div>

      <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={handleLocalImageUpload} className="hidden" />
      <style jsx global>{`
        @media print {
          [data-editor-nonprint="true"] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
