'use client';

import { useEffect, useRef, useState } from "react";
import type { EditorApi } from "../TextEditorEngine";
import UrlInputModal from "../UrlInputModal";
import { normalizeImageSrc } from "../urlValidation";

type MenuKey = "archivo" | "editar" | "insertar" | "formato" | "herramientas" | null;

type Props = {
  apiRef: React.RefObject<EditorApi | null>;
  onExportPdf: () => void;
  onExportDocx: () => void;
  onExportTxt: () => void;
  onPrint: () => void;
  onPickImage?: () => void;
};

export default function DocMenuBar({ apiRef, onExportPdf, onExportDocx, onExportTxt, onPrint, onPickImage }: Props) {
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [imageUrlModalOpen, setImageUrlModalOpen] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState("https://");
  const [imageUrlError, setImageUrlError] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const showFutureFeatures = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_EDITOR_SHOW_FUTURE === "1";

  const close = () => setOpenMenu(null);
  useEffect(() => {
    const onPointer = (ev: PointerEvent) => {
      if (barRef.current && !barRef.current.contains(ev.target as Node)) close();
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") close();
    };
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const run = (fn: (api: EditorApi) => void) => () => {
    const instance = apiRef.current;
    if (!instance) return;
    fn(instance);
  };
  const api = () => apiRef.current;
  const menuKeys = showFutureFeatures
    ? (["archivo", "editar", "insertar", "formato", "herramientas"] as const)
    : (["archivo", "editar", "insertar", "formato"] as const);

  const openImageUrlModal = () => {
    setImageUrlError(null);
    setImageUrlDraft("https://");
    setImageUrlModalOpen(true);
    close();
  };

  const submitImageUrl = () => {
    const safeSrc = normalizeImageSrc(imageUrlDraft);
    if (!safeSrc) {
      setImageUrlError("Ingresa una URL válida (https:// o ruta /uploads/...).");
      return;
    }
    api()?.insertImage?.(safeSrc);
    setImageUrlError(null);
    setImageUrlModalOpen(false);
  };

  const menus: Record<Exclude<MenuKey, null>, { label: string; items: { label: string; action: () => void }[] }> = {
    archivo: {
      label: "Archivo",
      items: [
        { label: "Exportar PDF", action: onExportPdf },
        { label: "Exportar DOCX", action: onExportDocx },
        { label: "Exportar TXT", action: onExportTxt },
        { label: "Imprimir", action: onPrint }
      ]
    },
    editar: {
      label: "Editar",
      items: [
        { label: "Deshacer", action: run((api) => api.undo?.()) },
        { label: "Rehacer", action: run((api) => api.redo?.()) },
        { label: "Seleccionar todo", action: run((api) => api.selectAll?.()) },
        {
          label: "Copiar",
          action: run(async (api) => {
            const text = api.getText?.() || "";
            try {
              await navigator.clipboard.writeText(text);
            } catch (_) {
              /* noop */
            }
          })
        },
        ...(showFutureFeatures ? [{ label: "Pegar sin formato", action: () => void 0 }] : [])
      ]
    },
    insertar: {
      label: "Insertar",
      items: [
        {
          label: "Imagen (URL)",
          action: openImageUrlModal
        },
        {
          label: "Tabla...",
          action: () => {
            // handled via inline grid; placeholder
          }
        },
        { label: "Línea horizontal", action: () => api()?.insertHorizontalRule?.() }
      ]
    },
    formato: {
      label: "Formato",
      items: [
        { label: "Alinear izquierda", action: run((api) => api.setAlign?.("left")) },
        { label: "Alinear centro", action: run((api) => api.setAlign?.("center")) },
        { label: "Alinear derecha", action: run((api) => api.setAlign?.("right")) },
        { label: "Justificar", action: run((api) => api.setAlign?.("justify")) },
        { label: "Disminuir sangría", action: run((api) => api.indentLess?.()) },
        { label: "Aumentar sangría", action: run((api) => api.indentMore?.()) }
      ]
    },
    herramientas: {
      label: "Herramientas",
      items: showFutureFeatures
        ? [
        { label: "Ortografía (próximamente)", action: () => void 0 },
        { label: "Dictado (próximamente)", action: () => void 0 }
      ]
        : []
    }
  };

  // table grid rendering separated to keep actions real
  const renderMenu = (key: Exclude<MenuKey, null>) => {
    if (key === "insertar") {
      return (
        <div className="w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                openImageUrlModal();
              }}
              className="flex w-full items-center rounded-lg px-2 py-2 text-sm text-[#0f2943] hover:bg-[#f8fafc]"
            >
              Imagen (URL)
            </button>
            {onPickImage ? (
              <button
                type="button"
                onClick={() => {
                  onPickImage();
                  close();
                }}
                className="flex w-full items-center rounded-lg px-2 py-2 text-sm text-[#0f2943] hover:bg-[#f8fafc]"
              >
                Imagen (archivo)
              </button>
            ) : null}
            <div className="rounded-lg border border-slate-200 p-2">
              <p className="mb-2 text-xs font-semibold text-slate-600">Tabla</p>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 80 }).map((_, idx) => {
                  const row = Math.floor(idx / 10) + 1;
                  const col = (idx % 10) + 1;
                  return (
                    <button
                      key={`${row}x${col}`}
                      type="button"
                      className="h-5 w-5 rounded border border-slate-200 bg-white hover:border-[#4aa59c] hover:bg-[#e8f9f6]"
                      onClick={() => {
                        api()?.insertTable?.(row, col);
                        close();
                      }}
                      aria-label={`Insertar tabla ${row} filas x ${col} columnas`}
                    />
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                api()?.insertHorizontalRule?.();
                close();
              }}
              className="flex w-full items-center rounded-lg px-2 py-2 text-sm text-[#0f2943] hover:bg-[#f8fafc]"
            >
              Línea horizontal
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
        {menus[key].items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              item.action();
              close();
            }}
            className="flex w-full items-center rounded-lg px-2 py-2 text-sm text-[#0f2943] hover:bg-[#f8fafc]"
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  };

  return (
      <div ref={barRef} className="flex items-center gap-2 border-b border-[#d9e4f2] bg-white/90 px-3 py-2 text-sm font-semibold text-[#0f2943]">
      {menuKeys.map((key) => (
        <div key={key} className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu((prev) => (prev === key ? null : key))}
            aria-haspopup="menu"
            aria-expanded={openMenu === key}
            className={`rounded-md px-3 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aadf5] focus-visible:ring-offset-1 ${openMenu === key ? "bg-[#e8f4ff] text-[#0b2c4c]" : "hover:bg-[#f0f6ff]"}`}
          >
            {menus[key].label}
          </button>
          {openMenu === key && <div className="absolute left-0 top-full mt-2 z-50">{renderMenu(key)}</div>}
        </div>
      ))}
      <UrlInputModal
        open={imageUrlModalOpen}
        title="Insertar imagen por URL"
        label="URL de imagen"
        value={imageUrlDraft}
        placeholder="https://servidor/imagen.png"
        submitLabel="Insertar"
        onChange={(next) => {
          setImageUrlDraft(next);
          if (imageUrlError) setImageUrlError(null);
        }}
        onSubmit={submitImageUrl}
        onClose={() => {
          setImageUrlModalOpen(false);
          setImageUrlError(null);
        }}
        error={imageUrlError}
      />
    </div>
  );
}
