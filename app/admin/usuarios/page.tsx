import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { getPersistedRbacStatus } from "@/lib/security/rbacSync";
import { getUsersDashboardSnapshot } from "@/lib/users/admin-data";

export default async function UsuariosDashboard() {
  const [dashboard, rbacStatus] = await Promise.all([
    getUsersDashboardSnapshot(),
    getPersistedRbacStatus(prisma)
  ]);

  return (
    <div className="space-y-6">
      {!rbacStatus.ready ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          RBAC persistido incompleto: {rbacStatus.issues.join(" ")}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-slate-500">Total de usuarios</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{dashboard.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-slate-500">Activos</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{dashboard.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-slate-500">Inactivos</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{dashboard.inactive}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-slate-500">RolePermission</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{rbacStatus.rolePermissions}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Distribución por rol</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.roles.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">Usuarios asignados</p>
                </div>
                <Badge variant="info">{item.total}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado RBAC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Roles</span>
              <Badge variant="info">{rbacStatus.roles}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Permisos</span>
              <Badge variant="info">{rbacStatus.permissions}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">UserPermission</span>
              <Badge variant="info">{rbacStatus.userPermissions}</Badge>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              El módulo ya consume Prisma y RBAC persistido como única fuente de verdad.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acceso por sucursal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dashboard.branches.map((branch) => (
            <div key={branch.id} className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{branch.name}</p>
                <Badge variant="neutral">{branch.total}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">Asignaciones de acceso activas</p>
            </div>
          ))}
          {dashboard.branches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
              No hay sucursales activas para asignar acceso.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
