"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw, X } from "lucide-react";
import { ClientProfileType } from "@prisma/client";
import { actionRestoreClientProfile, actionSoftDeleteClientProfile } from "@/app/admin/clientes/actions";
import { cn } from "@/lib/utils";

function getListPath(type: ClientProfileType) {
  if (type === ClientProfileType.PERSON) return "/admin/clientes/personas";
  if (type === ClientProfileType.COMPANY) return "/admin/clientes/empresas";
  if (type === ClientProfileType.INSTITUTION) return "/admin/clientes/instituciones";
  return "/admin/clientes/aseguradoras";
}

export function ClientArchiveAction({
  clientId,
  mode = "archive",
  variant = "button",
  redirectAfterArchive = false,
  label
}: {
  clientId: string;
  mode?: "archive" | "restore";
  variant?: "button" | "menu";
  redirectAfterArchive?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isMenu = variant === "menu";

  const openModal = () => {
    if (isPending) return;
    setReason("");
    setError(null);
    setOpen(true);
  };

  const closeModal = () => {
    if (isPending) return;
    setOpen(false);
    setError(null);
  };

  const submit = () => {
    if (isPending) return;
    const normalizedReason = mode === "archive" ? reason.trim() || undefined : undefined;

    startTransition(async () => {
      try {
        const result =
          mode === "archive"
            ? await actionSoftDeleteClientProfile(clientId, normalizedReason)
            : await actionRestoreClientProfile(clientId);
        setError(null);
        setOpen(false);
        if (redirectAfterArchive && mode === "archive") {
          router.push(getListPath(result.type));
          return;
        }
        router.refresh();
      } catch (err) {
        const message =
          (err as Error)?.message || (mode === "archive" ? "No se pudo archivar el cliente." : "No se pudo restaurar el cliente.");
        setError(message);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={isPending}
        className={cn(
          isMenu
            ? mode === "archive"
              ? "block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
              : "block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#2e75ba] hover:bg-[#4aadf5]/10"
            : "inline-flex items-center gap-2 rounded-full border border-[#4aadf5] bg-white px-4 py-2 text-sm font-semibold text-[#2e75ba] hover:bg-[#4aadf5]/10",
          isPending && "cursor-not-allowed opacity-60"
        )}
      >
        {!isMenu && (mode === "archive" ? <Archive size={16} /> : <RotateCcw size={16} />)}
        {label ?? (mode === "archive" ? "Archivar cliente" : "Restaurar cliente")}
      </button>
      {!isMenu && error && !open && <p className="text-sm text-rose-700">{error}</p>}

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">Clientes</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                  {mode === "archive" ? "Archivar cliente" : "Restaurar cliente"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              {mode === "archive"
                ? "Este cliente se ocultará de los listados y la búsqueda."
                : "El cliente volverá a estar disponible en los listados y búsquedas."}
            </p>

            {mode === "archive" && (
              <div className="mt-4 space-y-1">
                <label htmlFor={`archive-reason-${clientId}`} className="text-xs font-semibold text-slate-500">
                  Motivo (opcional)
                </label>
                <input
                  id={`archive-reason-${clientId}`}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Ej. Cliente duplicado / solicitud administrativa"
                  disabled={isPending}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/30"
                />
              </div>
            )}

            {error && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className={cn(
                  "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]",
                  isPending && "cursor-not-allowed opacity-60"
                )}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={isPending}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold",
                  mode === "archive"
                    ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    : "bg-[#4aa59c] text-white hover:bg-[#4aadf5]",
                  isPending && "cursor-not-allowed opacity-60"
                )}
              >
                {isPending ? "Guardando..." : mode === "archive" ? "Archivar" : "Restaurar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
