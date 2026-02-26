"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClientProfileType } from "@prisma/client";
import { PlusCircle } from "lucide-react";
import { actionCreateRequiredDocumentRule, actionUpdateRequiredDocumentRule } from "@/app/admin/clientes/actions";
import ConfigDataTable, { type ConfigDataTableAction, type ConfigDataTableColumn } from "@/components/clients/config/ConfigDataTable";
import { Modal } from "@/components/ui/Modal";
import { CLIENT_TYPE_LABELS } from "@/lib/clients/constants";
import { cn } from "@/lib/utils";

type RequiredRule = {
  id: string;
  clientType: ClientProfileType;
  documentTypeId: string;
  documentTypeName: string;
  isRequired: boolean;
  requiresApproval: boolean;
  requiresExpiry: boolean;
  weight: number;
  isActive: boolean;
};

type DocumentTypeOption = {
  id: string;
  name: string;
  isActive: boolean;
};

type RuleDraft = {
  isRequired: boolean;
  requiresApproval: boolean;
  requiresExpiry: boolean;
  weight: string;
  isActive: boolean;
};

type CreateRuleForm = {
  clientType: ClientProfileType;
  documentTypeId: string;
  isRequired: boolean;
  requiresApproval: boolean;
  requiresExpiry: boolean;
  weight: string;
  isActive: boolean;
};

const CLIENT_TYPE_ORDER: ClientProfileType[] = [
  ClientProfileType.PERSON,
  ClientProfileType.COMPANY,
  ClientProfileType.INSTITUTION,
  ClientProfileType.INSURER
];

function normalizeDraftWeight(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(10, Math.max(1, Math.floor(parsed)));
}

function initialRuleDraft(rule: RequiredRule): RuleDraft {
  return {
    isRequired: rule.isRequired,
    requiresApproval: rule.requiresApproval,
    requiresExpiry: rule.requiresExpiry,
    weight: String(rule.weight),
    isActive: rule.isActive
  };
}

