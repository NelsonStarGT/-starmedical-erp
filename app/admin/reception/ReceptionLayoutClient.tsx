"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import AdmissionModal from "@/components/reception/AdmissionModal";
import { AdmissionModalProvider, useAdmissionModal } from "@/components/reception/useAdmissionModal";
import { cn } from "@/lib/utils";
import { RECEPTION_ROLE_LABELS, type ReceptionCapability, type ReceptionRole } from "@/lib/reception/permissions";
import { ReceptionBranchProvider, useReceptionBranch, type ReceptionBranchOption } from "./BranchContext";

export default function ReceptionLayoutClient({
  children,
  receptionRole,
  capabilities,
  branches,
  initialActiveBranchId
}: {
  children: React.ReactNode;
  receptionRole: ReceptionRole;
  capabilities: ReceptionCapability[];
  branches: ReceptionBranchOption[];
  initialActiveBranchId: string | null;
}) {
  return (
    <ReceptionBranchProvider initialActiveBranchId={initialActiveBranchId} branches={branches}>
      <AdmissionModalProvider>
        <ReceptionLayoutContent receptionRole={receptionRole} capabilities={capabilities}>
          {children}
        </ReceptionLayoutContent>
      </AdmissionModalProvider>
    </ReceptionBranchProvider>
  );
}

function ReceptionLayoutContent({
  children,
  receptionRole,
  capabilities
}: {
  children: React.ReactNode;
  receptionRole: ReceptionRole;
  capabilities: ReceptionCapability[];
}) {
  const router = useRouter();
  const { openAdmission } = useAdmissionModal();
  const { activeBranchId, branches, setActiveBranchId, isUpdating, error: branchError } = useReceptionBranch();

  const [showBranchPrompt, setShowBranchPrompt] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const activeBranchLabel = useMemo(() => {
    if (!activeBranchId) return null;
    const branch = branches.find((item) => item.id === activeBranchId);
    if (!branch) return null;
    return branch.code ? `${branch.code} · ${branch.name}` : branch.name;
  }, [activeBranchId, branches]);

  const canNavigateOperational = Boolean(activeBranchId);
  const isSupervisorMode = useMemo(
    () =>
      capabilities.includes("QUEUE_SKIP") ||
      capabilities.includes("QUEUE_TRANSFER") ||
      capabilities.includes("QUEUE_REORDER") ||
      capabilities.includes("VISIT_CANCEL") ||
      capabilities.includes("VISIT_NO_SHOW") ||
      capabilities.includes("VISIT_CHECKOUT_OVERRIDE"),
    [capabilities]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingContext = Boolean(
        target?.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']")
      );
      if (isTypingContext) return;

      if (event.key === "/") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("reception:focus-search"));
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        openAdmission({ source: "header" });
        return;
      }

      if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        if (canNavigateOperational) {
          router.push("/admin/reception/appointments");
          return;
        }
        setPendingHref("/admin/reception/appointments");
        setShowBranchPrompt(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canNavigateOperational, openAdmission, router]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#dce7f5] bg-white/95 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2e75ba]">Recepción V2</p>
            <h1 className="text-2xl font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
              Operación clínica de primera línea
            </h1>
            <p className="text-sm text-slate-600">Lista operativa y agenda de citas con admisión rápida en modal.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#2e75ba]/10 px-3 py-1 text-xs font-semibold text-[#2e75ba]">
              Rol: {RECEPTION_ROLE_LABELS[receptionRole]}
            </span>
            {isSupervisorMode && (
              <span className="rounded-full bg-[#2e75ba]/10 px-3 py-1 text-xs font-semibold text-[#2e75ba]">
                Modo Supervisor
              </span>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sede activa</label>
              <select
                value={activeBranchId ?? ""}
                onChange={(e) => setActiveBranchId(e.target.value)}
                disabled={branches.length === 0 || isUpdating}
                className={cn(
                  "min-w-[220px] rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm",
                  "border-slate-200 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30",
                  !activeBranchId && "text-slate-400"
                )}
              >
                <option value="" disabled>
                  Selecciona una sede…
                </option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code ? `${branch.code} · ${branch.name}` : branch.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => openAdmission({ source: "header" })}
              aria-label="Nueva admisión (atajo N)"
              className={cn(
                "inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f988f]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c] focus-visible:ring-offset-2",
                !canNavigateOperational && "opacity-70"
              )}
            >
              <Plus size={14} />
              + Admisión
            </button>
          </div>
        </div>

        {(branchError || !activeBranchId) && (
          <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {branchError ?? "Selecciona una sede activa para operar en Recepción."}
          </div>
        )}

        {activeBranchLabel && (
          <div className="mt-3 text-xs text-slate-500">
            Operando en: <span className="font-semibold text-[#2e75ba]">{activeBranchLabel}</span>
          </div>
        )}
        <div className="mt-2 text-[11px] text-slate-500">
          Atajos: <span className="font-semibold text-[#2e75ba]">/</span> buscar,{" "}
          <span className="font-semibold text-[#2e75ba]">N</span> admisión,{" "}
          <span className="font-semibold text-[#2e75ba]">C</span> crear cita,{" "}
          <span className="font-semibold text-[#2e75ba]">Esc</span> cerrar modal.
        </div>

      </section>

      {children}

      <AdmissionModal />

      <Modal
        open={showBranchPrompt}
        onClose={() => setShowBranchPrompt(false)}
        title="Selecciona una sede para continuar"
        subtitle="Recepción requiere sede activa"
        className="max-w-xl"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowBranchPrompt(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!activeBranchId}
              onClick={() => {
                const target = pendingHref;
                setPendingHref(null);
                setShowBranchPrompt(false);
                if (target) router.push(target);
              }}
              className={cn(
                "rounded-lg bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f988f]",
                !activeBranchId && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
              )}
            >
              Continuar
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Selecciona la sede activa para mantener trazabilidad correcta de admisiones, agenda y atención operativa.
        </p>
      </Modal>
    </div>
  );
}
