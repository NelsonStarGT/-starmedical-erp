"use client";

import { useState } from "react";

export function PortalResultDownloadButton({ assetId }: { assetId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/portal/api/files/signed?assetId=${encodeURIComponent(assetId)}`, {
        method: "GET",
        credentials: "include"
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.url) {
        throw new Error(String(payload?.error || "No se pudo generar el enlace de descarga."));
      }
      window.location.href = String(payload.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el enlace de descarga.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="rounded-full border border-[#d2e2f6] bg-[#f6fbff] px-3 py-1 text-xs font-semibold text-[#2e75ba] hover:border-[#4aadf5] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Generando..." : "Ver/descargar"}
      </button>
      {error && <p className="max-w-[220px] text-right text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
