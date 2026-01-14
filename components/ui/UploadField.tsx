"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value?: string;
  onChange: (url: string, info?: { name?: string; mime?: string; size?: number }) => void;
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
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/files/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json?.url) {
        const message = json?.error || "No se pudo subir el archivo";
        setError(message);
        onUploadError?.(message);
        return;
      }
      onChange(json.url, { name: file.name, mime: file.type, size: file.size });
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
        <p className="text-xs text-slate-500">{helperText || "PDF/Imagen, máx 20MB"}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>
      {value && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 flex items-center justify-between gap-2">
          <span className="truncate">{value}</span>
          <button
            type="button"
            className="text-rose-600 font-semibold"
            onClick={() => onChange("")}
            disabled={disabled}
          >
            Quitar
          </button>
        </div>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
