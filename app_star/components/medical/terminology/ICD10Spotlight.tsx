"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";
import type { EncounterDiagnosis } from "@/components/medical/encounter/types";
import { type ICD10Item, searchIcd10Mock, ICD10_MOCK_CATALOG } from "@/lib/terminology/icd10";

type ToastVariant = "success" | "error" | "info";

type Props = {
  value: EncounterDiagnosis;
  onChange: (next: EncounterDiagnosis) => void;
  readOnly?: boolean;
  requiredPrincipal?: boolean;
  placeholder?: string;
  maxResults?: number;
  inputId?: string;
  onToast?: (message: string, variant?: ToastVariant) => void;
};

type Icd10ApiRow = {
  code: string;
  title: string;
  isActive?: boolean;
};

type Icd10ApiResponse = {
  ok?: boolean;
  data?: {
    items?: Icd10ApiRow[];
  };
};

const FAVORITES_KEY = "starmedical.cie10.favorites";
const RECENTS_KEY = "starmedical.cie10.recents";

function loadCodesFromStorage(key: string) {
  if (typeof window === "undefined") return [] as string[];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === "string");
  } catch {
    return [];
  }
}

function saveCodesToStorage(key: string, codes: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(codes));
  } catch {
    /* ignore */
  }
}

function safeUniqueCodes(codes: string[], limit: number) {
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const code of codes) {
    const normalized = code.trim().toUpperCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    clean.push(normalized);
    if (clean.length >= limit) break;
  }
  return clean;
}

function resultStatusPill(active: boolean) {
  return active ? "border-[#2e75ba]/40 bg-[#edf5ff]" : "border-slate-200 bg-white";
}

