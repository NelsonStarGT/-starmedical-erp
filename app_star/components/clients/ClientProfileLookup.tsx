"use client";

import { useMemo, useState, useTransition } from "react";
import { ClientProfileType } from "@prisma/client";
import { Search } from "lucide-react";
import { actionSearchClientProfiles } from "@/app/admin/clientes/actions";
import { CLIENT_TYPE_LABELS } from "@/lib/clients/constants";
import { cn } from "@/lib/utils";

export type ClientProfileLookupItem = { id: string; type: ClientProfileType; label: string };

export function ClientProfileLookup({
  label,
  types,
  value,
  onChange,
  disabled,
  placeholder
}: {
  label: string;
  types: ClientProfileType[];
  value: ClientProfileLookupItem | null;
  onChange: (item: ClientProfileLookupItem | null) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ClientProfileLookupItem[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = () => {
    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }
    startTransition(async () => {
      try {
        const result = await actionSearchClientProfiles({ q, types, limit: 20 });
        setItems(result.items as ClientProfileLookupItem[]);
        setOpen(true);
        setError(null);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo buscar.");
      }
    });
  };

  const isDisabled = Boolean(disabled || isPending);
  const effectivePlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    if (value) return value.label;
    return "Escribe para buscar…";
  }, [placeholder, value]);

  return (
    <div className="relative space-y-1">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={effectivePlaceholder}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
            disabled={isDisabled}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                search();
              }
            }}
          />
        </div>
        <button
          type="button"
          onClick={search}
          disabled={isDisabled}
          className={cn(
            "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-diagnostics-secondary hover:text-diagnostics-corporate",
            isDisabled && "cursor-not-allowed opacity-60"
          )}
        >
          Buscar
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={isDisabled}
            className={cn(
              "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900",
              isDisabled && "cursor-not-allowed opacity-60"
            )}
          >
            Limpiar
          </button>
        )}
      </div>

      {open && items.length > 0 && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="max-h-56 overflow-auto p-1">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange(item);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-diagnostics-background"
              >
                <span className="truncate font-semibold text-slate-900">{item.label}</span>
                <span className="ml-2 shrink-0 text-xs font-semibold text-slate-500">
                  {CLIENT_TYPE_LABELS[item.type]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-rose-700">{error}</p>}
    </div>
  );
}

