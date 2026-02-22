export default function ReceptionIncidentsPage() {
  return (
    <section className="rounded-xl border border-[#e5edf8] bg-white/95 p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Incidentes</p>
      <h2 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
        Bitácora operativa
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Aún no hay incidencias registradas. Este tablero mostrará bloqueos, pausas críticas y alertas operativas.
      </p>
    </section>
  );
}