export default function ClientRequiredDocumentsRulesEditor({
  rules,
  documentTypeOptions
}: {
  rules: RequiredRule[];
  documentTypeOptions: DocumentTypeOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newRuleOpen, setNewRuleOpen] = useState(false);

  const [createForm, setCreateForm] = useState<CreateRuleForm>(() => ({
    clientType: ClientProfileType.PERSON,
    documentTypeId: documentTypeOptions[0]?.id ?? "",
    isRequired: true,
    requiresApproval: true,
    requiresExpiry: false,
    weight: "5",
    isActive: true
  }));

  const [drafts, setDrafts] = useState<Record<string, RuleDraft>>(() => {
    return Object.fromEntries(rules.map((rule) => [rule.id, initialRuleDraft(rule)]));
  });

  const sortedRules = useMemo(() => {
    const order = new Map(CLIENT_TYPE_ORDER.map((type, index) => [type, index]));
    return [...rules].sort((a, b) => {
      const aOrder = order.get(a.clientType) ?? 999;
      const bOrder = order.get(b.clientType) ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.documentTypeName.localeCompare(b.documentTypeName);
    });
  }, [rules]);

  const columns: ConfigDataTableColumn<RequiredRule>[] = [
    {
      id: "clientType",
      header: "Tipo cliente",
      render: (row) => <span className="font-semibold text-slate-900">{CLIENT_TYPE_LABELS[row.clientType]}</span>
    },
    {
      id: "document",
      header: "Documento",
      render: (row) => <span className="text-slate-700">{row.documentTypeName}</span>
    },
    {
      id: "weight",
      header: "Peso",
      render: (row) => {
        const draft = drafts[row.id] ?? initialRuleDraft(row);
        return (
          <input
            type="number"
            min={1}
            max={10}
            value={draft.weight}
            onChange={(event) => updateDraft(row.id, { weight: event.target.value })}
            className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
          />
        );
      }
    },
    {
      id: "required",
      header: "Requerido",
      render: (row) => {
        const draft = drafts[row.id] ?? initialRuleDraft(row);
        return (
          <input
            type="checkbox"
            checked={draft.isRequired}
            onChange={(event) => updateDraft(row.id, { isRequired: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aadf5]"
          />
        );
      }
    },
    {
      id: "approval",
      header: "Aprobación",
      render: (row) => {
        const draft = drafts[row.id] ?? initialRuleDraft(row);
        return (
          <input
            type="checkbox"
            checked={draft.requiresApproval}
            onChange={(event) => updateDraft(row.id, { requiresApproval: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aadf5]"
          />
        );
      }
    },
    {
      id: "expiry",
      header: "Vencimiento",
      render: (row) => {
        const draft = drafts[row.id] ?? initialRuleDraft(row);
        return (
          <input
            type="checkbox"
            checked={draft.requiresExpiry}
            onChange={(event) => updateDraft(row.id, { requiresExpiry: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aadf5]"
          />
        );
      }
    },
    {
      id: "status",
      header: "Estado",
      render: (row) => {
        const draft = drafts[row.id] ?? initialRuleDraft(row);
        return (
          <span
            className={cn(
              "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              draft.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"
            )}
          >
            {draft.isActive ? "Activa" : "Inactiva"}
          </span>
        );
      }
    }
  ];

  const canCreate = Boolean(createForm.documentTypeId) && !isPending;

  function updateDraft(id: string, patch: Partial<RuleDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {
          isRequired: true,
          requiresApproval: true,
          requiresExpiry: false,
          weight: "5",
          isActive: true
        }),
        ...patch
      }
    }));
  }

  function saveRule(rule: RequiredRule, patch?: Partial<RuleDraft>) {
    const merged: RuleDraft = {
      ...(drafts[rule.id] ?? initialRuleDraft(rule)),
      ...(patch ?? {})
    };

    setDrafts((prev) => ({ ...prev, [rule.id]: merged }));

    startTransition(async () => {
      try {
        await actionUpdateRequiredDocumentRule({
          id: rule.id,
          isRequired: merged.isRequired,
          requiresApproval: merged.requiresApproval,
          requiresExpiry: merged.requiresExpiry,
          weight: normalizeDraftWeight(merged.weight),
          isActive: merged.isActive
        });
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo guardar la regla.");
      }
    });
  }

  function createRule() {
    if (!canCreate) return;
    startTransition(async () => {
      try {
        await actionCreateRequiredDocumentRule({
          clientType: createForm.clientType,
          documentTypeId: createForm.documentTypeId,
          isRequired: createForm.isRequired,
          requiresApproval: createForm.requiresApproval,
          requiresExpiry: createForm.requiresExpiry,
          weight: normalizeDraftWeight(createForm.weight),
          isActive: createForm.isActive
        });
        setError(null);
        setNewRuleOpen(false);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo crear la regla.");
      }
    });
  }

  const rowActions = (row: RequiredRule): ConfigDataTableAction<RequiredRule>[] => {
    const draft = drafts[row.id] ?? initialRuleDraft(row);
    return [
      { id: "save", label: "Guardar" },
      { id: "toggle", label: draft.isActive ? "Desactivar" : "Activar" },
      { id: "delete", label: "Eliminar (desactivar)", tone: "danger", disabled: !draft.isActive }
    ];
  };

  const onAction = (actionId: string, row: RequiredRule) => {
    if (actionId === "save") {
      saveRule(row);
      return;
    }

    if (actionId === "toggle") {
      const draft = drafts[row.id] ?? initialRuleDraft(row);
      saveRule(row, { isActive: !draft.isActive });
      return;
    }

    if (actionId === "delete") {
      saveRule(row, { isActive: false });
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Reglas</p>

      <ConfigDataTable
        title="Documentos requeridos"
        subtitle="Matriz de cumplimiento por tipo de cliente y documento."
        columns={columns}
        rows={sortedRules}
        actions={rowActions}
        onAction={onAction}
        enableSearch
        enableStatusFilter
        searchPlaceholder="Buscar regla..."
        getSearchText={(row) => `${CLIENT_TYPE_LABELS[row.clientType]} ${row.documentTypeName}`}
        emptyState="Sin reglas configuradas."
        headerActions={
          <button
            type="button"
            onClick={() => setNewRuleOpen(true)}
            className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#4aa59c] px-3 text-sm font-semibold text-white hover:bg-[#4aadf5]"
          >
            <PlusCircle size={14} />
            Nueva regla
          </button>
        }
      />

      <Modal
        open={newRuleOpen}
        onClose={() => setNewRuleOpen(false)}
        title="Nueva regla de documento"
        subtitle="Reglas"
        className="max-w-3xl"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Tipo cliente</label>
            <select
              value={createForm.clientType}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, clientType: event.target.value as ClientProfileType }))}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
            >
              {CLIENT_TYPE_ORDER.map((type) => (
                <option key={type} value={type}>
                  {CLIENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Documento</label>
            <select
              value={createForm.documentTypeId}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, documentTypeId: event.target.value }))}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
            >
              <option value="">Selecciona documento</option>
              {documentTypeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                  {!option.isActive ? " (Inactivo)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Peso</label>
            <input
              type="number"
              min={1}
              max={10}
              value={createForm.weight}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, weight: event.target.value }))}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-6 text-sm">
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700">
              <input
                type="checkbox"
                checked={createForm.isRequired}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, isRequired: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aadf5]"
              />
              Requerido
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700">
              <input
                type="checkbox"
                checked={createForm.requiresApproval}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, requiresApproval: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aadf5]"
              />
              Aprobación
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700">
              <input
                type="checkbox"
                checked={createForm.requiresExpiry}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, requiresExpiry: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aadf5]"
              />
              Vencimiento
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700">
              <input
                type="checkbox"
                checked={createForm.isActive}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aadf5]"
              />
              Activa
            </label>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={createRule}
            disabled={!canCreate}
            className={cn(
              "inline-flex h-9 items-center gap-1 rounded-lg bg-[#4aa59c] px-3 text-sm font-semibold text-white hover:bg-[#4aadf5]",
              !canCreate && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
            )}
          >
            <PlusCircle size={14} />
            Crear regla
          </button>
        </div>
      </Modal>

      {error ? <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
    </section>
  );
}
