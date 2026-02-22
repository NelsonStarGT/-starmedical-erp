"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Eye, FolderOpen, MoreHorizontal, PanelRightOpen } from "lucide-react";
import { ClientArchiveAction } from "@/components/clients/ClientArchiveAction";
import ClientPreviewSheet, { type ClientPreviewSeed } from "@/components/clients/ClientPreviewSheet";

type PreviewSection = "summary" | "documents";

type ClientRowActionsData = ClientPreviewSeed & {
  id: string;
  isArchived: boolean;
};

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
  const menuRef = useRef<HTMLDetailsElement | null>(null);

  const openPreview = (section: PreviewSection) => {
    setPreviewSection(section);
    setPreviewOpen(true);
    if (menuRef.current) menuRef.current.open = false;
  };

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
      <details ref={menuRef} className="relative">
        <summary
          aria-label="Abrir menú de acciones"
          className="inline-flex cursor-pointer select-none items-center justify-center rounded-lg border border-slate-200 px-2 py-1 text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aadf5]"
        >
          <MoreHorizontal size={16} />
        </summary>
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-md">
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
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-[#f8fafc]"
            >
              <PanelRightOpen size={14} />
              Ir al perfil
            </Link>
          )}

          {row.isArchived ? (
            <ClientArchiveAction clientId={row.id} mode="restore" variant="menu" label="Restaurar" />
          ) : (
            <ClientArchiveAction clientId={row.id} variant="menu" label="Archivar" />
          )}
        </div>
      </details>

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
