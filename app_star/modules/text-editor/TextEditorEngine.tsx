'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Extension } from "@tiptap/core";
import type { RawCommands } from "@tiptap/core";
import { EditorContent, JSONContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Columns2, MinusCircle, PlusCircle, Trash2 } from "lucide-react";
import { EditorToolbar } from "./EditorToolbar";
import { editorFonts } from "./tokens";
import Rulers from "./Rulers";
import UrlInputModal from "./UrlInputModal";
import { normalizeImageSrc } from "./urlValidation";

export type PaperSize = "LETTER" | "LEGAL";
export type EditorVariant = "general" | "medical";

export type EditorApi = {
  undo: () => void;
  redo: () => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
  toggleStrike: () => void;
  setParagraph: () => void;
  setHeading: (level: number) => void;
  setAlign: (align: "left" | "center" | "right" | "justify") => void;
  toggleBulletList: () => void;
  toggleOrderedList: () => void;
  toggleTaskList: () => void;
  insertTable: (rows: number, cols: number) => void;
  deleteTable: () => void;
  addRowAfter: () => void;
  addColumnAfter: () => void;
  deleteRow: () => void;
  deleteColumn: () => void;
  insertHorizontalRule: () => void;
  insertImage: (url: string) => void;
  insertText: (text: string) => void;
  getHTML: () => string;
  getJSON: () => JSONContent;
  getText: () => string;
  setContent: (json: JSONContent) => void;
  selectAll: () => void;
  indentMore: () => void;
  indentLess: () => void;
  setIndent: (px: number) => void;
  setFirstIndent: (px: number) => void;
};

export const defaultEditorContent: JSONContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "StarMedical" }] },
    { type: "paragraph", content: [{ type: "text", text: "Documento clínico / administrativo" }] },
    { type: "paragraph", content: [{ type: "text", text: "Escribe tu nota, hallazgos o instrucciones aquí..." }] }
  ]
};

type Props = {
  initialContent?: JSONContent;
  onChange?: (payload: { json: JSONContent; html: string; text: string; headerJson?: JSONContent; footerJson?: JSONContent }) => void;
  paperSize?: PaperSize;
  variant?: EditorVariant;
  readOnly?: boolean;
  density?: "comfortable" | "compact";
  onEditorReady?: (api: EditorApi) => void;
  showHeaderFooter?: boolean;
  initialHeaderContent?: JSONContent;
  initialFooterContent?: JSONContent;
};

const IndentExtension = Extension.create({
  name: "indent",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "listItem"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const attr = element.getAttribute("data-indent");
              const style = element.getAttribute("style") || "";
              const styleMatch = style.match(/margin-left:\s*([\d.]+)px/i);
              const parsedAttr = attr ? parseInt(attr, 10) : 0;
              const parsedStyle = styleMatch ? parseFloat(styleMatch[1]) : 0;
              const candidate = parsedStyle || parsedAttr;
              // backward compatibility: old values were steps (1-4)
              if (candidate > 0 && candidate <= 10) {
                return candidate * 18;
              }
              return Number.isFinite(candidate) ? candidate : 0;
            },
            renderHTML: (attributes) => {
              const indent = attributes.indent || 0;
              const firstIndent = attributes.firstIndent || 0;
              return {
                "data-indent": indent,
                "data-first-indent": firstIndent,
                style: [
                  indent ? `margin-left:${indent}px` : "",
                  firstIndent ? `text-indent:${firstIndent}px` : ""
                ]
                  .filter(Boolean)
                  .join(";") || undefined
              };
            }
          },
          firstIndent: {
            default: 0,
            parseHTML: (element) => {
              const attr = element.getAttribute("data-first-indent");
              const style = element.getAttribute("style") || "";
              const styleMatch = style.match(/text-indent:\s*([\d.-]+)px/i);
              const parsedAttr = attr ? parseInt(attr, 10) : 0;
              const parsedStyle = styleMatch ? parseFloat(styleMatch[1]) : 0;
              const candidate = parsedStyle || parsedAttr;
              return Number.isFinite(candidate) ? candidate : 0;
            },
            renderHTML: () => ({})
          }
        }
      }
    ];
  },
  addCommands() {
    const clampPx = (val: number) => Math.min(96 * 5, Math.max(0, val)); // 0..5in
    const clampFirst = (val: number) => Math.min(96 * 2, Math.max(-96 * 2, val)); // -2..2in
    const updateAll = (commands: any, attrs: Record<string, number>) =>
      commands.updateAttributes("paragraph", attrs) ||
      commands.updateAttributes("heading", attrs) ||
      commands.updateAttributes("listItem", attrs);
    return {
      indentMore:
        () =>
        ({ editor, commands }: { editor: any; commands: any }) => {
          const current =
            editor.getAttributes("paragraph").indent ??
            editor.getAttributes("heading").indent ??
            editor.getAttributes("listItem").indent ??
            0;
          const next = clampPx((current || 0) + 18);
          return updateAll(commands, { indent: next });
        },
      indentLess:
        () =>
        ({ editor, commands }: { editor: any; commands: any }) => {
          const current =
            editor.getAttributes("paragraph").indent ??
            editor.getAttributes("heading").indent ??
            editor.getAttributes("listItem").indent ??
            0;
          const next = clampPx((current || 0) - 18);
          return updateAll(commands, { indent: next });
        },
      setIndent:
        (val: number) =>
        ({ commands }: { commands: any }) =>
          updateAll(commands, { indent: clampPx(val) }),
      setFirstIndent:
        (val: number) =>
        ({ commands }: { commands: any }) =>
          updateAll(commands, { firstIndent: clampFirst(val) })
    } as Partial<RawCommands>;
  }
});

