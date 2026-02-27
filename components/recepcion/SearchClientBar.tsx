"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserRound } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { actionSearchRecepcionClients } from "@/app/admin/recepcion/actions";
import { cn } from "@/lib/utils";

export type SearchClientBarItem = {
  id: string;
  typeLabel: string;
  displayName: string;
  clientCode: string | null;
  documentRef: string | null;
  phone: string | null;
  email: string | null;
  href: string;
};

export default function SearchClientBar({
  className,
  title = "Buscar cliente",
  description = "Busca por correlativo, nombre, NIT/DPI, teléfono o email.",
  placeholder = "Ej. A-1002, Ana Pérez, 548811, mail@dominio.com",
  navigateOnSelect = true,
  onSelect
}: {
  className?: string;
  title?: string;
  description?: string;
  placeholder?: string;
  navigateOnSelect?: boolean;
  onSelect?: (item: SearchClientBarItem) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchClientBarItem[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSearch = query.trim().length >= 2;

  const helperText = useMemo(() => {
    if (!canSearch) return "Escribe al menos 2 caracteres para buscar.";
    if (isPending) return "Buscando...";
    if (!open) return "Presiona Enter o Buscar para ejecutar.";
    if (items.length === 0) return "Sin resultados con los filtros actuales.";
    return `${items.length} resultado(s) encontrado(s).`;
  }, [canSearch, isPending, items.length, open]);

  const runSearch = () => {
    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
      setOpen(false);
      setError(null);
      return;
    }

    startTransition(async () => {
      try {
        const result = await actionSearchRecepcionClients({ q, limit: 12 });
        setItems((result.items || []) as SearchClientBarItem[]);
        setOpen(true);
        setError(null);
      } catch (err) {
        setItems([]);
        setOpen(true);
        setError((err as Error)?.message || "No se pudo buscar clientes.");
      }
    });
  };

  const handleSelect = (item: SearchClientBarItem) => {
    onSelect?.(item);
    if (navigateOnSelect) {
      router.push(item.href);
      return;
    }

    setQuery(item.displayName);
    setOpen(false);
  };

  return (
    <section className={cn("rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm", className)}>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Recepción</p>
        <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: '"Montserrat", "Poppins", var(--font-heading)' }}>
          {title}
        </h2>
        <p className="text-sm text-slate-600">{description}</p>
      </div>

      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (open) setOpen(false);
            }}
            placeholder={placeholder}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                runSearch();
              }
            }}
            className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
          />
        </div>
        <button
          type="button"
          onClick={runSearch}
          disabled={!canSearch || isPending}
          className={cn(
            "h-11 rounded-xl bg-[#4aa59c] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f988f]",
            (!canSearch || isPending) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
          )}
        >
          {isPending ? "Buscando..." : "Buscar"}
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-500">{helperText}</p>
      {error ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}

      {open ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {items.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-500">No encontramos coincidencias. Intenta con otro dato.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="flex w-full flex-col items-start gap-1 px-3 py-3 text-left transition hover:bg-[#F8FAFC]"
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <UserRound size={14} className="text-[#2e75ba]" />
                      {item.displayName}
                    </span>
                    <span className="text-xs text-slate-600">
                      {item.typeLabel}
                      {item.clientCode ? ` · ${item.clientCode}` : ""}
                      {item.documentRef ? ` · ${item.documentRef}` : ""}
                    </span>
                    <span className="text-xs text-slate-500">
                      {[item.phone, item.email].filter(Boolean).join(" · ") || "Sin contacto principal"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-600">
            ¿No existe el cliente? {" "}
            <Link href="/admin/clientes/personas/nuevo" className="font-semibold text-[#2e75ba] hover:text-[#4aadf5]">
              Crear persona
            </Link>
            {" · "}
            <Link href="/admin/clientes/empresas/nuevo" className="font-semibold text-[#2e75ba] hover:text-[#4aadf5]">
              Crear empresa
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
