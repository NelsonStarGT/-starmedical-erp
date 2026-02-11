"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

type Props = {
  value?: string;
  onChange: (url: string, info?: { name?: string; mime?: string; size?: number; fileKey?: string; assetId?: string }) => void;
  accept?: string;
  helperText?: string;
  onUploadSuccess?: () => void;
  onUploadError?: (message: string) => void;
  disabled?: boolean;
};

export default function UploadField({
  value,
  onChange,
  accept = "application/pdf,image/*",
  helperText,
  onUploadSuccess,
  onUploadError,
  disabled
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      const message = "El archivo excede 25MB. Reduce el tamaño o sube otro documento.";
      setError(message);
      onUploadError?.(message);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: form });
      let json: Record<string, any> = {};
      const contentLength = res.headers.get("content-length");
      const hasBody = contentLength === null || contentLength === undefined || contentLength === "" || Number(contentLength) > 0;
      if (hasBody && res.headers.get("content-type")?.includes("application/json")) {
        json = (await res.json().catch(() => ({}))) as Record<string, any>;
      }

      if (!res.ok || !json?.url) {
        const message = String(json?.error || res.statusText || "No se pudo subir el archivo");
        setError(message);
        onUploadError?.(message);
        return;
      }

      onChange(json.url, {
        name: file.name,
        mime: file.type,
        size: file.size,
        fileKey: json.fileKey,
        assetId: json.assetId
      });
      onUploadSuccess?.();
    } catch (err: any) {
      const message = err?.message || "Error al subir archivo";
      setError(message);
      onUploadError?.(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-5 text-center transition hover:border-brand-primary",
          disabled && "cursor-not-allowed opacity-60"
        )}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <p className="text-sm font-semibold text-slate-800">{uploading ? "Subiendo..." : "Arrastra o haz clic para subir"}</p>
        <p className="text-xs text-slate-500">{helperText || "PDF/Imagen, máx 25MB"}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled || uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <span className="truncate">{value}</span>
          <button type="button" className="font-semibold text-rose-600" onClick={() => onChange("")} disabled={disabled}>
            Quitar
          </button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
