"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfigDataTable, { type ConfigDataTableAction, type ConfigDataTableColumn } from "@/components/clients/config/ConfigDataTable";
import { actionUpdateClientsDateFormat } from "@/app/admin/clientes/actions";
import {
  CLIENTS_DATE_FORMAT_OPTIONS,
  getClientsDatePreview,
  normalizeClientsDateFormat,
  type ClientsDateFormat
} from "@/lib/clients/dateFormat";

type DateFormatRow = {
  id: "clientsDateFormat";
  preference: string;
};

const rows: DateFormatRow[] = [{ id: "clientsDateFormat", preference: "Formato de fecha" }];

export default function ClientDateFormatEditor({
  initialDateFormat
}: {
  initialDateFormat: ClientsDateFormat;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [savedFormat, setSavedFormat] = useState<ClientsDateFormat>(() => normalizeClientsDateFormat(initialDateFormat));
  const [selectedFormat, setSelectedFormat] = useState<ClientsDateFormat>(() => normalizeClientsDateFormat(initialDateFormat));

  const canSave = !isPending && selectedFormat !== savedFormat;
  const preview = useMemo(() => getClientsDatePreview(selectedFormat), [selectedFormat]);

  const columns: ConfigDataTableColumn<DateFormatRow>[] = [
    {
      id: "preference",
      header: "Preferencia",
      render: (row) => <span className="font-semibold text-slate-900">{row.preference}</span>
    },
    {
      id: "value",
      header: "Valor",
      render: () =>
        isEditing ? (
          <select
            value={selectedFormat}
            onChange={(event) => setSelectedFormat(normalizeClientsDateFormat(event.target.value))}
            className="h-9 min-w-[210px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
          >
            {CLIENTS_DATE_FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="font-semibold text-slate-700">
            {CLIENTS_DATE_FORMAT_OPTIONS.find((option) => option.value === selectedFormat)?.label ?? selectedFormat}
          </span>
        )
    },
    {
      id: "preview",
      header: "Vista previa",
      render: () => <span className="font-mono text-xs text-[#2e75ba]">{preview}</span>
    }
  ];

  const actions = (): ConfigDataTableAction<DateFormatRow>[] =>
    isEditing ? [{ id: "save", label: "Guardar", disabled: !canSave }, { id: "cancel", label: "Cancelar" }] : [{ id: "edit", label: "Cambiar" }];

  const onAction = (actionId: string) => {
    if (actionId === "edit") {
      setIsEditing(true);
      return;
    }
    if (actionId === "cancel") {
      setSelectedFormat(savedFormat);
      setIsEditing(false);
      return;
    }
    if (actionId === "save") {
      if (!canSave) return;
      startTransition(async () => {
        try {
          await actionUpdateClientsDateFormat({ clientsDateFormat: selectedFormat });
          setSavedFormat(selectedFormat);
          setIsEditing(false);
          setError(null);
          router.refresh();
        } catch (err) {
          setError((err as Error)?.message || "No se pudo guardar el formato de fecha.");
        }
      });
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Preferencias</p>

      <ConfigDataTable
        title="Formato de fecha (Clientes)"
        subtitle="Afecta formularios, listados y reportes del módulo."
        columns={columns}
        rows={rows}
        actions={actions}
        onAction={(actionId) => onAction(actionId)}
      />

      {error ? <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
    </section>
  );
}
