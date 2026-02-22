const broadcasts = [
  {
    id: "br-1",
    name: "Recordatorio checkup VIP",
    audience: "Pacientes VIP · Membresía platino",
    schedule: "10 mayo · 18:00",
    status: "Programada",
    number: "Ventas GT",
    tags: ["Clínico", "Recordatorio"]
  },
  {
    id: "br-2",
    name: "Campaña ocupacional Q2",
    audience: "Empresas con contrato ocupacional",
    schedule: "12 mayo · 09:00",
    status: "Borrador",
    number: "Salud Ocupacional",
    tags: ["Ocupacional", "Empresas"]
  },
  {
    id: "br-3",
    name: "Re-enganche leads UAV",
    audience: "Leads DroneAllen +30 días",
    schedule: "Enviado ayer · 16:30",
    status: "Enviado",
    number: "Ventas UAV",
    tags: ["Ventas", "Follow-up"]
  }
];

const statusTone: Record<string, string> = {
  Programada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Enviado: "bg-[#4aa59c]/10 text-[#2e75ba] border-[#4aa59c33]",
  Borrador: "bg-amber-50 text-amber-700 border-amber-200"
};

export default function OpsWhatsAppBroadcastsPage() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard title="Programadas" value="4" helper="Próximas 48h" />
        <StatCard title="Enviadas este mes" value="18" helper="Tasa entrega estimada 98%" />
        <StatCard title="Borradores" value="6" helper="Listos para revisión" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#2e75ba]">Difusión (preview)</p>
            <p className="text-xs text-slate-500">Comunicaciones programadas/masivas por workspace y número.</p>
          </div>
          <span className="text-xs text-slate-500">Última sync: 10 mayo 2024</span>
        </div>
        <div className="divide-y divide-slate-100">
          {broadcasts.map((item) => (
            <div key={item.id} className="px-4 py-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-600">{item.audience}</p>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={`${item.id}-${tag}`}
                      className="inline-flex items-center rounded-full bg-[#4aadf5]/10 text-[#2e75ba] border border-[#4aadf5]/30 px-2 py-0.5 text-[11px] font-semibold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-[#F8FAFC] border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">
                  {item.number}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${statusTone[item.status]}`}>
                  {item.status}
                </span>
                <span className="text-xs text-slate-500">{item.schedule}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 space-y-1">
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      <p className="text-2xl font-semibold text-[#2e75ba]">{value}</p>
      <p className="text-xs text-slate-500">{helper}</p>
    </div>
  );
}
