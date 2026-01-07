export default function AdminHome() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-soft border border-slate-200">
          <p className="text-sm text-slate-500">Usuarios activos</p>
          <p className="text-3xl font-semibold text-slate-900 mt-2">18</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-soft border border-slate-200">
          <p className="text-sm text-slate-500">Clientes</p>
          <p className="text-3xl font-semibold text-slate-900 mt-2">42</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-soft border border-slate-200">
          <p className="text-sm text-slate-500">Módulos</p>
          <p className="text-3xl font-semibold text-slate-900 mt-2">Inventario, Facturación, Citas...</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-soft border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Bienvenido</h2>
        <p className="text-sm text-slate-600 mt-2">
          Este es el panel base del ERP StarMedical. Usa el menú lateral para navegar a los módulos
          disponibles. La arquitectura está lista para crecer con Inventario, Facturación, Citas y
          otros servicios.
        </p>
      </div>
    </div>
  );
}
