"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { useUserData } from "@/components/users/UserProvider";
import { ROLE_PERMISSION_MAP, ALL_PERMISSION_KEYS } from "@/lib/security/permissionCatalog";
import { usePermissions } from "@/hooks/usePermissions";

export default function UsuariosPermisosPage() {
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const { toasts, showToast, dismiss } = useToast();
  const { rolesOperativos } = useUserData();

  const roleList = useMemo(() => rolesOperativos || [], [rolesOperativos]);
  const baseRoles = Object.entries(ROLE_PERMISSION_MAP);

  if (!hasPermission("USERS:ADMIN")) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        No autorizado. Requiere USERS:ADMIN.
      </div>
    );
  }

  const syncPermissions = async () => {
    try {
      const res = await fetch("/api/admin/permissions/sync", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "No se pudo sincronizar");
      showToast("Permisos sincronizados", "success");
    } catch (err: any) {
      showToast(err?.message || "No se pudo sincronizar", "error");
    }
  };

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Roles y permisos</h1>
        <button
          onClick={syncPermissions}
          className="rounded-md bg-brand-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:-translate-y-px transition"
        >
          Sincronizar permisos
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roles base (RBAC del sistema)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {baseRoles.map(([role, perms]) => (
            <div key={role} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-800">{role}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {perms.map((perm) => (
                  <span key={perm} className="rounded-full border border-slate-200 px-2 py-1 text-[11px] text-slate-700 bg-slate-50">
                    {perm}
                  </span>
                ))}
                {perms.length === 0 && <span className="text-xs text-slate-500">Sin permisos asignados.</span>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles operativos (catálogo)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 overflow-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Nombre</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Tipo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {roleList.map((rol) => (
                  <tr key={rol.id}>
                    <td className="px-4 py-2 text-sm font-semibold text-slate-900">{rol.nombre}</td>
                    <td className="px-4 py-2 text-sm text-slate-700">{rol.tipo}</td>
                    <td className="px-4 py-2">
                      <Badge variant={rol.estado === "Activo" ? "success" : "neutral"}>{rol.estado}</Badge>
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600">{rol.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Nota</p>
            <p className="text-xs text-slate-500">
              Estos roles son operativos/organizacionales. Los permisos del sistema se definen por Roles base (RBAC) y se sincronizan
              desde el catálogo.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de permisos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {ALL_PERMISSION_KEYS.map((perm) => (
            <div key={perm} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <span>{perm}</span>
              <Badge variant="neutral">Catálogo</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
