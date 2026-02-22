"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClientProfileType } from "@prisma/client";
import { PlusCircle, Save, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";
import { actionCreateRequiredDocumentRule, actionUpdateRequiredDocumentRule } from "@/app/admin/clientes/actions";
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
    const entries = rules.map((rule) => [
      rule.id,
      {
        isRequired: rule.isRequired,
        requiresApproval: rule.requiresApproval,
        requiresExpiry: rule.requiresExpiry,
        weight: String(rule.weight),
        isActive: rule.isActive
      } satisfies RuleDraft
    ] as const);

    return Object.fromEntries(entries);
  });

  const grouped = useMemo(() => {
    return CLIENT_TYPE_ORDER.map((type) => ({
      type,
      label: CLIENT_TYPE_LABELS[type],
      rules: rules.filter((rule) => rule.clientType === type).sort((a, b) => a.documentTypeName.localeCompare(b.documentTypeName))
    }));
  }, [rules]);

  const canCreate = Boolean(createForm.documentTypeId) && !isPending;

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
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo crear la regla.");
      }
    });
  }

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

  function saveRule(rule: RequiredRule) {
    const draft = drafts[rule.id];
    if (!draft) return;

    startTransition(async () => {
      try {
        await actionUpdateRequiredDocumentRule({
          id: rule.id,
          isRequired: draft.isRequired,
          requiresApproval: draft.requiresApproval,
          requiresExpiry: draft.requiresExpiry,
          weight: normalizeDraftWeight(draft.weight),
          isActive: draft.isActive
        });
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo guardar la regla.");
      }
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-diagnostics-corporate">Reglas</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          Documentos requeridos
        </h3>
        <p className="text-sm text-slate-600">
          Define qué documentos son obligatorios por tipo de cliente, si requieren aprobación/vencimiento y su peso en health score.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-diagnostics-background p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-900">Crear regla</p>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          <select
            value={createForm.clientType}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, clientType: e.target.value as ClientProfileType }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {CLIENT_TYPE_ORDER.map((type) => (
              <option key={type} value={type}>
                {CLIENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>

          <select
            value={createForm.documentTypeId}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, documentTypeId: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <option value="">Tipo de documento...</option>
            {documentTypeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
                {!option.isActive ? " (Inactivo)" : ""}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={1}
            max={10}
            value={createForm.weight}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, weight: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            placeholder="Peso 1-10"
          />
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={createForm.isRequired}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, isRequired: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-[#4aa59c]"
            />
            Requerido
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={createForm.requiresApproval}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, requiresApproval: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-[#4aa59c]"
            />
            Requiere aprobación
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={createForm.requiresExpiry}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, requiresExpiry: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-[#4aa59c]"
            />
            Requiere vencimiento
          </label>
          <button
            type="button"
            onClick={() => setCreateForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold",
              createForm.isActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-100 text-slate-600"
            )}
          >
            {createForm.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            {createForm.isActive ? "Activa" : "Inactiva"}
          </button>
        </div>

        <button
          type="button"
          onClick={createRule}
          disabled={!canCreate}
          className={cn(
            "inline-flex items-center gap-2 rounded-full bg-diagnostics-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-diagnostics-primary/90",
            !canCreate && "cursor-not-allowed opacity-60"
          )}
        >
          <PlusCircle size={16} />
          Crear regla
        </button>
      </div>

      <div className="space-y-4">
        {grouped.map((group) => (
          <div key={group.type} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{group.label}</p>

            {!group.rules.length && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Sin reglas configuradas.</div>
            )}

            {group.rules.map((rule) => {
              const draft = drafts[rule.id] ?? {
                isRequired: rule.isRequired,
                requiresApproval: rule.requiresApproval,
                requiresExpiry: rule.requiresExpiry,
                weight: String(rule.weight),
                isActive: rule.isActive
              };

              const changed =
                draft.isRequired !== rule.isRequired ||
                draft.requiresApproval !== rule.requiresApproval ||
                draft.requiresExpiry !== rule.requiresExpiry ||
                normalizeDraftWeight(draft.weight) !== rule.weight ||
                draft.isActive !== rule.isActive;

              return (
                <article key={rule.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{rule.documentTypeName}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                        <ShieldCheck size={12} />
                        Peso {normalizeDraftWeight(draft.weight)} / 10
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={draft.isRequired}
                          onChange={(e) => updateDraft(rule.id, { isRequired: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-[#4aa59c]"
                        />
                        Requerido
                      </label>
                      <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={draft.requiresApproval}
                          onChange={(e) => updateDraft(rule.id, { requiresApproval: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-[#4aa59c]"
                        />
                        Aprobación
                      </label>
                      <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={draft.requiresExpiry}
                          onChange={(e) => updateDraft(rule.id, { requiresExpiry: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-[#4aa59c]"
                        />
                        Vencimiento
                      </label>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={draft.weight}
                      onChange={(e) => updateDraft(rule.id, { weight: e.target.value })}
                      className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                    />

                    <button
                      type="button"
                      onClick={() => updateDraft(rule.id, { isActive: !draft.isActive })}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold",
                        draft.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      )}
                    >
                      {draft.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      {draft.isActive ? "Activa" : "Inactiva"}
                    </button>

                    <button
                      type="button"
                      onClick={() => saveRule(rule)}
                      disabled={!changed || isPending}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full bg-[#2e75ba] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#275f96]",
                        (!changed || isPending) && "cursor-not-allowed opacity-60"
                      )}
                    >
                      <Save size={15} />
                      Guardar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ))}
      </div>

      {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
    </section>
  );
}
