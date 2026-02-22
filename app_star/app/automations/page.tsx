"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

type Automation = {
  id: string;
  name: string;
  moduleKey: string;
  triggerType: string;
  isEnabled: boolean;
  createdAt: string;
};

const templates = [
  {
    moduleKey: "RRHH",
    color: "#4aa59c",
    items: [
      { name: "Notificar marcaje", trigger: "ATTENDANCE_MARK", description: "Correo inmediato al supervisor cuando se marque entrada/salida." },
      { name: "Reporte semanal de tardanzas", trigger: "WEEKLY_DIGEST", description: "Resumen de tardanzas todos los lunes." }
    ]
  },
  {
    moduleKey: "DIAGNOSTICO",
    color: "#4aadf5",
    items: [{ name: "Alerta de resultados listos", trigger: "LAB_RESULTS", description: "Aviso al paciente cuando sus resultados se liberen." }]
  },
  {
    moduleKey: "MARKETING",
    color: "#2e75ba",
    items: [{ name: "Seguimiento post-cita", trigger: "VISIT_FOLLOWUP", description: "Envía recordatorio y encuesta después de una visita." }]
  },
  {
    moduleKey: "FINANZAS",
    color: "#0f172a",
    items: [{ name: "Alertas de cobranza", trigger: "AR_OVERDUE", description: "Recordatorios automáticos de facturas vencidas." }]
  }
];

async function fetchAutomations(): Promise<Automation[]> {
  const res = await fetch("/api/automations");
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "No se pudieron cargar automatizaciones");
  return json.data || [];
}

async function createAutomation(payload: { name: string; moduleKey: string; triggerType: string }) {
  const res = await fetch("/api/automations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || json?.error || "No se pudo crear la automation");
  return json.data as Automation;
}

export default function AutomationsPage() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AutomationsContent />
    </QueryClientProvider>
  );
}

function AutomationsContent() {
  const queryClient = useQueryClient();
  const { toasts, showToast, dismiss } = useToast();
  const [selectedModule, setSelectedModule] = useState<string>("RRHH");

  const automationsQuery = useQuery({ queryKey: ["automations"], queryFn: fetchAutomations, staleTime: 10_000 });
  const createMutation = useMutation({
    mutationFn: createAutomation,
    onSuccess: () => {
      showToast("Automation creada como borrador", "success");
      void queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
    onError: (err: any) => showToast(err?.message || "No se pudo crear", "error")
  });

  const activeTemplates = templates.find((t) => t.moduleKey === selectedModule);

  return (
    <div className="space-y-5 bg-gradient-to-br from-white via-slate-50 to-sky-50 p-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft">
        <div className="flex flex-col gap-3 bg-gradient-to-r from-[#4aa59c] via-[#4aadf5] to-[#2e75ba] px-6 py-5 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-80">Automatizaciones</p>
            <h1 className="font-['Montserrat'] text-2xl font-semibold">Plantillas y borradores</h1>
            <p className="text-sm opacity-90">Crea flujos base por módulo. Configuración detallada llegará en la siguiente iteración.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {templates.map((tpl) => (
              <button
                key={tpl.moduleKey}
                onClick={() => setSelectedModule(tpl.moduleKey)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold shadow transition",
                  selectedModule === tpl.moduleKey ? "bg-white text-slate-900" : "bg-white/20 text-white ring-1 ring-white/40 hover:bg-white/30"
                )}
              >
                {tpl.moduleKey}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader>
            <CardTitle className="font-['Montserrat'] text-lg text-slate-800">Automatizaciones guardadas</CardTitle>
          </CardHeader>
          <CardContent>
            {automationsQuery.isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
            {!automationsQuery.isLoading && (automationsQuery.data || []).length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <p className="text-sm font-semibold text-slate-700">Sin automatizaciones todavía</p>
                <p className="text-xs text-slate-500">Crea un borrador desde las plantillas.</p>
              </div>
            )}
            {(automationsQuery.data || []).length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Nombre</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Módulo</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Trigger</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Estado</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Creado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(automationsQuery.data || []).map((auto) => (
                      <tr key={auto.id}>
                        <td className="px-3 py-2 font-semibold text-slate-800">{auto.name}</td>
                        <td className="px-3 py-2 text-slate-700">{auto.moduleKey}</td>
                        <td className="px-3 py-2 text-slate-700">{auto.triggerType}</td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                              auto.isEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {auto.isEnabled ? "Activo" : "Borrador"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">{format(new Date(auto.createdAt), "PPp")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="font-['Montserrat'] text-lg text-slate-800">Plantillas {selectedModule}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeTemplates?.items.map((item) => (
              <div key={item.name} className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-500">{item.description}</p>
                <button
                  onClick={() => createMutation.mutate({ name: item.name, moduleKey: selectedModule, triggerType: item.trigger })}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-soft transition hover:opacity-95"
                  style={{ backgroundColor: templates.find((t) => t.moduleKey === selectedModule)?.color || "#2e75ba" }}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creando..." : "Crear borrador"}
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