const TabKeymapExtension = Extension.create({
  name: "tabKeymap",
  priority: 1000,
  addKeyboardShortcuts() {
    const runListIndent = () => {
      const inTask = this.editor.isActive("taskItem") || this.editor.isActive("taskList");
      if (inTask) {
        const taskIndented = (this.editor.chain().focus() as any).sinkListItem?.("taskItem")?.run?.();
        if (taskIndented) return true;
      }

      const inList = this.editor.isActive("listItem") || this.editor.isActive("bulletList") || this.editor.isActive("orderedList");
      if (!inList) return false;
      return Boolean((this.editor.chain().focus() as any).sinkListItem?.("listItem")?.run?.());
    };

    const runListOutdent = () => {
      const inTask = this.editor.isActive("taskItem") || this.editor.isActive("taskList");
      if (inTask) {
        const taskLifted = (this.editor.chain().focus() as any).liftListItem?.("taskItem")?.run?.();
        if (taskLifted) return true;
      }

      const inList = this.editor.isActive("listItem") || this.editor.isActive("bulletList") || this.editor.isActive("orderedList");
      if (!inList) return false;
      return Boolean((this.editor.chain().focus() as any).liftListItem?.("listItem")?.run?.());
    };

    return {
      Tab: () => {
        if (!this.editor.isEditable) return false;

        if (this.editor.isActive("table")) {
          const moved = (this.editor.chain().focus() as any).goToNextCell?.().run?.();
          if (moved) return true;
          const expanded = (this.editor.chain().focus() as any).addRowAfter?.().goToNextCell?.().run?.();
          if (expanded) return true;
          return true;
        }

        if (runListIndent()) return true;
        return Boolean((this.editor.chain().focus() as any).indentMore?.().run?.());
      },
      "Shift-Tab": () => {
        if (!this.editor.isEditable) return false;

        if (this.editor.isActive("table")) {
          const moved = (this.editor.chain().focus() as any).goToPreviousCell?.().run?.();
          if (moved) return true;
          return true;
        }

        if (runListOutdent()) return true;
        return Boolean((this.editor.chain().focus() as any).indentLess?.().run?.());
      }
    };
  }
});

