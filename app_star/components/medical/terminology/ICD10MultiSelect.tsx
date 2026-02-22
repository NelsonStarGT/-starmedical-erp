"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { EncounterDiagnosis } from "@/components/medical/encounter/types";
import { searchIcd10Mock, type ICD10Item, ICD10_MOCK_CATALOG } from "@/lib/terminology/icd10";

type ICD10SelectMode = "default" | "spotlight";

type Props = {
  value: EncounterDiagnosis;
  onChange: (next: EncounterDiagnosis) => void;
  readOnly?: boolean;
  requiredPrincipal?: boolean;
  className?: string;
  mode?: ICD10SelectMode;
};

type Icd10ApiRow = {
  code: string;
  title: string;
};

type Icd10ApiResponse = {
  ok?: boolean;
  data?: {
    items?: Icd10ApiRow[];
  };
};

const FAVORITES_STORAGE_KEY = "medical:cie10:favorites:v1";

function chipClasses(kind: "principal" | "secondary" | "neutral") {
  if (kind === "principal") return "border-emerald-300 bg-emerald-500 text-white";
  if (kind === "secondary") return "border-amber-300 bg-amber-100 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function actionButtonClasses(active: boolean, disabled: boolean, tone: "principal" | "secondary") {
  if (disabled) return "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500";
  if (active) {
    return tone === "principal"
      ? "border-emerald-300 bg-emerald-500 text-white"
      : "border-amber-300 bg-amber-100 text-amber-900";
  }
  return "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
}

