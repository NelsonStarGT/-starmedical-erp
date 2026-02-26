"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfigDataTable, { type ConfigDataTableAction, type ConfigDataTableColumn } from "@/components/clients/config/ConfigDataTable";
import { actionUpdateClientRulesConfig } from "@/app/admin/clientes/actions";
import { cn } from "@/lib/utils";

type RuleRow = {
  id: "alertDays30" | "alertDays15" | "alertDays7" | "healthProfileWeight" | "healthDocsWeight";
  label: string;
  hint: string;
};

const rows: RuleRow[] = [
  { id: "alertDays30", label: "Alerta 30 días", hint: "Ventana de alerta temprana para vencimientos." },
  { id: "alertDays15", label: "Alerta 15 días", hint: "Ventana media para seguimiento de documentos." },
  { id: "alertDays7", label: "Alerta 7 días", hint: "Ventana crítica previa al vencimiento." },
  { id: "healthProfileWeight", label: "Peso perfil (%)", hint: "Aporte del perfil al health score." },
  { id: "healthDocsWeight", label: "Peso documentos (%)", hint: "Aporte documental al health score." }
];

export default function ClientRulesEditor({
  initialAlertDays30,
  initialAlertDays15,
  initialAlertDays7,
  initialHealthProfileWeight,
  initialHealthDocsWeight
}: {
  initialAlertDays30: number;
  initialAlertDays15: number;
  initialAlertDays7: number;
  initialHealthProfileWeight: number;
  initialHealthDocsWeight: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<RuleRow["id"] | null>(null);
  const [form, setForm] = useState(() => ({
    alertDays30: String(initialAlertDays30),
    alertDays15: String(initialAlertDays15),
    alertDays7: String(initialAlertDays7),
    healthProfileWeight: String(initialHealthProfileWeight),
    healthDocsWeight: String(initialHealthDocsWeight)
  }));

  const parsed = useMemo(() => {
    const alertDays30 = Number(form.alertDays30);
    const alertDays15 = Number(form.alertDays15);
    const alertDays7 = Number(form.alertDays7);
    const healthProfileWeight = Number(form.healthProfileWeight);
    const healthDocsWeight = Number(form.healthDocsWeight);

    return {
      alertDays30: Number.isFinite(alertDays30) ? alertDays30 : NaN,
      alertDays15: Number.isFinite(alertDays15) ? alertDays15 : NaN,
      alertDays7: Number.isFinite(alertDays7) ? alertDays7 : NaN,
      healthProfileWeight: Number.isFinite(healthProfileWeight) ? healthProfileWeight : NaN,
      healthDocsWeight: Number.isFinite(healthDocsWeight) ? healthDocsWeight : NaN
    };
  }, [form]);

  const canSave = useMemo(() => {
    return (
      !isPending &&
      parsed.alertDays30 > 0 &&
      parsed.alertDays15 > 0 &&
      parsed.alertDays7 > 0 &&
      parsed.healthProfileWeight >= 5 &&
      parsed.healthProfileWeight <= 95 &&
      parsed.healthDocsWeight >= 5 &&
      parsed.healthDocsWeight <= 95
    );
  }, [isPending, parsed]);

  const persistConfig = () => {
    if (!canSave) return;
    startTransition(async () => {
      try {
        await actionUpdateClientRulesConfig({
          alertDays30: parsed.alertDays30,
          alertDays15: parsed.alertDays15,
          alertDays7: parsed.alertDays7,
          healthProfileWeight: parsed.healthProfileWeight,
          healthDocsWeight: parsed.healthDocsWeight
        });
        setError(null);
        setEditingRuleId(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo guardar reglas.");
      }
    });
  };

  const columns: ConfigDataTableColumn<RuleRow>[] = [
    {
      id: "rule",
      header: "Regla",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.label}</p>
          <p className="text-xs text-slate-500">{row.hint}</p>
        </div>
      )
    },
    {
      id: "value",
      header: "Valor",
      render: (row) => {
        const value = form[row.id];
        const editing = editingRuleId === row.id;
        if (!editing) {
          return <span className="font-semibold text-slate-700">{value}</span>;
        }

        return (
          <input
            value={value}
            onChange={(event) => setForm((prev) => ({ ...prev, [row.id]: event.target.value }))}
            inputMode="numeric"
            className={cn(
              "h-9 w-28 rounded-lg border bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2",
              canSave
                ? "border-slate-200 focus:border-[#4aadf5] focus:ring-[#4aadf5]/20"
                : "border-rose-200 focus:border-rose-300 focus:ring-rose-200"
            )}
          />
        );
      }
    }
  ];

  const ruleActions = (row: RuleRow): ConfigDataTableAction<RuleRow>[] => {
    const editing = editingRuleId === row.id;
    return editing
      ? [
          { id: "save", label: "Guardar" },
          { id: "cancel", label: "Cancelar" }
        ]
      : [{ id: "edit", label: "Editar" }];
  };

  const onAction = (actionId: string, row: RuleRow) => {
    if (actionId === "edit") {
      setEditingRuleId(row.id);
      return;
    }
    if (actionId === "cancel") {
      setEditingRuleId(null);
      return;
    }
    if (actionId === "save") {
      persistConfig();
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Reglas</p>

      <ConfigDataTable
        title="Alertas de vencimiento"
        subtitle="Valores operativos de alertas y pesos del health score."
        columns={columns}
        rows={rows}
        actions={ruleActions}
        onAction={onAction}
        emptyState="Sin reglas configuradas."
      />

      <p className="text-xs text-slate-500">Rangos permitidos: alertas &gt; 0 y pesos entre 5 y 95.</p>
      {error ? <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
    </section>
  );
}
