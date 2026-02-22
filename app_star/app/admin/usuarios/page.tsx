'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useUserData } from "@/components/users/UserProvider";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

const barColors = ["bg-brand-primary", "bg-brand-secondary", "bg-amber-400", "bg-slate-400", "bg-indigo-400"];

export default function UsuariosDashboard() {
  const { usuarios, rolesOperativos, sucursales, documentosDef } = useUserData();

  const stats = useMemo(() => {
    const total = usuarios.length;
    const activos = usuarios.filter((u) => u.estado === "Activo").length;
    const inactivos = usuarios.filter((u) => u.estado === "Inactivo").length;
    const suspendidos = usuarios.filter((u) => u.estado === "Suspendido").length;
    return { total, activos, inactivos, suspendidos };
  }, [usuarios]);

  const usersByRol = useMemo(() => {
    return rolesOperativos.map((rol) => ({
      rol: rol.nombre,
      total: usuarios.filter((u) => u.rolOperativoId === rol.id).length
    }));
  }, [rolesOperativos, usuarios]);

  const usersBySucursal = useMemo(() => {
    return sucursales.map((s) => ({
      sucursal: s.nombre,
      total: usuarios.filter((u) => u.sucursalId === s.id).length
    }));
  }, [sucursales, usuarios]);

  const alerts = useMemo(() => {
    const today = new Date();
    const soon = new Date();
    soon.setDate(today.getDate() + 30);

    const expiring = usuarios.flatMap((u) =>
      (u.documentos || []).map((doc) => {
        const def = documentosDef.find((d) => d.id === doc.documentoId);
        return { ...doc, usuario: u, def };
      })
    );

    const withDates = expiring.filter((d) => d.fechaVencimiento);
    const aboutToExpire = withDates.filter((d) => {
      const venc = new Date(d.fechaVencimiento as string);
      return venc >= today && venc <= soon;
    });
    return { aboutToExpire: aboutToExpire.length };
  }, [usuarios, documentosDef]);

  const maxRolValue = Math.max(1, ...usersByRol.map((r) => r.total));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-slate-500">Total de usuarios</p>
            <p className="text-3xl font-semibold text-slate-900 mt-2">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-slate-500">Activos</p>
            <p className="text-3xl font-semibold text-slate-900 mt-2">{stats.activos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-slate-500">Inactivos</p>
            <p className="text-3xl font-semibold text-slate-900 mt-2">{stats.inactivos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-slate-500">Suspendidos</p>
            <p className="text-3xl font-semibold text-slate-900 mt-2">{stats.suspendidos}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Usuarios por rol</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usersByRol.map((item, index) => (
                <div key={item.rol}>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>{item.rol}</span>
                    <span>{item.total}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      className={cn("h-2 rounded-full transition-all", barColors[index % barColors.length])}
                      style={{ width: `${(item.total / maxRolValue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen por sucursal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {usersBySucursal.map((item) => (
              <div key={item.sucursal} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.sucursal}</p>
                  <p className="text-xs text-slate-500">Usuarios</p>
                </div>
                <Badge variant="info">{item.total}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Alertas de documentos</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Documentos próximos a vencer (30 días)</p>
              <p className="text-3xl font-semibold text-amber-600 mt-2">{alerts.aboutToExpire}</p>
            </div>
            <Badge variant="warning">Revisar</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Indicadores rápidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>Roles únicos</span>
              <Badge variant="info">{rolesOperativos.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Sucursales activas</span>
              <Badge variant="info">{sucursales.filter((s) => s.estado === "Activa").length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Documentos requeridos</span>
              <Badge variant="info">
                {documentosDef.filter((d) => d.obligatorio).length}/{documentosDef.length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
