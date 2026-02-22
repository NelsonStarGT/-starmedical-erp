import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import RoleGuard from "@/components/medical/RoleGuard";
import { cn } from "@/lib/utils";
import { medicosMock } from "@/lib/mock/medicos";

type ExamType = "LAB" | "RX" | "USG";
type CommissionStatus = "pending" | "paid";

type CommissionRow = {
  id: string;
  date: string;
  time: string;
  patientName: string;
  examName: string;
  type: ExamType;
  commissionRate: number;
  commissionAmount: number;
  doctor: { id: string; name: string };
  status: CommissionStatus;
};

function monthKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function pad2(v: number) {
  return String(v).padStart(2, "0");
}

function addMinutes(hhmm: string, minutes: number) {
  const [hh, mm] = hhmm.split(":").map((n) => parseInt(n, 10));
  const base = new Date(2000, 0, 1, hh, mm, 0, 0);
  const next = new Date(base.getTime() + minutes * 60000);
  return `${pad2(next.getHours())}:${pad2(next.getMinutes())}`;
}

function formatGTQ(value: number) {
  return `Q ${value.toFixed(2)}`;
}

function buildCommissionsMock(params: { month: string }) {
  const doctors = medicosMock.map((m) => ({ id: m.id, name: m.nombre }));

  const patients = [
    "Ana Torres",
    "Carlos Pérez",
    "Lucía Gómez",
    "Eduardo Ruiz",
    "María López",
    "Jorge Castillo",
    "Paola Hernández",
    "Kevin Morales"
  ];

  const exams: Array<{ name: string; type: ExamType; price: number; rate: number }> = [
    { name: "Hemograma completo", type: "LAB", price: 120, rate: 0.12 },
    { name: "Perfil lipídico", type: "LAB", price: 160, rate: 0.12 },
    { name: "Glucosa en ayunas", type: "LAB", price: 70, rate: 0.1 },
    { name: "Rayos X tórax", type: "RX", price: 220, rate: 0.15 },
    { name: "Rayos X columna", type: "RX", price: 260, rate: 0.15 },
    { name: "Ultrasonido abdominal", type: "USG", price: 320, rate: 0.18 },
    { name: "Ultrasonido pélvico", type: "USG", price: 300, rate: 0.18 }
  ];

  const baseDate = `${params.month}-05`;
  const baseTime = "08:10";

  // TODO(medical-comisiones): cargar comisiones desde facturación + órdenes diagnosticadas (sin exponer valores clínicos).
  // - fuente recomendada: Sales/InvoiceLineItem + DiagnosticOrder (solo metadata del examen)
  // - reglas: tasa por doctor/servicio/sede/aseguradora; estados: pending/paid
  const rows: CommissionRow[] = Array.from({ length: 18 }).map((_, i) => {
    const exam = exams[i % exams.length]!;
    const doctor = doctors[i % doctors.length]!;
    const saleAmount = exam.price + (i % 3) * 10;
    const commissionRate = exam.rate;
    const commissionAmount = saleAmount * commissionRate;
    const status: CommissionStatus = i % 5 === 0 ? "paid" : "pending";

    return {
      id: `comm-${params.month}-${i + 1}`,
      date: baseDate,
      time: addMinutes(baseTime, i * 22),
      patientName: patients[i % patients.length]!,
      examName: exam.name,
      type: exam.type,
      commissionRate,
      commissionAmount,
      doctor,
      status
    };
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.exams += 1;
      acc.commissions += row.commissionAmount;
      if (row.status === "paid") {
        acc.paid += row.commissionAmount;
        acc.paidCount += 1;
      } else {
        acc.pending += row.commissionAmount;
        acc.pendingCount += 1;
      }
      return acc;
    },
    { exams: 0, commissions: 0, paid: 0, pending: 0, paidCount: 0, pendingCount: 0 }
  );

  return { rows, totals };
}

function statusPillClasses(status: CommissionStatus) {
  if (status === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function typePillClasses(type: ExamType) {
  switch (type) {
    case "LAB":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "RX":
      return "border-indigo-200 bg-indigo-50 text-indigo-900";
    case "USG":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }
}

export default function MedicalComisionesPage() {
  const month = monthKey();
  const snapshot = buildCommissionsMock({ month });

  return (
    <RoleGuard allowRoles={["SUPER_ADMIN", "ADMIN"]} redirectTo="/modulo-medico/dashboard">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-diagnostics-primary">
              Administrativo
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Comisiones por referencias</h2>
            <p className="mt-1 text-sm text-slate-600">Resumen mensual · {month}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-diagnostics-background px-4 py-3 text-sm text-slate-700 shadow-soft">
            Acceso restringido (roles habilitados).
          </div>
        </div>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Comisiones ganadas",
              value: formatGTQ(snapshot.totals.commissions),
              meta: `Pagadas: ${formatGTQ(snapshot.totals.paid)}`
            },
            {
              label: "Referencias",
              value: snapshot.totals.exams,
              meta: `${snapshot.totals.paidCount} pagadas · ${snapshot.totals.pendingCount} pendientes`
            },
            { label: "Pendientes", value: formatGTQ(snapshot.totals.pending), meta: "Por liquidar" },
            { label: "Estado de pago", value: `${snapshot.totals.paidCount}/${snapshot.totals.exams}`, meta: "Pagadas / Total" },
            {
              label: "Comisión promedio",
              value: formatGTQ(snapshot.totals.exams ? snapshot.totals.commissions / snapshot.totals.exams : 0),
              meta: "Por referencia"
            }
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{kpi.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{kpi.value}</div>
              <div className="mt-2 text-xs text-slate-600">{kpi.meta}</div>
            </div>
          ))}
        </section>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm text-slate-700">Detalle por referencia</CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Mock · conectar a liquidación de comisiones en la siguiente iteración.
              </p>
            </div>
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{snapshot.rows.length}</span> registros
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-hidden rounded-b-2xl">
              <table className="w-full text-sm">
                <thead className="bg-[#2e75ba] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Paciente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Examen</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Tipo</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Comisión</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Médico</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {snapshot.rows.map((row, idx) => (
                    <tr key={row.id} className={cn(idx % 2 === 1 ? "bg-[#f8fafc]" : "bg-white")}>
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-slate-900">{row.date}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.time}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-slate-900">{row.patientName}</div>
                        <div className="mt-1 text-xs text-slate-500">—</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="min-w-[220px] font-semibold text-slate-900">{row.examName}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Tasa: {(row.commissionRate * 100).toFixed(0)}%
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                            typePillClasses(row.type)
                          )}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <div className="font-semibold text-slate-900">{formatGTQ(row.commissionAmount)}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-slate-900">{row.doctor.name}</div>
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                            statusPillClasses(row.status)
                          )}
                        >
                          {row.status === "paid" ? "Pagada" : "Pendiente"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-2xl border border-slate-200 bg-diagnostics-background p-4 text-sm text-slate-600 shadow-soft">
          Reglas configurables: fijo por examen (ej Q2) o porcentaje; por sede/servicio/rol.
        </div>
      </div>
    </RoleGuard>
  );
}
