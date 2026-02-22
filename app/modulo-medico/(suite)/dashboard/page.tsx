import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import KpiCard from "@/components/medical/dashboard/KpiCard";
import LineChart, { type LineChartPoint } from "@/components/medical/dashboard/LineChart";

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildAdminDashboardMock(): {
  dateKey: string;
  kpis: {
    patientsToday: number;
    waiting: number;
    triage: number;
    inConsult: number;
    done: number;
    avgWaitMin: number;
    alerts: number;
  };
  series: LineChartPoint[];
} {
  const dateKey = todayKey();

  // TODO(medical-admin-dashboard): cargar KPIs desde la fuente de verdad (Visit/QueueItem/Appointment) para la sede/área activa.
  // - counts por estado estándar: waiting/triage/in_consult/done
  // - avgWaitMin: promedio de espera para estados activos
  // - alerts: overdue (espera > umbral), triage incompleto, cuellos de botella
  const kpis = {
    patientsToday: 38,
    waiting: 8,
    triage: 5,
    inConsult: 6,
    done: 19,
    avgWaitMin: 14,
    alerts: 3
  };

  // TODO(medical-admin-dashboard): serie por hora desde agregados (visitas atendidas o espera promedio).
  const series: LineChartPoint[] = [
    { label: "08", value: 1 },
    { label: "09", value: 3 },
    { label: "10", value: 5 },
    { label: "11", value: 7 },
    { label: "12", value: 9 },
    { label: "13", value: 10 },
    { label: "14", value: 12 },
    { label: "15", value: 14 },
    { label: "16", value: 17 },
    { label: "17", value: 19 }
  ];

  return { dateKey, kpis, series };
}

export default function MedicalDashboardPage() {
  const snapshot = buildAdminDashboardMock();
  const { kpis } = snapshot;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-diagnostics-primary">
            Administrativo
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Dashboard de eficiencia</h2>
          <p className="mt-1 text-sm text-slate-600">Resumen operativo de hoy · {snapshot.dateKey}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={kpis.avgWaitMin <= 20 ? "success" : "warning"}>
            Espera promedio: {kpis.avgWaitMin} min
          </Badge>
          <Badge variant={kpis.alerts > 0 ? "warning" : "success"}>Alertas: {kpis.alerts}</Badge>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Pacientes hoy"
          value={kpis.patientsToday}
          hint="Total operado en el flujo (visitas/citas)."
          tone="info"
        />
        <KpiCard
          label="En espera"
          value={kpis.waiting}
          hint="Pendientes de triage o llamado."
          tone={kpis.waiting >= 10 ? "warn" : "neutral"}
        />
        <KpiCard
          label="En triage"
          value={kpis.triage}
          hint="Signos vitales / clasificación."
          tone={kpis.triage >= 8 ? "warn" : "neutral"}
        />
        <KpiCard
          label="En consulta"
          value={kpis.inConsult}
          hint="Atenciones activas en curso."
          tone="neutral"
        />
        <KpiCard
          label="Finalizados"
          value={kpis.done}
          hint="Consultas cerradas hoy."
          tone="good"
          className="md:col-span-2 xl:col-span-1"
        />
        <KpiCard
          label="Espera promedio"
          value={`${kpis.avgWaitMin} min`}
          hint="Meta: < 20 min."
          tone={kpis.avgWaitMin <= 20 ? "good" : "warn"}
          className="md:col-span-2 xl:col-span-1"
        />
        <KpiCard
          label="Alertas"
          value={kpis.alerts}
          hint="Retrasos / cuellos de botella."
          tone={kpis.alerts > 0 ? "danger" : "good"}
          className="md:col-span-2 xl:col-span-1"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LineChart
            id="medical-admin-throughput"
            title="Pacientes finalizados por hora"
            subtitle="Curva acumulada (mock)"
            points={snapshot.series}
          />
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Contexto operativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              La navegación de secciones se gestiona desde el sidebar del ERP.
            </div>
            <div className="rounded-xl border border-slate-200 bg-diagnostics-background p-4 text-xs text-slate-600">
              Regla: la clínica (Encounter) se opera en Modo Consulta y no se edita fuera del Encounter.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
