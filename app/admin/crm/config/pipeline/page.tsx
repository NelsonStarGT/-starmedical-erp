"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

type Pipeline = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  stages: any[];
  ruleSets: any[];
};

export default function PipelineConfigPage() {
  const { toasts, showToast, dismiss } = useToast();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPipeline, setNewPipeline] = useState({ name: "", type: "B2B" });
  const [stageForm, setStageForm] = useState({ pipelineId: "", key: "", name: "", order: 0 });
  const [ruleForm, setRuleForm] = useState({
    pipelineId: "",
    scope: "PIPELINE",
    name: "",
    type: "REQUIRED_FIELDS",
    message: "",
    stageKey: "",
    fromStageKey: "",
    toStageKey: "",
    params: "{}"
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/pipelines");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      setPipelines(json.data || []);
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar la configuración");
      showToast(err?.message || "No se pudo cargar la configuración", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const createPipeline = async () => {
    try {
      const res = await fetch("/api/crm/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPipeline)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      showToast("Pipeline creado", "success");
      setNewPipeline({ name: "", type: "B2B" });
      load();
    } catch (err: any) {
      showToast(err?.message || "Error creando pipeline", "error");
    }
  };

  const createStage = async () => {
    try {
      const res = await fetch("/api/crm/pipelines/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...stageForm, order: Number(stageForm.order) })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      showToast("Etapa creada", "success");
      setStageForm({ pipelineId: "", key: "", name: "", order: 0 });
      load();
    } catch (err: any) {
      showToast(err?.message || "Error creando etapa", "error");
    }
  };

  const createRule = async () => {
    try {
      const params = JSON.parse(ruleForm.params || "{}");
      const payload: any = { ...ruleForm, params };
      const res = await fetch("/api/crm/pipelines/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      showToast("Regla creada", "success");
      setRuleForm({
        pipelineId: "",
        scope: "PIPELINE",
        name: "",
        type: "REQUIRED_FIELDS",
        message: "",
        stageKey: "",
        fromStageKey: "",
        toStageKey: "",
        params: "{}"
      });
      load();
    } catch (err: any) {
      showToast(err?.message || "Error creando regla", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3rem] text-slate-400">CRM · Pipeline</p>
        <h1 className="text-2xl font-semibold text-slate-900">Reglas y etapas configurables</h1>
        <p className="text-sm text-slate-500">DB es la fuente de verdad; edita aquí pipelines, etapas y reglas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Nombre"
            value={newPipeline.name}
            onChange={(e) => setNewPipeline((p) => ({ ...p, name: e.target.value }))}
          />
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={newPipeline.type}
            onChange={(e) => setNewPipeline((p) => ({ ...p, type: e.target.value }))}
          >
            <option value="B2B">B2B</option>
            <option value="B2C">B2C</option>
          </select>
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm"
            onClick={createPipeline}
            disabled={loading}
          >
            Crear
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nueva etapa</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={stageForm.pipelineId}
            onChange={(e) => setStageForm((s) => ({ ...s, pipelineId: e.target.value }))}
          >
            <option value="">Pipeline...</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.type})
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Clave (ej: NUEVO)"
            value={stageForm.key}
            onChange={(e) => setStageForm((s) => ({ ...s, key: e.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Nombre"
            value={stageForm.name}
            onChange={(e) => setStageForm((s) => ({ ...s, name: e.target.value }))}
          />
          <input
            type="number"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Orden"
            value={stageForm.order}
            onChange={(e) => setStageForm((s) => ({ ...s, order: Number(e.target.value) }))}
          />
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm"
            onClick={createStage}
            disabled={loading}
          >
            Guardar etapa
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nueva regla</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 md:grid-cols-3">
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={ruleForm.pipelineId}
              onChange={(e) => setRuleForm((r) => ({ ...r, pipelineId: e.target.value }))}
            >
              <option value="">Pipeline...</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={ruleForm.scope}
              onChange={(e) => setRuleForm((r) => ({ ...r, scope: e.target.value }))}
            >
              <option value="PIPELINE">PIPELINE</option>
              <option value="STAGE">STAGE</option>
              <option value="TRANSITION">TRANSITION</option>
            </select>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Nombre"
              value={ruleForm.name}
              onChange={(e) => setRuleForm((r) => ({ ...r, name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="stageKey"
              value={ruleForm.stageKey}
              onChange={(e) => setRuleForm((r) => ({ ...r, stageKey: e.target.value }))}
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="fromStageKey"
              value={ruleForm.fromStageKey}
              onChange={(e) => setRuleForm((r) => ({ ...r, fromStageKey: e.target.value }))}
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="toStageKey"
              value={ruleForm.toStageKey}
              onChange={(e) => setRuleForm((r) => ({ ...r, toStageKey: e.target.value }))}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={ruleForm.type}
              onChange={(e) => setRuleForm((r) => ({ ...r, type: e.target.value }))}
            >
              <option value="REQUIRED_FIELDS">REQUIRED_FIELDS</option>
              <option value="REQUIRED_NEXT_ACTION">REQUIRED_NEXT_ACTION</option>
              <option value="REQUIRE_QUOTE_STATUS">REQUIRE_QUOTE_STATUS</option>
              <option value="DISALLOW_STAGE_FOR_PIPELINE">DISALLOW_STAGE_FOR_PIPELINE</option>
              <option value="REQUIRE_CONTRACT_OR_COLLECTION_PLAN">REQUIRE_CONTRACT_OR_COLLECTION_PLAN</option>
              <option value="REQUIRE_REASON_ON_LOST">REQUIRE_REASON_ON_LOST</option>
              <option value="AMOUNT_APPROVAL_THRESHOLD">AMOUNT_APPROVAL_THRESHOLD</option>
            </select>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Mensaje"
              value={ruleForm.message}
              onChange={(e) => setRuleForm((r) => ({ ...r, message: e.target.value }))}
            />
            <textarea
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder='Params JSON (ej {"fields":["deal.nextActionAt"]})'
              value={ruleForm.params}
              onChange={(e) => setRuleForm((r) => ({ ...r, params: e.target.value }))}
            />
          </div>
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm"
            onClick={createRule}
            disabled={loading}
          >
            Crear regla
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipelines configurados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-sm text-slate-500">Cargando...</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {pipelines.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {p.name} · {p.type} {p.isActive ? "" : "(inactivo)"}
                  </p>
                  <p className="text-[11px] text-slate-500">Etapas: {p.stages?.length || 0} · Reglas: {p.ruleSets?.length || 0}</p>
                </div>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                  <p className="font-semibold">Etapas</p>
                  <ul className="mt-1 space-y-1">
                    {p.stages?.map((s: any) => (
                      <li key={s.id} className="flex items-center justify-between border-b border-slate-100 pb-1">
                        <span>
                          {s.order}. {s.key} · {s.name} {s.isTerminal ? "(terminal)" : ""}
                        </span>
                        <span className="text-slate-500">SLA {s.slaDays}d · Prob {s.probability}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                  <p className="font-semibold">Reglas</p>
                  <ul className="mt-1 space-y-1">
                    {p.ruleSets?.map((rs: any) => (
                      <li key={rs.id} className="border-b border-slate-100 pb-1">
                        <div className="font-semibold">
                          {rs.scope} · {rs.name} {rs.stageKey ? `· stage ${rs.stageKey}` : ""}{" "}
                          {rs.fromStageKey && rs.toStageKey ? `· ${rs.fromStageKey}→${rs.toStageKey}` : ""}
                        </div>
                        <ul className="ml-3 mt-1 space-y-1">
                          {rs.rules?.map((r: any) => (
                            <li key={r.id}>
                              {r.type} ({r.severity}) - {r.message}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
