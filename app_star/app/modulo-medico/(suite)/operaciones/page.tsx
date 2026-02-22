import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import RoleGuard from "@/components/medical/RoleGuard";

export default function MedicalOperacionesPage() {
  return (
    <RoleGuard allowRoles={["ADMIN", "SUPER_ADMIN", "SUPERVISOR"]}>
      <div className="space-y-4">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Centro operativo (coordinación)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-diagnostics-background p-4">
              Aquí se coordina flujo/agenda/recursos. No se editan diagnósticos ni notas clínicas finales.
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                { label: "En espera", value: "8" },
                { label: "En triage", value: "5" },
                { label: "En consulta", value: "6" }
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{kpi.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{kpi.value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
              Navegación del módulo centralizada en el sidebar principal del ERP.
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
