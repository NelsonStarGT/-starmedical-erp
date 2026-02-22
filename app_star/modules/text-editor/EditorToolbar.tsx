import type React from "react";
import { useState } from "react";
import { type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  CheckSquare,
  ChevronDown,
  Highlighter,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  MoreHorizontal,
  Palette,
  Redo2,
  Table2,
  Underline,
  Undo2
} from "lucide-react";
import useAnchoredPopover, { PopoverPortal } from "./useAnchoredPopover";
import UrlInputModal from "./UrlInputModal";
import { normalizeLinkHref } from "./urlValidation";

type Props = {
  editor: Editor | null;
  onInsertImage: () => void;
  onInsertTable: () => void;
  readOnly?: boolean;
};

type Variant = "icon" | "text";

function ToolbarButton({
  label,
  icon,
  active,
  onClick,
  variant = "text",
  title,
  buttonRef,
  disabled
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  variant?: Variant;
  title?: string;
  buttonRef?: React.Ref<HTMLButtonElement>;
  disabled?: boolean;
}) {
  const isIcon = variant === "icon";
  return (
    <button
      type="button"
      aria-label={label}
      title={title || label}
      onClick={disabled ? () => undefined : onClick}
      ref={buttonRef}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border ${
        isIcon ? "h-8 w-8 p-0 text-xs sm:h-9 sm:w-9" : "h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
      } font-semibold transition ${
        active
          ? "border-[#4aa59c] bg-[#4aa59c] text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:bg-[#e8f4ff]"
      } ${disabled ? "opacity-60 cursor-not-allowed hover:border-slate-200 hover:bg-white" : ""} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aadf5] focus-visible:ring-offset-1`}
    >
      <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
      {!isIcon && <span className="hidden md:inline">{label}</span>}
    </button>
  );
}

export function EditorToolbar({ editor, onInsertImage, onInsertTable, readOnly }: Props) {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const stylePopover = useAnchoredPopover({ offset: 8, minWidthFromTrigger: true, minWidth: 240, maxWidth: 320, width: 320 });
  const morePopover = useAnchoredPopover({ offset: 8, minWidthFromTrigger: false, minWidth: 260, align: "end" });
  const colorPopover = useAnchoredPopover({ offset: 8, minWidthFromTrigger: false, minWidth: 200, align: "end" });
  const highlightPopover = useAnchoredPopover({ offset: 8, minWidthFromTrigger: false, minWidth: 200, align: "end" });
  const showFutureFeatures = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_EDITOR_SHOW_FUTURE === "1";

  if (!editor) return null;

  const openLinkModal = () => {
    if (readOnly) return;
    setLinkError(null);
    setLinkDraft(editor.getAttributes("link").href || "https://");
    setLinkModalOpen(true);
  };

  const applyLinkFromModal = () => {
    if (readOnly) return;
    const raw = linkDraft.trim();
    if (!raw) {
      editor.chain().focus().unsetLink().run();
      setLinkModalOpen(false);
      setLinkError(null);
      return;
    }
    const safeHref = normalizeLinkHref(raw);
    if (!safeHref) {
      setLinkError("Usa una URL válida: https://, mailto:, tel:, /ruta.");
      return;
    }
    editor.chain().focus().setLink({ href: safeHref, target: "_blank" }).run();
    setLinkModalOpen(false);
    setLinkError(null);
  };

  const alignButtons = (
    <div className="flex flex-nowrap items-center gap-2 md:flex-wrap">
      <ToolbarButton
        variant="icon"
        label="Alinear izquierda"
        icon={<AlignLeft className="h-4 w-4" />}
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        disabled={readOnly}
      />
      <ToolbarButton
        variant="icon"
        label="Alinear centro"
        icon={<AlignCenter className="h-4 w-4" />}
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        disabled={readOnly}
      />
      <ToolbarButton
        variant="icon"
        label="Alinear derecha"
        icon={<AlignRight className="h-4 w-4" />}
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        disabled={readOnly}
      />
      <ToolbarButton
        variant="icon"
        label="Justificar"
        icon={<AlignJustify className="h-4 w-4" />}
        active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        disabled={readOnly}
      />
    </div>
  );
  const indentButtons = (
    <>
      <ToolbarButton
        label="Disminuir sangría"
        variant="icon"
        icon={<span className="text-lg leading-none">−</span>}
        onClick={() => (editor.chain().focus() as any).indentLess?.().run?.()}
        disabled={readOnly}
      />
      <ToolbarButton
        label="Aumentar sangría"
        variant="icon"
        icon={<span className="text-lg leading-none">+</span>}
        onClick={() => (editor.chain().focus() as any).indentMore?.().run?.()}
        disabled={readOnly}
      />
    </>
  );

  const indentButtonsGroup = (
    <div className="flex flex-nowrap items-center gap-2 md:flex-wrap">
      {indentButtons}
    </div>
  );
  const alignIndentDesktop = (
    <div className="hidden flex-nowrap items-center gap-2 md:flex">
      {alignButtons}
      {indentButtonsGroup}
    </div>
  );

  const MoreIcon = MoreHorizontal;

  const styleOptions = [
    { key: "paragraph", label: "Texto normal", previewClass: "text-sm font-normal" },
    { key: "h1", label: "Título", previewClass: "text-2xl font-semibold" },
    { key: "h2", label: "Subtítulo", previewClass: "text-xl font-semibold" },
    { key: "h3", label: "Encabezado 1", previewClass: "text-lg font-semibold" },
    { key: "h4", label: "Encabezado 2", previewClass: "text-base font-semibold" },
    { key: "h5", label: "Encabezado 3", previewClass: "text-sm font-semibold" }
  ];

  const activeStyle = (() => {
    if (editor.isActive("heading", { level: 1 })) return "h1";
    if (editor.isActive("heading", { level: 2 })) return "h2";
    if (editor.isActive("heading", { level: 3 })) return "h3";
    if (editor.isActive("heading", { level: 4 })) return "h4";
    if (editor.isActive("heading", { level: 5 })) return "h5";
    return "paragraph";
  })();

  const activeLabel = styleOptions.find((opt) => opt.key === activeStyle)?.label || "Texto normal";

  const applyStyle = (key: string) => {
    if (!editor || readOnly) return;
    const chain = editor.chain().focus();
    if (key === "paragraph") {
      chain.setParagraph().run();
    } else {
      const level = Number(key.replace("h", "")) as any;
      chain.toggleHeading({ level }).run();
    }
    stylePopover.setOpen(false);
  };

  return (
    <div className="flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap rounded-xl border border-[#d6e7f5] bg-white/90 px-2 py-2 shadow-sm backdrop-blur md:flex-wrap md:overflow-visible md:whitespace-normal">
      <div className="flex flex-nowrap items-center gap-2">
        <div className="relative">
          <button
            type="button"
            aria-label="Estilo de párrafo"
            aria-haspopup="menu"
            aria-expanded={stylePopover.open}
            ref={(el) => stylePopover.setTriggerRef(el)}
            disabled={readOnly}
            onClick={() => {
              if (readOnly) return;
              stylePopover.setOpen(!stylePopover.open);
            }}
            className="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-[#0f2943] shadow-sm transition hover:border-[#4aadf5] sm:h-9 sm:px-3"
          >
            <span className="truncate max-w-[140px]">{activeLabel}</span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </button>
          {stylePopover.open && (
            <>
              <PopoverPortal>
                <div
                  ref={(el) => stylePopover.setPopoverRef(el as HTMLDivElement)}
                  style={stylePopover.style}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg w-[320px] max-w-[calc(100vw-24px)]"
                >
                  {styleOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        if (readOnly) return;
                        applyStyle(opt.key);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                        activeStyle === opt.key ? "bg-[#e8f9f6] text-[#0f2943] ring-1 ring-[#4aa59c]" : "hover:bg-slate-100"
                      }`}
                    >
                      <span className={`text-[#0f2943] ${opt.previewClass}`}>{opt.label}</span>
                      {activeStyle === opt.key && <Check className="h-4 w-4 text-[#4aa59c]" />}
                    </button>
                  ))}
                </div>
              </PopoverPortal>
            </>
          )}
        </div>
        <div className="hidden h-8 w-px bg-slate-200 sm:block" />
      </div>

      <div className="flex flex-nowrap items-center gap-2">
        <ToolbarButton variant="icon" label="Deshacer" icon={<Undo2 className="h-4 w-4" />} onClick={() => editor.chain().focus().undo().run()} disabled={readOnly} />
        <ToolbarButton variant="icon" label="Rehacer" icon={<Redo2 className="h-4 w-4" />} onClick={() => editor.chain().focus().redo().run()} disabled={readOnly} />
      </div>

      <div className="hidden h-8 w-px bg-slate-200 sm:block" />

      <div className="flex flex-nowrap items-center gap-2">
        <ToolbarButton
          variant="icon"
          label="Negrita"
          icon={<Bold className="h-4 w-4" />}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={readOnly}
        />
        <ToolbarButton
          variant="icon"
          label="Itálica"
          icon={<Italic className="h-4 w-4" />}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={readOnly}
        />
        <ToolbarButton
          variant="icon"
          label="Subrayado"
          icon={<Underline className="h-4 w-4" />}
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={readOnly}
        />
      </div>

      <div className="hidden h-8 w-px bg-slate-200 sm:block" />

      <div className="flex flex-nowrap items-center gap-2">
        <ToolbarButton
          variant="icon"
          label="Viñetas"
          icon={<List className="h-4 w-4" />}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={readOnly}
        />
        <ToolbarButton
          variant="icon"
          label="Numerado"
          icon={<ListOrdered className="h-4 w-4" />}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={readOnly}
        />
        <ToolbarButton
          variant="icon"
          label="Checklist"
          icon={<CheckSquare className="h-4 w-4" />}
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          disabled={readOnly}
        />
      </div>

      <div className="hidden h-8 w-px bg-slate-200 sm:block" />

      {alignIndentDesktop}

      <div className="hidden h-8 w-px bg-slate-200 md:block" />

      {/* Color y Resaltado */}
      <div className="flex flex-nowrap items-center gap-2">
        <div className="relative">
          <ToolbarButton
            variant="icon"
            label="Color de texto"
            icon={<Palette className="h-4 w-4" />}
            onClick={() => {
              if (readOnly) return;
              colorPopover.setOpen(!colorPopover.open);
            }}
            buttonRef={(el) => colorPopover.setTriggerRef(el)}
            disabled={readOnly}
          />
          {colorPopover.open && (
            <PopoverPortal>
              <div
                ref={(el) => colorPopover.setPopoverRef(el as HTMLDivElement)}
                style={colorPopover.style}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#0f2943]">Color de texto</p>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: "Default", color: null },
                    { label: "Azul", color: "#2e75ba" },
                    { label: "Teal", color: "#4aa59c" },
                    { label: "Rojo", color: "#ef4444" },
                    { label: "Gris", color: "#6b7280" }
                  ].map((sw) => (
                    <button
                      key={sw.label}
                      type="button"
                      onClick={() => {
                        if (!editor) return;
                        const chain = editor.chain().focus();
                        sw.color ? chain.setColor(sw.color).run() : chain.unsetColor().run();
                        colorPopover.setOpen(false);
                      }}
                      className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-[11px] font-semibold text-[#0f2943] hover:bg-[#f8fafc]"
                    >
                      <span className="h-6 w-6 rounded-full border border-slate-200" style={{ backgroundColor: sw.color || "#0f172a" }} />
                      {sw.label}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverPortal>
          )}
        </div>

        <div className="relative">
          <ToolbarButton
            variant="icon"
            label="Resaltar"
            icon={<Highlighter className="h-4 w-4" />}
            onClick={() => {
              if (readOnly) return;
              highlightPopover.setOpen(!highlightPopover.open);
            }}
            buttonRef={(el) => highlightPopover.setTriggerRef(el)}
            disabled={readOnly}
          />
          {highlightPopover.open && (
            <PopoverPortal>
              <div
                ref={(el) => highlightPopover.setPopoverRef(el as HTMLDivElement)}
                style={highlightPopover.style}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#0f2943]">Resaltar</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Quitar", color: null },
                    { label: "Amarillo", color: "#fff3b0" },
                    { label: "Azul suave", color: "#dbeafe" },
                    { label: "Verde suave", color: "#dcfce7" }
                  ].map((sw) => (
                    <button
                      key={sw.label}
                      type="button"
                      onClick={() => {
                        if (!editor) return;
                        const chain = editor.chain().focus();
                        sw.color ? chain.toggleHighlight({ color: sw.color }).run() : chain.unsetHighlight().run();
                        highlightPopover.setOpen(false);
                      }}
                      className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-[11px] font-semibold text-[#0f2943] hover:bg-[#f8fafc]"
                    >
                      <span className="h-6 w-6 rounded-md border border-slate-200" style={{ backgroundColor: sw.color || "#ffffff" }} />
                      {sw.label}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverPortal>
          )}
        </div>
      </div>

      <div className="hidden h-8 w-px bg-slate-200 md:block" />

      <div className="flex flex-nowrap items-center gap-2">
        <ToolbarButton variant="icon" label="Enlace" icon={<Link2 className="h-4 w-4" />} active={editor.isActive("link")} onClick={openLinkModal} disabled={readOnly} />
        <ToolbarButton variant="icon" label="Imagen" icon={<ImageIcon className="h-4 w-4" />} onClick={onInsertImage} disabled={readOnly} />
        <ToolbarButton variant="icon" label="Tabla" icon={<Table2 className="h-4 w-4" />} onClick={onInsertTable} disabled={readOnly} />
      </div>

      {showFutureFeatures ? (
        <div className="ml-1 flex items-center md:ml-auto">
          <div className="relative">
            <ToolbarButton
              variant="icon"
              label="Más"
              icon={<MoreIcon className="h-4 w-4" />}
              onClick={() => {
                if (readOnly) return;
                morePopover.setOpen(!morePopover.open);
              }}
              buttonRef={(el) => morePopover.setTriggerRef(el)}
              disabled={readOnly}
            />
            {morePopover.open && (
              <PopoverPortal>
                <div
                  ref={(el) => morePopover.setPopoverRef(el as HTMLDivElement)}
                  style={morePopover.style}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
                >
                  <p className="mb-2 text-xs font-semibold text-slate-600">Opciones adicionales</p>
                  <div className="rounded-lg border border-dashed border-slate-200 p-3 text-[11px] text-slate-500">
                    Columnas (próximamente)
                  </div>
                </div>
              </PopoverPortal>
            )}
          </div>
        </div>
      ) : null}

      <UrlInputModal
        open={linkModalOpen}
        title="Insertar enlace"
        label="URL"
        value={linkDraft}
        placeholder="https://ejemplo.com"
        submitLabel="Aplicar"
        onChange={(next) => {
          setLinkDraft(next);
          if (linkError) setLinkError(null);
        }}
        onSubmit={applyLinkFromModal}
        onClear={() => {
          editor.chain().focus().unsetLink().run();
          setLinkDraft("");
          setLinkError(null);
          setLinkModalOpen(false);
        }}
        onClose={() => {
          setLinkModalOpen(false);
          setLinkError(null);
        }}
        error={linkError}
      />
    </div>
  );
}
