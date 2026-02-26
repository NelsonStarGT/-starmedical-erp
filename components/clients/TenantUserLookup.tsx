"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Search, Unlink2 } from "lucide-react";
import { actionSearchTenantUsers } from "@/app/admin/clientes/actions";
import { canSearchTenantUserQuery, normalizeTenantUserLookupQuery } from "@/lib/clients/userLookup";
import { cn } from "@/lib/utils";

export type TenantUserLookupItem = {
  id: string;
  name: string;
  email: string;
};

export default function TenantUserLookup({
  label,
  value,
  onChange,
  disabled,
  placeholder
}: {
  label?: string;
  value: TenantUserLookupItem | null;
  onChange: (item: TenantUserLookupItem | null) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<TenantUserLookupItem[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = (rawQuery: string) => {
    const q = normalizeTenantUserLookupQuery(rawQuery);
    if (!canSearchTenantUserQuery(q)) {
      setItems([]);
      setOpen(false);
      setError(null);
      return;
    }
    startTransition(async () => {
      try {
        const result = await actionSearchTenantUsers({ q, limit: 20 });
        setItems(result.items as TenantUserLookupItem[]);
        setOpen(true);
        setError(null);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo buscar usuarios.");
      }
    });
  };

  const search = () => {
    const q = normalizeTenantUserLookupQuery(query);
    runSearch(q);
  };

  useEffect(() => {
    const q = normalizeTenantUserLookupQuery(query);
    if (!canSearchTenantUserQuery(q)) {
      setItems([]);
      setOpen(false);
      setError(null);
      return;
    }
    const timeout = setTimeout(() => {
      runSearch(q);
    }, 320);
    return () => clearTimeout(timeout);
  }, [query]);

  const isDisabled = Boolean(disabled || isPending);
  const effectivePlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    if (value) return `${value.name} (${value.email})`;
    return "Buscar usuario por nombre o email";
  }, [placeholder, value]);

  return (
    <div className="relative space-y-1">
      {label ? <p className="text-xs font-semibold text-slate-500">{label}</p> : null}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={effectivePlaceholder}
            disabled={isDisabled}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
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
            "rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-[#4aadf5]/40 hover:text-[#2e75ba]",
            isDisabled && "cursor-not-allowed opacity-60"
          )}
        >
          Buscar
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={isDisabled}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700",
              isDisabled && "cursor-not-allowed opacity-60"
            )}
          >
            <Unlink2 size={12} />
            Desvincular
          </button>
        ) : null}
      </div>

      {open && items.length > 0 ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
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
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-[#F8FAFC]"
              >
                <span className="truncate font-semibold">{item.name}</span>
                <span className="ml-2 shrink-0 text-[11px] text-slate-500">{item.email}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