export default function ICD10Spotlight({
  value,
  onChange,
  readOnly = false,
  requiredPrincipal = true,
  placeholder = "Buscar CIE-10 por código o texto",
  maxResults = 20,
  inputId = "icd10-spotlight-input",
  onToast
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ICD10Item[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [catalogMap, setCatalogMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const item of ICD10_MOCK_CATALOG) {
      map[item.code.toUpperCase()] = item.label;
    }
    return map;
  });

  const blurTimeoutRef = useRef<number | null>(null);

  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);
  const secondarySet = useMemo(() => new Set(value.secondaryCodes), [value.secondaryCodes]);
  const activeResult = results[activeIndex] || results[0] || null;
  const hasPrincipal = Boolean(value.principalCode);

  const emitToast = (message: string, variant: ToastVariant = "info") => {
    onToast?.(message, variant);
  };

  useEffect(() => {
    setFavorites(loadCodesFromStorage(FAVORITES_KEY));
    setRecents(loadCodesFromStorage(RECENTS_KEY));
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("query", query.trim());
        params.set("active", "true");
        params.set("page", "1");
        params.set("pageSize", String(Math.max(5, Math.min(50, maxResults))));
        const response = await fetch(`/api/medical/cie10?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("search failed");
        const json = (await response.json()) as Icd10ApiResponse;
        const items = Array.isArray(json?.data?.items) ? json.data.items : [];
        const mapped = items.map((item) => ({ code: item.code.toUpperCase(), label: item.title.trim() || item.code.toUpperCase() }));
        if (active) {
          setResults(mapped.slice(0, maxResults));
          setCatalogMap((prev) => {
            const next = { ...prev };
            for (const item of mapped) {
              next[item.code] = item.label;
            }
            return next;
          });
          setActiveIndex(0);
        }
      } catch {
        const fallback = searchIcd10Mock(query.trim(), maxResults).map((item) => ({
          code: item.code.toUpperCase(),
          label: item.label
        }));
        if (active) {
          setResults(fallback);
          setCatalogMap((prev) => {
            const next = { ...prev };
            for (const item of fallback) {
              next[item.code] = item.label;
            }
            return next;
          });
          setActiveIndex(0);
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [maxResults, query]);

  const pushRecent = (code: string) => {
    const next = safeUniqueCodes([code, ...recents], 10);
    setRecents(next);
    saveCodesToStorage(RECENTS_KEY, next);
  };

  const lookupCodeInApi = async (code: string) => {
    const normalized = code.trim().toUpperCase();
    const params = new URLSearchParams();
    params.set("query", normalized);
    params.set("active", "true");
    params.set("page", "1");
    params.set("pageSize", "20");

    const response = await fetch(`/api/medical/cie10?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("lookup failed");
    const json = (await response.json()) as Icd10ApiResponse;
    const items = Array.isArray(json?.data?.items) ? json.data.items : [];

    const exact = items.find((item) => item.code?.trim().toUpperCase() === normalized && item.isActive !== false);
    if (!exact) return null;

    return {
      code: normalized,
      label: exact.title?.trim() || normalized
    };
  };

  const toggleFavorite = (code: string) => {
    if (readOnly) return;
    const normalized = code.trim().toUpperCase();
    if (favoritesSet.has(normalized)) {
      const next = favorites.filter((item) => item !== normalized);
      setFavorites(next);
      saveCodesToStorage(FAVORITES_KEY, next);
      emitToast(`Favorito removido: ${normalized}`, "info");
      return;
    }
    const next = safeUniqueCodes([normalized, ...favorites], 50);
    setFavorites(next);
    saveCodesToStorage(FAVORITES_KEY, next);
    emitToast(`Favorito agregado: ${normalized}`, "success");
  };

  const setPrincipal = (code: string) => {
    if (readOnly) return;
    const normalized = code.trim().toUpperCase();
    onChange({
      principalCode: normalized,
      secondaryCodes: value.secondaryCodes.filter((item) => item !== normalized)
    });
    pushRecent(normalized);
    emitToast(`Diagnóstico principal: ${normalized}`, "success");
  };

  const addSecondary = (code: string) => {
    if (readOnly) return;
    const normalized = code.trim().toUpperCase();
    if (value.principalCode === normalized) {
      emitToast("Ese código ya es diagnóstico principal.", "info");
      return;
    }
    if (secondarySet.has(normalized)) {
      emitToast("Ese código ya está en diagnósticos secundarios.", "info");
      return;
    }
    onChange({
      principalCode: value.principalCode,
      secondaryCodes: [...value.secondaryCodes, normalized]
    });
    pushRecent(normalized);
    emitToast(`Diagnóstico secundario agregado: ${normalized}`, "success");
  };

  const applyFromChip = async (code: string) => {
    if (readOnly) return;
    const normalized = code.trim().toUpperCase();
    if (!catalogMap[normalized]) {
      try {
        const resolved = await lookupCodeInApi(normalized);
        if (!resolved) {
          emitToast(`El código ${normalized} no existe o está inactivo.`, "error");
          return;
        }
        setCatalogMap((prev) => ({ ...prev, [resolved.code]: resolved.label }));
      } catch {
        emitToast("No se pudo validar el código CIE-10 en este momento.", "error");
        return;
      }
    }
    if (!hasPrincipal) {
      setPrincipal(normalized);
      return;
    }
    addSecondary(normalized);
  };

  const chipItems = (codes: string[]) =>
    codes
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean)
      .map((code) => ({
        code,
        label: catalogMap[code] || code
      }));

  const favoriteItems = chipItems(favorites);
  const recentItems = chipItems(recents);

  const onInputBlur = () => {
    if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
    blurTimeoutRef.current = window.setTimeout(() => setOpen(false), 120);
  };

  const onInputFocus = () => {
    if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
    setOpen(true);
  };

  const onKeyboardAction = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(results.length - 1, prev + 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key !== "Enter") return;
    if (!activeResult) return;
    event.preventDefault();
    if (readOnly) return;

    if (event.shiftKey) {
      addSecondary(activeResult.code);
      return;
    }

    if (!value.principalCode) {
      setPrincipal(activeResult.code);
      return;
    }
    addSecondary(activeResult.code);
  };

  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-[#dbe9ff] bg-[#f6faff] p-3">
        <label htmlFor={inputId} className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">
          Spotlight CIE-10
        </label>
        <div className="mt-2 relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id={inputId}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            onKeyDown={onKeyboardAction}
            disabled={readOnly}
            placeholder={placeholder}
            autoComplete="off"
            className={cn(
              "w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition",
              "focus-visible:ring-2 focus-visible:ring-[#2e75ba]",
              readOnly && "cursor-not-allowed bg-slate-50 text-slate-500"
            )}
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-600">
          Atajos: <span className="font-semibold text-slate-700">Enter</span> principal (si no existe) / secundario,{" "}
          <span className="font-semibold text-slate-700">Shift + Enter</span> secundario.
        </p>
      </div>

      {requiredPrincipal && !value.principalCode && !readOnly ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          Falta diagnóstico principal CIE-10 para cerrar.
        </div>
      ) : null}

      {open ? (
        <div
          className="rounded-2xl border border-slate-200 bg-white shadow-soft"
          onMouseDown={(event) => {
            event.preventDefault();
            if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
          }}
        >
          <div className="max-h-[420px] overflow-y-auto p-3">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Favoritos</p>
              <div className="flex flex-wrap gap-2">
                {favoriteItems.length === 0 ? (
                  <span className="text-xs text-slate-500">Sin favoritos.</span>
                ) : (
                  favoriteItems.map((item) => (
                    <button
                      key={`fav-chip-${item.code}`}
                      type="button"
                      disabled={readOnly}
                      onClick={() => applyFromChip(item.code)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                        "border-[#2e75ba]/25 bg-[#f2f8ff] text-[#2e75ba]",
                        readOnly && "cursor-not-allowed opacity-60"
                      )}
                    >
                      <StarIconSolid className="h-3.5 w-3.5" />
                      <span>{item.code}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Recientes</p>
              <div className="flex flex-wrap gap-2">
                {recentItems.length === 0 ? (
                  <span className="text-xs text-slate-500">Sin recientes.</span>
                ) : (
                  recentItems.map((item) => (
                    <button
                      key={`recent-chip-${item.code}`}
                      type="button"
                      disabled={readOnly}
                      onClick={() => applyFromChip(item.code)}
                      className={cn(
                        "rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700",
                        readOnly && "cursor-not-allowed opacity-60"
                      )}
                    >
                      {item.code}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Resultados</p>
              <span className="text-[11px] text-slate-500">{loading ? "Buscando..." : `${results.length} resultados`}</span>
            </div>

            <div className="mt-2 space-y-2">
              {results.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  Sin coincidencias.
                </div>
              ) : (
                results.map((item, idx) => {
                  const isActive = idx === activeIndex;
                  const isFavorite = favoritesSet.has(item.code);
                  const isPrincipal = value.principalCode === item.code;
                  const isSecondary = secondarySet.has(item.code);
                  return (
                    <article key={item.code} className={cn("rounded-xl border p-3 transition", resultStatusPill(isActive))}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-700">{item.code}</span>
                            {isPrincipal ? (
                              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                Principal
                              </span>
                            ) : null}
                            {!isPrincipal && isSecondary ? (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                Secundario
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-slate-700">{item.label}</p>
                        </div>
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => toggleFavorite(item.code)}
                          className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-full border transition",
                            isFavorite
                              ? "border-[#2e75ba]/35 bg-[#f2f8ff] text-[#2e75ba]"
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                            readOnly && "cursor-not-allowed opacity-60"
                          )}
                          aria-label={isFavorite ? `Quitar ${item.code} de favoritos` : `Agregar ${item.code} a favoritos`}
                        >
                          {isFavorite ? <StarIconSolid className="h-4 w-4" /> : <StarIconOutline className="h-4 w-4" />}
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => setPrincipal(item.code)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-semibold",
                            readOnly ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400" : "border-[#2e75ba]/25 bg-[#f2f8ff] text-[#2e75ba]"
                          )}
                        >
                          Marcar como principal
                        </button>
                        <button
                          type="button"
                          disabled={readOnly || value.principalCode === item.code}
                          onClick={() => addSecondary(item.code)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-semibold",
                            readOnly || value.principalCode === item.code
                              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          + Secundario
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
