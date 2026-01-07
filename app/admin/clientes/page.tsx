"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useClientData } from "@/components/clients/ClientProvider";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

const colors = ["bg-brand-primary", "bg-brand-secondary", "bg-amber-400", "bg-slate-400", "bg-indigo-400"];

export default function ClientesDashboard() {
  const { clientes, sectores } = useClientData();

  const stats = useMemo(() => {
    const total = clientes.length;
    const empresas = clientes.filter((c) => c.tipoCliente === "Empresa").length;
    const personas = clientes.filter((c) => c.tipoCliente === "Persona").length;
    const instituciones = clientes.filter((c) => c.tipoCliente === "Institución").length;
    const empleadosVinculados = clientes.reduce(
      (acc, c) => acc + (c.empleados?.length || 0),
      0
    );
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);

    const contratosPorVencer = clientes.filter((c) => {
      if (!c.fechaFinRelacion) return false;
      const fecha = new Date(c.fechaFinRelacion);
      return fecha >= new Date() && fecha <= soon;
    }).length;

    const docsPorVencer = clientes.reduce((acc, c) => {
      const docs = c.documentos || [];
      const count = docs.filter((d) => {
        if (!d.fechaVencimiento) return false;
        const fecha = new Date(d.fechaVencimiento);
        return fecha >= new Date() && fecha <= soon;
      }).length;
      return acc + count;
    }, 0);

    return { total, empresas, personas, instituciones, empleadosVinculados, contratosPorVencer, docsPorVencer };
  }, [clientes]);

  const clientesPorTipo = useMemo(() => {
    const tipos = ["Empresa", "Persona", "Institución"] as const;
    return tipos.map((tipo) => ({
      tipo,
      total: clientes.filter((c) => c.tipoCliente === tipo).length
    }));
  }, [clientes]);

  const clientesPorSector = useMemo(
    () =>
      sectores.map((s) => ({
        sector: s.nombreSector,
        total: clientes.filter((c) => c.sectorIndustriaId === s.id).length
      })),
    [clientes, sectores]
  );

  const empresasTopEmpleados = useMemo(() => {
    return clientes
      .filter((c) => c.tipoCliente === "Empresa" || c.tipoCliente === "Institución")
      .map((c) => ({
        nombre: c.nombreComercial || c.razonSocial || "Empresa",
        empleados: c.empleados?.length || 0
      }))
      .sort((a, b) => b.empleados - a.empleados)
      .slice(0, 5);
  }, [clientes]);

  const maxTipoValue = Math.max(1, ...clientesPorTipo.map((t) => t.total));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Total clientes</p><p className="text-3xl font-semibold text-slate-900 mt-2">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Empresas</p><p className="text-3xl font-semibold text-slate-900 mt-2">{stats.empresas}</p></CardContent></Card>
        <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Personas</p><p className="text-3xl font-semibold text-slate-900 mt-2">{stats.personas}</p></CardContent></Card>
        <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Instituciones</p><p className="text-3xl font-semibold text-slate-900 mt-2">{stats.instituciones}</p></CardContent></Card>
        <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Empleados vinculados</p><p className="text-3xl font-semibold text-slate-900 mt-2">{stats.empleadosVinculados}</p></CardContent></Card>
        <Card><CardContent className="py-5"><p className="text-sm text-slate-500">Contratos por vencer (&lt;30 días)</p><p className="text-3xl font-semibold text-amber-600 mt-2">{stats.contratosPorVencer}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Clientes por tipo</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clientesPorTipo.map((item, index) => (
                <div key={item.tipo}>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>{item.tipo}</span><span>{item.total}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div className={cn("h-2 rounded-full", colors[index % colors.length])} style={{ width: `${(item.total / maxTipoValue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Clientes por sector</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {clientesPorSector.map((item) => (
              <div key={item.sector} className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-slate-900">{item.sector}</p><p className="text-xs text-slate-500">Clientes</p></div>
                <Badge variant="info">{item.total}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Top empresas por empleados vinculados</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {empresasTopEmpleados.map((item, index) => (
              <div key={item.nombre}>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>{item.nombre}</span><span>{item.empleados}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div className={cn("h-2 rounded-full", colors[index % colors.length])} style={{ width: `${Math.min(100, item.empleados * 15)}%` }} />
                </div>
              </div>
            ))}
            {empresasTopEmpleados.length === 0 && <p className="text-sm text-slate-500">Sin datos</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Filtros rápidos</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between"><span>Contratos por vencer</span><Badge variant="warning">{stats.contratosPorVencer}</Badge></div>
            <div className="flex items-center justify-between"><span>Documentos por vencer</span><Badge variant="warning">{stats.docsPorVencer}</Badge></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Alertas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between"><span className="text-sm text-slate-700">Contratos SSO o convenios por vencer</span><Badge variant="warning">{stats.contratosPorVencer}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-sm text-slate-700">Documentos por vencer</span><Badge variant="warning">{stats.docsPorVencer}</Badge></div>
            <div className="flex items-center justify-between"><span className="text-sm text-slate-700">Clientes con pagos atrasados (mock)</span><Badge variant="warning">3</Badge></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Indicadores rápidos</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between"><span>Tipos de cliente</span><Badge variant="info">{3}</Badge></div>
            <div className="flex items-center justify-between"><span>Sectores activos</span><Badge variant="info">{sectores.filter((s) => s.estado === "Activo").length}</Badge></div>
            <div className="flex items-center justify-between"><span>Relaciones comerciales</span><Badge variant="info">4</Badge></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