export default function ICD10MultiSelect({
  value,
  onChange,
  readOnly = false,
  requiredPrincipal = true,
  className,
  mode = "default"
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ICD10Item[]>(() => searchIcd10Mock("", 12));
  const [loading, setLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [favoriteCodes, setFavoriteCodes] = useState<string[]>([]);

  const isSpotlight = mode === "spotlight";

  const labelByCode = useMemo(() => {
    const map = new Map(ICD10_MOCK_CATALOG.map((item) => [item.code, item.label]));
    for (const item of results) map.set(item.code, item.label);
    return map;
  }, [results]);

  const selectedSecondarySet = useMemo(() => new Set(value.secondaryCodes), [value.secondaryCodes]);
  const hasPrincipal = Boolean(value.principalCode);
  const favoritesSet = useMemo(() => new Set(favoriteCodes), [favoriteCodes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (!raw) {
        setFavoriteCodes([]);
        return;
      }
      const parsed = JSON.parse(raw);
      setFavoriteCodes(Array.isArray(parsed) ? parsed.filter((code) => typeof code === "string") : []);
    } catch {
      setFavoriteCodes([]);
    }
  }, []);

  const persistFavorites = (next: string[]) => {
    setFavoriteCodes(next);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const toggleFavorite = (code: string) => {
    if (favoritesSet.has(code)) {
      persistFavorites(favoriteCodes.filter((item) => item !== code));
      return;
    }
    persistFavorites([code, ...favoriteCodes].slice(0, 24));
  };

  const favoriteItems = useMemo(() => {
    const map = new Map(ICD10_MOCK_CATALOG.map((item) => [item.code, item]));
    for (const item of results) map.set(item.code, item);
    return favoriteCodes
      .map((code) => {
        const found = map.get(code);
        if (!found) return null;
        return { code: found.code, label: found.label };
      })
      .filter((item): item is ICD10Item => Boolean(item));
  }, [favoriteCodes, results]);

  const rankResult = (item: ICD10Item, rawQuery: string) => {
    const q = rawQuery.trim().toUpperCase();
    if (!q) return 99;
    const code = item.code.toUpperCase();
    const label = item.label.toUpperCase();
    if (code === q) return 0;
    if (code.startsWith(q)) return 1;
    if (code.includes(q)) return 2;
    if (label.includes(q)) return 3;
    return 4;
  };

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        setUsingFallback(false);
        const params = new URLSearchParams();
        params.set("query", query);
        params.set("active", "true");
        params.set("page", "1");
        params.set("pageSize", "30");

        const res = await fetch(`/api/medical/cie10?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("search failed");
        const json = (await res.json()) as Icd10ApiResponse;
        const rawItems = Array.isArray(json?.data?.items) ? json.data.items : [];
        const mapped: ICD10Item[] = rawItems.map((item) => ({ code: item.code, label: item.title }));
        const ranked = mapped.slice().sort((a, b) => {
          const rankA = rankResult(a, query);
          const rankB = rankResult(b, query);
          if (rankA !== rankB) return rankA - rankB;
          return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
        });
        if (active) setResults(ranked.slice(0, 20));
      } catch {
        const fallback = searchIcd10Mock(query, 20).sort((a, b) => {
          const rankA = rankResult(a, query);
          const rankB = rankResult(b, query);
          if (rankA !== rankB) return rankA - rankB;
          return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
        });
        if (active) {
          setResults(fallback);
          setUsingFallback(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const setPrincipal = (code: string) => {
    onChange({
      principalCode: code,
      secondaryCodes: value.secondaryCodes.filter((c) => c !== code)
    });
  };

  const toggleSecondary = (code: string) => {
    if (code === value.principalCode) return;
    const exists = selectedSecondarySet.has(code);
    onChange({
      principalCode: value.principalCode,
      secondaryCodes: exists ? value.secondaryCodes.filter((c) => c !== code) : [...value.secondaryCodes, code]
    });
  };

  const removePrincipal = () => onChange({ ...value, principalCode: null });
  const removeSecondary = (code: string) => onChange({ ...value, secondaryCodes: value.secondaryCodes.filter((c) => c !== code) });

  const resolveLabel = (code: string) => labelByCode.get(code) || null;

  const firstResultCode = results[0]?.code || null;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Seleccionados</div>
          {readOnly && (
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              Solo lectura
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {value.principalCode ? (
            <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", chipClasses("principal"))}>
              <span className="max-w-[360px] truncate">
                Principal: {value.principalCode}
                {resolveLabel(value.principalCode) ? ` · ${resolveLabel(value.principalCode)}` : ""}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={removePrincipal}
                  className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-white/25"
                  aria-label="Quitar diagnóstico principal"
                >
                  x
                </button>
              )}
            </span>
          ) : (
            <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", chipClasses("neutral"))}>
              Principal: pendiente
            </span>
          )}

          {value.secondaryCodes.map((code) => (
            <span
              key={code}
              className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", chipClasses("secondary"))}
            >
              <span className="max-w-[320px] truncate">
                Sec: {code}
                {resolveLabel(code) ? ` · ${resolveLabel(code)}` : ""}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeSecondary(code)}
                  className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[11px] font-bold text-amber-900 hover:bg-amber-200"
                  aria-label={`Quitar diagnóstico secundario ${code}`}
                >
                  x
                </button>
              )}
            </span>
          ))}

          {!value.principalCode && value.secondaryCodes.length === 0 && (
            <span className="text-xs text-slate-500">Busca y selecciona diagnósticos.</span>
          )}
        </div>

        {requiredPrincipal && !hasPrincipal && !readOnly && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            Requiere exactamente 1 diagnóstico principal para cerrar la consulta.
          </div>
        )}
      </div>

      {isSpotlight ? (
        <div className="rounded-2xl border border-[#dbe9ff] bg-[#f6faff] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Spotlight CIE-10</p>
          <p className="mt-1 text-xs text-slate-600">Atajos: Enter = principal del primer resultado, Shift+Enter = secundario.</p>
        </div>
      ) : null}

      {isSpotlight && favoriteItems.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Favoritos</div>
          <div className="flex flex-wrap gap-2">
            {favoriteItems.map((item) => (
              <div key={`fav-${item.code}`} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">
                <button
                  type="button"
                  onClick={() => setPrincipal(item.code)}
                  disabled={readOnly}
                  className="text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {item.code}
                </button>
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => toggleSecondary(item.code)}
                    className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                    title="Agregar/quitar secundario"
                  >
                    S
                  </button>
                ) : null}
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => toggleFavorite(item.code)}
                    className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                    title="Quitar favorito"
                  >
                    Fav
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {isSpotlight ? "Spotlight CIE-10" : "Buscar CIE-10"}
          </label>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            {loading ? <span className="text-diagnostics-primary font-semibold">Buscando...</span> : <span>-</span>}
            {usingFallback && <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold">mock</span>}
          </div>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(event) => {
            if (readOnly || !firstResultCode || event.key !== "Enter") return;
            event.preventDefault();
            if (event.shiftKey) {
              toggleSecondary(firstResultCode);
              return;
            }
            setPrincipal(firstResultCode);
          }}
          disabled={readOnly}
          placeholder="Codigo o texto (ej. I10, cefalea)"
          className={cn(
            "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition",
            readOnly
              ? "bg-slate-50"
              : isSpotlight
                ? "bg-white focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/20"
                : "bg-white focus:border-diagnostics-primary focus:ring-2 focus:ring-diagnostics-primary/15"
          )}
        />
        <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-500">Sin resultados</div>
          ) : (
            results.map((item, index) => {
              const isPrincipal = value.principalCode === item.code;
              const isSecondary = selectedSecondarySet.has(item.code);
              const isFavorite = favoritesSet.has(item.code);
              const secondaryDisabled = readOnly || isPrincipal;
              const showShortcutHint = index === 0 && !readOnly;

              return (
                <div
                  key={item.code}
                  className={cn(
                    "flex items-start justify-between gap-3 border-b border-slate-100 px-3 py-3",
                    isPrincipal && "bg-emerald-50",
                    isSecondary && !isPrincipal && "bg-amber-50"
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-slate-900">{item.code}</div>
                      {isFavorite ? (
                        <span className="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          Fav
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{item.label}</div>
                    {showShortcutHint ? (
                      <div className="mt-1 text-[10px] font-semibold text-[#2e75ba]">Enter/Pri · Shift+Enter/Sec</div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!readOnly ? (
                      <button
                        type="button"
                        onClick={() => toggleFavorite(item.code)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                          isFavorite
                            ? "border-[#2e75ba]/30 bg-[#f2f8ff] text-[#2e75ba]"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                        title={isFavorite ? "Quitar favorito" : "Agregar favorito"}
                      >
                        Fav
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => setPrincipal(item.code)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold transition",
                        actionButtonClasses(isPrincipal, readOnly, "principal")
                      )}
                    >
                      Principal
                    </button>
                    <button
                      type="button"
                      disabled={secondaryDisabled}
                      onClick={() => toggleSecondary(item.code)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold transition",
                        actionButtonClasses(isSecondary, secondaryDisabled, "secondary")
                      )}
                    >
                      Secundario
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="text-[11px] text-slate-500">
          Fuente: catalogo CIE-10 interno (`/api/medical/cie10`), con fallback mock en entorno sin tablas.
        </div>
      </div>
    </div>
  );
}
