import SyncPermissionsButton from "@/components/users/SyncPermissionsButton";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { readRbacSnapshot } from "@/lib/security/rbacSnapshot";
import { getPersistedRbacStatus } from "@/lib/security/rbacSync";

export default async function UsuariosPermisosPage() {
  const [snapshot, status] = await Promise.all([readRbacSnapshot(), getPersistedRbacStatus(prisma)]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Roles y permisos persistidos</h1>
        <SyncPermissionsButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Health check RBAC</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">Roles</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{status.roles}</p>
          </div>
          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">Permission</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{status.permissions}</p>
          </div>
          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">RolePermission</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{status.rolePermissions}</p>
          </div>
          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">UserPermission</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{status.userPermissions}</p>
          </div>
          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">Estado</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{status.ready ? "Ready" : "Pendiente"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles persistidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {snapshot.roles.map((role) => (
            <div key={role.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{role.name}</p>
                  <p className="text-xs text-slate-500">{role.description || "Sin descripción"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={role.isSystem ? "info" : "neutral"}>{role.isSystem ? "Sistema" : "Custom"}</Badge>
                  <Badge variant="neutral">{role.userCount} usuarios</Badge>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {role.permissions.map((permission) => (
                  <span
                    key={`${role.id}-${permission.key}`}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700"
                  >
                    {permission.key}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de permisos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {snapshot.permissions.map((permission) => (
            <div
              key={permission.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
            >
              <span>{permission.key}</span>
              <Badge variant={permission.custom ? "warning" : "neutral"}>
                {permission.custom ? "Custom" : permission.module}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
