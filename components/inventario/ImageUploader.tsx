"use client";

import { useCallback, useRef, useState, DragEvent } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type ImageUploaderProps = {
  value?: string;
  onChange: (url?: string) => void;
  endpoint?: string;
  maxSizeMB?: number;
  accept?: string[];
  disabled?: boolean;
};

const ACCEPT_DEFAULT = ["image/png", "image/jpeg"];
const DEFAULT_MAX_MB = 20;

export function ImageUploader({
  value,
  onChange,
  endpoint = "/api/upload/image",
  maxSizeMB = DEFAULT_MAX_MB,
  accept = ACCEPT_DEFAULT,
  disabled
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const file = fileList[0];
      if (!accept.includes(file.type)) {
        setError("Solo se admite JPG o PNG");
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Máximo ${maxSizeMB}MB`);
        return;
      }
      setError(null);
      setLoading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(endpoint, { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || "No se pudo subir la imagen");
          return;
        }
        onChange(json.url);
      } catch (e) {
        console.error(e);
        setError("Error subiendo la imagen");
      } finally {
        setLoading(false);
      }
    },
    [accept, endpoint, maxSizeMB, onChange]
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#E5E5E7] bg-white px-4 py-6 text-center transition hover:border-brand-primary",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        <p className="text-sm font-semibold text-slate-800">Arrastra una imagen o haz clic</p>
        <p className="text-xs text-slate-500">JPG/PNG · Máx {maxSizeMB}MB</p>
        {loading && <p className="text-xs text-brand-primary">Subiendo...</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept.join(",")}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {value && (
        <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <Image src={value} alt="preview" fill className="object-cover" />
          <button
            onClick={() => onChange(undefined)}
            className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow"
            type="button"
          >
            Quitar
          </button>
        </div>
      )}
    </div>
  );
}
