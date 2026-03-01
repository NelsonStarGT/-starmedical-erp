"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Eye, FolderOpen, MoreHorizontal, PanelRightOpen } from "lucide-react";
import { ClientArchiveAction } from "@/components/clients/ClientArchiveAction";
import ClientPreviewSheet, { type ClientPreviewSeed } from "@/components/clients/ClientPreviewSheet";

type PreviewSection = "summary" | "documents";

type ClientRowActionsData = ClientPreviewSeed & {
  id: string;
  isArchived: boolean;
};

const MENU_WIDTH = 224;
const MENU_OFFSET = 8;
const VIEWPORT_PADDING = 8;
const FALLBACK_MENU_HEIGHT = 220;

export const CLIENT_ROW_ACTIONS_MENU_PORTAL_ATTR = "data-client-row-actions-portal";

export function resolveClientRowActionsMenuPosition(input: {
  triggerRect: Pick<DOMRect, "top" | "bottom" | "right">;
  viewportWidth: number;
  viewportHeight: number;
  menuWidth?: number;
  menuHeight?: number;
}) {
  const menuWidth = Math.max(180, Math.floor(input.menuWidth ?? MENU_WIDTH));
  const menuHeight = Math.max(120, Math.floor(input.menuHeight ?? FALLBACK_MENU_HEIGHT));
  const preferredLeft = input.triggerRect.right - menuWidth;
  const maxLeft = Math.max(VIEWPORT_PADDING, input.viewportWidth - menuWidth - VIEWPORT_PADDING);
  const left = Math.min(Math.max(preferredLeft, VIEWPORT_PADDING), maxLeft);

  let top = input.triggerRect.bottom + MENU_OFFSET;
  if (top + menuHeight > input.viewportHeight - VIEWPORT_PADDING) {
    top = Math.max(VIEWPORT_PADDING, input.triggerRect.top - menuHeight - MENU_OFFSET);
  }

  return {
    top,
    left
  };
}

export default function ClientRowActions({
  row,
  canViewDocs,
  mode = "menu"
}: {
  row: ClientRowActionsData;
  canViewDocs: boolean;
  mode?: "menu" | "direct";
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSection, setPreviewSection] = useState<PreviewSection>("summary");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [portalReady, setPortalReady] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const openPreview = (section: PreviewSection) => {
    setPreviewSection(section);
    setPreviewOpen(true);
    setMenuOpen(false);
  };

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!menuOpen || !portalReady) return;

    const syncPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const triggerRect = trigger.getBoundingClientRect();
      const next = resolveClientRowActionsMenuPosition({
        triggerRect,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        menuWidth: MENU_WIDTH,
        menuHeight: menuRef.current?.offsetHeight ?? FALLBACK_MENU_HEIGHT
      });
      setMenuPosition(next);
    };

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setMenuOpen(false);
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    syncPosition();
    window.addEventListener("resize", syncPosition);
    window.addEventListener("scroll", syncPosition, true);
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, true);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [menuOpen, portalReady]);

  if (mode === "direct") {
    return (
      <>
        <button
          type="button"
          onClick={() => openPreview("summary")}
          disabled={row.isArchived}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Eye size={14} />
          Ver ficha
        </button>

        <ClientPreviewSheet
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          clientId={row.id}
          initialSection={previewSection}
          seed={{
            displayName: row.displayName,
            identifier: row.identifier,
            phone: row.phone,
            email: row.email,
            statusLabel: row.statusLabel,
            isIncomplete: row.isIncomplete,
            healthScore: row.healthScore,
            hasExpiredDocs: row.hasExpiredDocs,
            hasExpiringDocs: row.hasExpiringDocs
          }}
        />
      </>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Abrir menú de acciones"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
        className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2 py-1 text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aadf5]"
      >
        <MoreHorizontal size={16} />
      </button>

      {menuOpen && portalReady
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{
                position: "fixed",
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                width: `${MENU_WIDTH}px`
              }}
              className="z-[90] rounded-xl border border-slate-200 bg-white p-1 shadow-md"
              {...{ [CLIENT_ROW_ACTIONS_MENU_PORTAL_ATTR]: "true" }}
            >
              {!row.isArchived && (
                <button
                  type="button"
                  onClick={() => openPreview("summary")}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-[#f8fafc]"
                >
                  <Eye size={14} />
                  Ver ficha
                </button>
              )}
              {!row.isArchived && canViewDocs && (
                <button
                  type="button"
                  onClick={() => openPreview("documents")}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-[#f8fafc]"
                >
                  <FolderOpen size={14} />
                  Documentos
                </button>
              )}

              {!row.isArchived && (
                <Link
                  href={`/admin/clientes/${row.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-[#f8fafc]"
                >
                  <PanelRightOpen size={14} />
                  Ir al perfil
                </Link>
              )}

              <div onClick={() => setMenuOpen(false)}>
                {row.isArchived ? (
                  <ClientArchiveAction clientId={row.id} mode="restore" variant="menu" label="Restaurar" />
                ) : (
                  <ClientArchiveAction clientId={row.id} variant="menu" label="Archivar" />
                )}
              </div>
            </div>,
            document.body
          )
        : null}

      <ClientPreviewSheet
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        clientId={row.id}
        initialSection={previewSection}
        seed={{
          displayName: row.displayName,
          identifier: row.identifier,
          phone: row.phone,
          email: row.email,
          statusLabel: row.statusLabel,
          isIncomplete: row.isIncomplete,
          healthScore: row.healthScore,
          hasExpiredDocs: row.hasExpiredDocs,
          hasExpiringDocs: row.hasExpiringDocs
        }}
      />
    </>
  );
}
