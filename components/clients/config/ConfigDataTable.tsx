"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "inactive";

export type ConfigDataTableColumn<Row> = {
  id: string;
  header: string;
  className?: string;
  render: (row: Row) => ReactNode;
};

export type ConfigDataTableAction<Row> = {
  id: string;
  label: string;
  disabled?: boolean;
  tone?: "default" | "danger";
};

type ActionMenuProps<Row> = {
  row: Row;
  actions: ConfigDataTableAction<Row>[];
  onAction: (actionId: string, row: Row) => void;
};

function ActionMenu<Row>({ row, actions, onAction }: ActionMenuProps<Row>) {
  const menuRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const onWindowClick = (event: MouseEvent) => {
      if (!menuRef.current?.open) return;
      if (menuRef.current.contains(event.target as Node)) return;
      menuRef.current.open = false;
    };
    window.addEventListener("click", onWindowClick);
    return () => window.removeEventListener("click", onWindowClick);
  }, []);

  return (
    <details ref={menuRef} className="relative">
      <summary
        aria-label="Abrir acciones"
        className="inline-flex cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
      >
        <MoreHorizontal size={16} />
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-md">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={action.disabled}
            onClick={() => {
              onAction(action.id, row);
              if (menuRef.current) menuRef.current.open = false;
            }}
            className={cn(
              "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium",
              action.tone === "danger" ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-[#f8fafc]",
              action.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
            )}
          >
            {action.label}
          </button>
        ))}
      </div>
    </details>
  );
}

export default function ConfigDataTable<Row extends Record<string, unknown>>({
  title,
  subtitle,
  columns,
  rows,
  onAction,
  emptyState,
  actions,
  enableSearch = false,
  searchPlaceholder = "Buscar...",
  enableStatusFilter = false,
  getRowStatus,
  getSearchText,
  getRowKey,
  headerActions,
  className
}: {
  title: string;
  subtitle?: string;
  columns: ConfigDataTableColumn<Row>[];
  rows: Row[];
  onAction: (actionId: string, row: Row) => void;
  emptyState?: ReactNode;
  actions?: ConfigDataTableAction<Row>[] | ((row: Row) => ConfigDataTableAction<Row>[]);
  enableSearch?: boolean;
  searchPlaceholder?: string;
  enableStatusFilter?: boolean;
  getRowStatus?: (row: Row) => boolean;
  getSearchText?: (row: Row) => string;
  getRowKey?: (row: Row, index: number) => string;
  headerActions?: ReactNode;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (enableSearch && normalized) {
        const source = getSearchText
          ? getSearchText(row)
          : Object.values(row)
              .map((value) => (typeof value === "string" ? value : ""))
              .join(" ");
        if (!source.toLowerCase().includes(normalized)) return false;
      }

      if (enableStatusFilter) {
        const status = getRowStatus ? getRowStatus(row) : Boolean((row as { isActive?: boolean }).isActive);
        if (statusFilter === "active" && !status) return false;
        if (statusFilter === "inactive" && status) return false;
      }

      return true;
    });
  }, [enableSearch, enableStatusFilter, getRowStatus, getSearchText, query, rows, statusFilter]);

  const hasActions = Boolean(actions);

  return (
    <section className={cn("rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
            {title}
          </h3>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {headerActions}
      </div>

      {(enableSearch || enableStatusFilter) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {enableSearch ? (
            <label className="relative w-full max-w-xs">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
              />
            </label>
          ) : null}

          {enableStatusFilter ? (
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          ) : null}
        </div>
      )}

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-[#f8fafc] text-[#2e75ba]">
            <tr>
              {columns.map((column) => (
                <th key={column.id} className={cn("px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em]", column.className)}>
                  {column.header}
                </th>
              ))}
              {hasActions ? (
                <th className="w-24 px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em]">Acciones</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => {
              const rowActions = typeof actions === "function" ? actions(row) : actions ?? [];
              return (
                <tr key={getRowKey ? getRowKey(row, index) : String((row as { id?: string }).id ?? index)} className={index % 2 ? "bg-slate-50/50" : "bg-white"}>
                  {columns.map((column) => (
                    <td key={column.id} className={cn("px-3 py-2 align-middle text-slate-700", column.className)}>
                      {column.render(row)}
                    </td>
                  ))}
                  {hasActions ? (
                    <td className="px-3 py-2 text-right">
                      <ActionMenu row={row} actions={rowActions} onAction={onAction} />
                    </td>
                  ) : null}
                </tr>
              );
            })}

            {!filteredRows.length && (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)} className="px-3 py-4 text-sm text-slate-500">
                  {emptyState ?? "Sin registros para los filtros actuales."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
