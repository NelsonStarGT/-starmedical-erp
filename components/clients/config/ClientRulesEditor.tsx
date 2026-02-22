"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { actionUpdateClientRulesConfig } from "@/app/admin/clientes/actions";
import { cn } from "@/lib/utils";

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
  const [form, setForm] = useState(() => ({
    alertDays30: String(initialAlertDays30),
    alertDays15: String(initialAlertDays15),
    alertDays7: String(initialAlertDays7),
    healthProfileWeight: String(initialHealthProfileWeight),
    healthDocsWeight: String(initialHealthDocsWeight)
  }));

  const parsed = useMemo(() => {
    const a30 = Number(form.alertDays30);
    const a15 = Number(form.alertDays15);
    const a7 = Number(form.alertDays7);
    const profile = Number(form.healthProfileWeight);
    const docs = Number(form.healthDocsWeight);
    return {
      a30: Number.isFinite(a30) ? a30 : NaN,
      a15: Number.isFinite(a15) ? a15 : NaN,
      a7: Number.isFinite(a7) ? a7 : NaN,
      profile: Number.isFinite(profile) ? profile : NaN,
      docs: Number.isFinite(docs) ? docs : NaN
    };
  }, [form.alertDays30, form.alertDays15, form.alertDays7, form.healthProfileWeight, form.healthDocsWeight]);

  const canSave = useMemo(() => {
    return (
      !isPending &&
      parsed.a30 > 0 &&
      parsed.a15 > 0 &&
      parsed.a7 > 0 &&
      parsed.profile >= 5 &&
      parsed.profile <= 95 &&
      parsed.docs >= 5 &&
      parsed.docs <= 95
    );
  }, [isPending, parsed]);

  const save = () => {
    if (!canSave) return;
    startTransition(async () => {
      try {
        await actionUpdateClientRulesConfig({
          alertDays30: parsed.a30,
          alertDays15: parsed.a15,
          alertDays7: parsed.a7,
          healthProfileWeight: parsed.profile,
          healthDocsWeight: parsed.docs
        });
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo guardar las reglas.");
      }
    });
  };

  return (
    <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-diagnostics-corporate">Reglas</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          Alertas de vencimiento
        </h3>
        <p className="text-sm text-slate-600">Define ventanas (días) para marcar documentos “por vencer”.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Ventana 30 días</label>
          <input
            value={form.alertDays30}
            onChange={(e) => setForm((prev) => ({ ...prev, alertDays30: e.target.value }))}
            inputMode="numeric"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Ventana 15 días</label>
          <input
            value={form.alertDays15}
            onChange={(e) => setForm((prev) => ({ ...prev, alertDays15: e.target.value }))}
            inputMode="numeric"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Ventana 7 días</label>
          <input
            value={form.alertDays7}
            onChange={(e) => setForm((prev) => ({ ...prev, alertDays7: e.target.value }))}
            inputMode="numeric"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Peso perfil (%)</label>
          <input
            value={form.healthProfileWeight}
            onChange={(e) => setForm((prev) => ({ ...prev, healthProfileWeight: e.target.value }))}
            inputMode="numeric"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Peso documentos (%)</label>
          <input
            value={form.healthDocsWeight}
            onChange={(e) => setForm((prev) => ({ ...prev, healthDocsWeight: e.target.value }))}
            inputMode="numeric"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">Usa valores entre 5 y 95. Recomendado: Perfil 70 / Documentos 30.</p>

      <button
        type="button"
        onClick={save}
        disabled={!canSave}
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-diagnostics-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-diagnostics-primary/90",
          !canSave && "cursor-not-allowed opacity-60 hover:bg-diagnostics-primary"
        )}
      >
        <Save size={16} />
        Guardar reglas
      </button>

      {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
    </section>
  );
}
