"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import CompactToolbar from "@/components/ui/CompactToolbar";

export default function ClientBulkActionsPanel({
  formId,
  children
}: {
  formId: string;
  children: ReactNode;
}) {
  const [selectedCount, setSelectedCount] = useState(0);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) return;

    const updateSelectedCount = () => {
      const checked = form.querySelectorAll<HTMLInputElement>('input[name="ids"]:checked').length;
      setSelectedCount(checked);
    };

    updateSelectedCount();
    form.addEventListener("change", updateSelectedCount);
    return () => form.removeEventListener("change", updateSelectedCount);
  }, [formId]);

  return (
    <CompactToolbar visible={selectedCount > 0} sticky className="border-[#cfe3fb]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Acciones masivas</p>
        <span className="rounded-full border border-slate-200 bg-[#f8fafc] px-2 py-1 text-xs font-semibold text-slate-700">
          {selectedCount} seleccionado{selectedCount === 1 ? "" : "s"}
        </span>
      </div>
      {children}
    </CompactToolbar>
  );
}