export default function TextEditorEngine({
  initialContent,
  onChange,
  paperSize = "LETTER",
  variant = "general",
  readOnly = false,
  density = "comfortable",
  onEditorReady,
  showHeaderFooter = false,
  initialHeaderContent,
  initialFooterContent
}: Props) {
  const editorApiRef = useRef<EditorApi | null>(null);
  const readyOnceRef = useRef(false);
  const onEditorReadyRef = useRef(onEditorReady);
  const updateEmitTimeoutRef = useRef<number | null>(null);
  const paperClass = useMemo(() => (paperSize === "LEGAL" ? "paper-legal" : "paper-letter"), [paperSize]);
  const paperHeight = paperSize === "LEGAL" ? "14in" : "11in";
  const paperWidth = "8.5in";
  const showRulers = variant === "general";
  const [inTable, setInTable] = useState(false);
  const [currentIndentPx, setCurrentIndentPx] = useState(0);
  const [currentFirstIndentPx, setCurrentFirstIndentPx] = useState(0);
  const [imageUrlModalOpen, setImageUrlModalOpen] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState("https://");
  const [imageUrlError, setImageUrlError] = useState<string | null>(null);
  const isComfortable = density === "comfortable";
  const toolbarChromeClass = isComfortable ? "p-2 md:p-3" : "p-2";
  const pageContentClass = isComfortable
    ? "px-5 py-6 sm:px-7 lg:px-9 lg:py-8 xl:px-10"
    : "px-4 py-4 sm:px-6 lg:px-7 lg:py-6";
  const headerClass = isComfortable
    ? "flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7 lg:px-9 lg:py-4 xl:px-10"
    : "flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 lg:px-7 lg:py-3";
  const footerFrameClass = isComfortable ? "px-5 py-3 sm:px-7 lg:px-9 lg:py-4 xl:px-10" : "px-4 py-2 sm:px-6 lg:px-7 lg:py-3";
  const proseMinHeightPx = isComfortable ? 180 : 140;
  const proseLineHeight = isComfortable ? 1.6 : 1.45;
  const proseFontSize = isComfortable ? "14px" : "13px";
  const paragraphSpacing = isComfortable ? "0.9rem" : "0.75rem";

  const emitChange = useCallback(
    (
      payload: { json: JSONContent; html: string; text: string; headerJson?: JSONContent; footerJson?: JSONContent },
      mode: "immediate" | "debounced" = "debounced"
    ) => {
      if (!onChange) return;
      if (mode === "immediate") {
        if (updateEmitTimeoutRef.current !== null) {
          window.clearTimeout(updateEmitTimeoutRef.current);
          updateEmitTimeoutRef.current = null;
        }
        onChange(payload);
        return;
      }
      if (updateEmitTimeoutRef.current !== null) {
        window.clearTimeout(updateEmitTimeoutRef.current);
      }
      updateEmitTimeoutRef.current = window.setTimeout(() => {
        onChange(payload);
        updateEmitTimeoutRef.current = null;
      }, 120);
    },
    [onChange]
  );

  useEffect(() => {
    return () => {
      if (updateEmitTimeoutRef.current !== null) {
        window.clearTimeout(updateEmitTimeoutRef.current);
        updateEmitTimeoutRef.current = null;
      }
    };
  }, []);

  const headerEditor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      Highlight.configure({ multicolor: true }),
      Underline,
      Link.configure({ openOnClick: true, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
      Placeholder.configure({ placeholder: "Encabezado", includeChildren: true })
    ],
    content: initialHeaderContent ?? { type: "doc", content: [] },
    editable: showHeaderFooter && !readOnly
  });

  const footerEditor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      Highlight.configure({ multicolor: true }),
      Underline,
      Link.configure({ openOnClick: true, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
      Placeholder.configure({ placeholder: "Pie de página", includeChildren: true })
    ],
    content: initialFooterContent ?? { type: "doc", content: [] },
    editable: showHeaderFooter && !readOnly
  });

  useEffect(() => {
    onEditorReadyRef.current = onEditorReady;
  }, [onEditorReady]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      Highlight.configure({ multicolor: true }),
      Underline,
      Link.configure({ openOnClick: true, autolink: true }),
      Image.configure({ HTMLAttributes: { class: "rounded-xl shadow-sm my-4" } }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
      Placeholder.configure({ placeholder: "Empieza a escribir... Usa la barra superior para dar formato.", includeChildren: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true, HTMLAttributes: { class: "flex items-start gap-2" } }),
      IndentExtension,
      TabKeymapExtension
    ],
    content: initialContent ?? defaultEditorContent,
    editable: !readOnly,
    onCreate: ({ editor }) => {
      const payload = {
        json: editor.getJSON(),
        html: editor.getHTML(),
        text: editor.getText(),
        headerJson: headerEditor?.getJSON(),
        footerJson: footerEditor?.getJSON()
      };
      emitChange(payload, "immediate");
    },
    onUpdate: ({ editor }) => {
      const payload = {
        json: editor.getJSON(),
        html: editor.getHTML(),
        text: editor.getText(),
        headerJson: headerEditor?.getJSON(),
        footerJson: footerEditor?.getJSON()
      };
      emitChange(payload, "debounced");
    }
  });

  useEffect(() => {
    if (!headerEditor || !footerEditor) return;
    const sync = () => {
      emitChange({
        json: editor?.getJSON() ?? defaultEditorContent,
        html: editor?.getHTML() ?? "",
        text: editor?.getText() ?? "",
        headerJson: headerEditor.getJSON(),
        footerJson: footerEditor.getJSON()
      }, "immediate");
    };
    headerEditor.on("update", sync);
    footerEditor.on("update", sync);
    return () => {
      headerEditor.off("update", sync);
      footerEditor.off("update", sync);
    };
  }, [headerEditor, footerEditor, editor, emitChange]);

  useEffect(() => {
    if (!editor) return;
    const updateTableState = () => setInTable(editor.isActive("table"));
    updateTableState();
    editor.on("selectionUpdate", updateTableState);
    editor.on("transaction", updateTableState);
    return () => {
      editor.off("selectionUpdate", updateTableState);
      editor.off("transaction", updateTableState);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
    headerEditor?.setEditable(!readOnly);
    footerEditor?.setEditable(!readOnly);
  }, [editor, headerEditor, footerEditor, readOnly]);

  useEffect(() => {
    if (!editor) return;
    const updateIndentState = () => {
      const paragraphAttrs = editor.getAttributes("paragraph");
      const headingAttrs = editor.getAttributes("heading");
      const listAttrs = editor.getAttributes("listItem");
      const indent = paragraphAttrs.indent ?? headingAttrs.indent ?? listAttrs.indent ?? 0;
      const firstIndent = paragraphAttrs.firstIndent ?? headingAttrs.firstIndent ?? listAttrs.firstIndent ?? 0;
      setCurrentIndentPx(indent || 0);
      setCurrentFirstIndentPx(firstIndent || 0);
    };
    updateIndentState();
    editor.on("selectionUpdate", updateIndentState);
    editor.on("transaction", updateIndentState);
    return () => {
      editor.off("selectionUpdate", updateIndentState);
      editor.off("transaction", updateIndentState);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || !initialContent) return;
    const incoming = JSON.stringify(initialContent);
    const existing = JSON.stringify(editor.getJSON());
    if (incoming !== existing) {
      editor.commands.setContent(initialContent, false);
    }
  }, [initialContent, editor]);

  useEffect(() => {
    if (!editor) return;
    const api: EditorApi = {
      undo: () => editor.chain().focus().undo().run(),
      redo: () => editor.chain().focus().redo().run(),
      toggleBold: () => editor.chain().focus().toggleBold().run(),
      toggleItalic: () => editor.chain().focus().toggleItalic().run(),
      toggleUnderline: () => editor.chain().focus().toggleUnderline().run(),
      toggleStrike: () => editor.chain().focus().toggleStrike().run(),
      setParagraph: () => editor.chain().focus().setParagraph().run(),
      setHeading: (level: number) => editor.chain().focus().toggleHeading({ level: level as any }).run(),
      setAlign: (align) => editor.chain().focus().setTextAlign(align).run(),
      toggleBulletList: () => editor.chain().focus().toggleBulletList().run(),
      toggleOrderedList: () => editor.chain().focus().toggleOrderedList().run(),
      toggleTaskList: () => editor.chain().focus().toggleTaskList().run(),
      insertTable: (rows, cols) => editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run(),
      deleteTable: () => editor.chain().focus().deleteTable().run(),
      addRowAfter: () => editor.chain().focus().addRowAfter().run(),
      addColumnAfter: () => editor.chain().focus().addColumnAfter().run(),
      deleteRow: () => editor.chain().focus().deleteRow().run(),
      deleteColumn: () => editor.chain().focus().deleteColumn().run(),
      insertHorizontalRule: () => editor.chain().focus().setHorizontalRule().run(),
      insertImage: (url) => editor.chain().focus().setImage({ src: url }).run(),
      insertText: (text) => editor.chain().focus().insertContent(text).run(),
      getHTML: () => editor.getHTML(),
      getJSON: () => editor.getJSON(),
      getText: () => editor.getText(),
      setContent: (json) => editor.commands.setContent(json, false),
      selectAll: () => editor.chain().focus().selectAll().run(),
      indentMore: () => (editor.chain().focus() as any).indentMore?.().run?.(),
      indentLess: () => (editor.chain().focus() as any).indentLess?.().run?.(),
      setIndent: (px) => (editor.chain().focus() as any).setIndent?.(px)?.run?.(),
      setFirstIndent: (px) => (editor.chain().focus() as any).setFirstIndent?.(px)?.run?.()
    };
    editorApiRef.current = api;
    if (!readyOnceRef.current) {
      readyOnceRef.current = true;
      onEditorReadyRef.current?.(api);
    }
  }, [editor]);

  const openImageUrlModal = () => {
    setImageUrlError(null);
    setImageUrlDraft("https://");
    setImageUrlModalOpen(true);
  };

  const applyImageUrl = () => {
    if (!editor || readOnly) return;
    const safeSrc = normalizeImageSrc(imageUrlDraft);
    if (!safeSrc) {
      setImageUrlError("Ingresa una URL válida (https:// o ruta /uploads/...).");
      return;
    }
    editor.chain().focus().setImage({ src: safeSrc }).run();
    setImageUrlError(null);
    setImageUrlModalOpen(false);
  };

  const handleInsertTable = () => {
    const defaultRows = 3;
    const defaultCols = 3;
    editor?.chain().focus().insertTable({ rows: defaultRows, cols: defaultCols, withHeaderRow: true }).run();
  };

  const tableControls = (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white/95 px-2 py-1 shadow-md shadow-slate-200/50">
      <button
        type="button"
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#b42318] hover:bg-rose-50"
        onClick={() => editor?.chain().focus().deleteTable().run()}
        disabled={!editor}
      >
        <Trash2 className="h-4 w-4" />
        Eliminar
      </button>
      <div className="h-6 w-px bg-slate-200" />
      <button
        type="button"
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#0f2943] hover:bg-[#e8f9f6]"
        onClick={() => editor?.chain().focus().addRowAfter().run()}
        disabled={!editor}
      >
        <PlusCircle className="h-4 w-4 text-[#4aa59c]" />
        Fila +
      </button>
      <button
        type="button"
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#0f2943] hover:bg-[#f8fafc]"
        onClick={() => editor?.chain().focus().deleteRow().run()}
        disabled={!editor}
      >
        <MinusCircle className="h-4 w-4 text-[#b45309]" />
        Fila -
      </button>
      <button
        type="button"
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#0f2943] hover:bg-[#e8f9f6]"
        onClick={() => editor?.chain().focus().addColumnAfter().run()}
        disabled={!editor}
      >
        <Columns2 className="h-4 w-4 text-[#4aa59c]" />
        Col +
      </button>
      <button
        type="button"
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#0f2943] hover:bg-[#f8fafc]"
        onClick={() => editor?.chain().focus().deleteColumn().run()}
        disabled={!editor}
      >
        <MinusCircle className="h-4 w-4 text-[#b45309]" />
        Col -
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div data-editor-nonprint="true" className="z-20 md:sticky md:top-3">
        <div className={`rounded-xl border border-[#d6e7f5] bg-white/90 shadow-sm backdrop-blur ${toolbarChromeClass}`}>
          <div className="max-h-[5.5rem] overflow-x-auto overflow-y-hidden md:max-h-none md:overflow-visible">
            <EditorToolbar editor={editor} onInsertImage={openImageUrlModal} onInsertTable={handleInsertTable} readOnly={readOnly} />
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="relative">
          {showRulers && (
            <Rulers
              paperSize={paperSize}
              widthIn={8.5}
              heightIn={paperSize === "LEGAL" ? 14 : 11}
              indentPx={currentIndentPx}
              firstIndentPx={currentFirstIndentPx}
              onIndentChange={(px) => (editor?.chain().focus() as any)?.setIndent?.(px)?.run?.()}
              onFirstIndentChange={(px) => (editor?.chain().focus() as any)?.setFirstIndent?.(px)?.run?.()}
            />
          )}
          <div
            data-editor-paper="true"
            className={`editor-paper relative mt-2 w-full max-w-full rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/60 ${showRulers ? "ml-8" : ""} ${paperClass}`}
            style={{ width: `min(${paperWidth}, 100%)`, minHeight: paperHeight }}
          >
            {inTable && (
              <div data-editor-nonprint="true" className="absolute right-4 top-4 z-30">
                {tableControls}
              </div>
            )}
            <div className={headerClass}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">StarMedical</p>
                <h2 className="text-base font-semibold text-[#163d66] sm:text-lg" style={{ fontFamily: editorFonts.heading }}>
                  Documento clínico/administrativo
                </h2>
              </div>
              <span className="rounded-full bg-[#f1f7fb] px-3 py-1 text-[11px] font-semibold text-[#2e75ba] shadow-inner">
                {paperSize === "LEGAL" ? "Legal 8.5x14" : "Carta 8.5x11"}
              </span>
            </div>
            {showHeaderFooter && headerEditor && (
              <div className={`border-b border-slate-200 bg-[#f8fafc]/60 ${footerFrameClass}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Header</p>
                <EditorContent editor={headerEditor} />
              </div>
            )}
            <div className={pageContentClass}>
              <EditorContent editor={editor} />
            </div>
            {showHeaderFooter && footerEditor && (
              <div className={`border-t border-slate-200 bg-[#f8fafc]/60 ${footerFrameClass}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Footer</p>
                <EditorContent editor={footerEditor} />
              </div>
            )}
          </div>
        </div>
      </div>

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
        onSubmit={applyImageUrl}
        onClose={() => {
          setImageUrlModalOpen(false);
          setImageUrlError(null);
        }}
        error={imageUrlError}
      />

      <style jsx global>{`
        .ProseMirror {
          min-height: ${proseMinHeightPx}px;
          outline: none;
        }
        .ProseMirror p {
          margin: 0 0 ${paragraphSpacing} 0;
          line-height: ${proseLineHeight};
          color: #0f172a;
          font-size: ${proseFontSize};
          text-align: justify;
        }
        .ProseMirror h1,
        .ProseMirror h2,
        .ProseMirror h3,
        .ProseMirror h4 {
          margin: 1.5rem 0 0.6rem 0;
          color: #0b2c4c;
          font-family: ${editorFonts.heading};
        }
        .ProseMirror h1 {
          font-size: 28px;
        }
        .ProseMirror h2 {
          font-size: 24px;
        }
        .ProseMirror h3 {
          font-size: 20px;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          margin: 0 0 ${paragraphSpacing} 0;
        }
        .ProseMirror ul {
          padding-left: 1.6rem;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          list-style-position: outside;
          padding-left: 1.4rem;
        }
        .ProseMirror ol > li {
          padding-left: 0.25rem;
        }
        .ProseMirror ol > li::marker {
          font-size: 0.9em;
          color: #2e75ba;
          font-weight: 600;
        }
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          gap: 0.5rem;
          align-items: flex-start;
          margin-bottom: 0.35rem;
        }
        .ProseMirror ul[data-type="taskList"] input {
          accent-color: #4aa59c;
          margin-top: 0.2rem;
        }
        .ProseMirror ul:not([data-type="taskList"]) {
          list-style-type: disc;
          list-style-position: outside;
          padding-left: 1.4rem;
          margin: 0 0 ${paragraphSpacing} 0;
        }
        .ProseMirror ul:not([data-type="taskList"]) > li::marker {
          color: #2e75ba;
          font-weight: 700;
          font-size: 0.95em;
        }
        .ProseMirror li p {
          text-align: justify;
        }
        .ProseMirror table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          overflow: hidden;
          border-radius: 12px;
        }
        .ProseMirror table th,
        .ProseMirror table td {
          border: 1px solid #e2e8f0;
          padding: 10px;
        }
        .ProseMirror table th {
          background: #f1f5f9;
          font-weight: 700;
          color: #0f2943;
        }
        .ProseMirror a {
          color: #2e75ba;
          text-decoration: underline;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1rem auto;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        }
        .ProseMirror blockquote {
          border-left: 4px solid #4aa59c;
          padding-left: 1rem;
          color: #475569;
          margin: 1rem 0;
          font-style: italic;
          background: #f8fafc;
          border-radius: 0.5rem;
        }
        @media print {
          @page {
            size: ${paperSize === "LEGAL" ? "8.5in 14in" : "8.5in 11in"};
            margin: 0.75in;
          }
          [data-editor-nonprint="true"] {
            display: none !important;
          }
          body {
            background: white;
          }
          .editor-paper {
            box-shadow: none !important;
            border: none !important;
            width: ${paperWidth};
            min-height: ${paperHeight};
          }
        }
      `}</style>
    </div>
  );
}
