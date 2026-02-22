"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  CRM_LOST_REASONS,
  CRM_COMMUNICATION_OPTIONS,
  CRM_SLA_HOURS,
  CRM_STAGE_LABELS,
  CRM_STAGE_ORDER
} from "@/lib/crmConfig";

export default function CrmSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3rem] text-slate-400">CRM - Configuracion</p>
        <h1 className="text-2xl font-semibold text-slate-900">Panel de configuracion</h1>
        <p className="text-sm text-slate-500">Valores centrales de SLA, etapas y motivos.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SLA por etapa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            {CRM_STAGE_ORDER.map((stage) => (
              <div key={stage} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <span className="font-semibold text-slate-700">{CRM_STAGE_LABELS[stage]}</span>
                <span>{CRM_SLA_HOURS[stage]}h</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Motivos de perdida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            {CRM_LOST_REASONS.map((reason) => (
              <div key={reason} className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700">
                {reason}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de proxima accion</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm text-slate-600">
          {CRM_COMMUNICATION_OPTIONS.map((type) => (
            <span key={type.value} className="rounded-full border border-slate-200 px-3 py-2 text-slate-700">
              {type.label}
            </span>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
