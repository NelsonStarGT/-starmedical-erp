"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SyncPermissionsButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    try {
      setPending(true);
      setMessage(null);
      const response = await fetch("/api/admin/permissions/sync", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo sincronizar RBAC.");
      }
      setMessage("RBAC persistido sincronizado.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo sincronizar RBAC.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleSync}
        disabled={pending}
        className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sincronizando..." : "Sincronizar permisos"}
      </button>
      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
