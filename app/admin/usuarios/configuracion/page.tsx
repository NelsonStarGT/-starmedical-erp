import ChangeOwnPasswordCard from "@/components/users/ChangeOwnPasswordCard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getTenantSecurityPolicy } from "@/lib/config-central/security-policy";
import { getUsersAdminMeta } from "@/lib/users/admin-data";
import { requireUsersAdminPageAccess } from "@/lib/users/access";

export default async function UsuariosConfiguracionPage() {
  await requireUsersAdminPageAccess();
  const [meta, policy] = await Promise.all([getUsersAdminMeta(), getTenantSecurityPolicy("global")]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Esta vista usa datos persistidos del esquema actual de `main` y política global de credenciales.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Roles persistidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {meta.roles.map((role) => (
              <div key={role.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{role.name}</p>
                  <p className="text-xs text-slate-500">{role.description || "Sin descripción"}</p>
                </div>
                <Badge variant={role.isSystem ? "info" : "neutral"}>{role.isSystem ? "Sistema" : "Custom"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sucursales activas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {meta.branches.map((branch) => (
              <div key={branch.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{branch.name}</p>
                  <p className="text-xs text-slate-500">{branch.code || "Sin código"}</p>
                </div>
                <Badge variant="success">Activa</Badge>
              </div>
            ))}
            {meta.branches.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                No hay sucursales persistidas en el esquema actual. El módulo usa `branchId` libre cuando aplica.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Política de credenciales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">Longitud mínima</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{policy.passwordMinLength}</p>
          </div>
          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">Mayúscula / minúscula / número</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {policy.passwordRequireUppercase ? "Sí" : "No"} / {policy.passwordRequireLowercase ? "Sí" : "No"} / {policy.passwordRequireNumber ? "Sí" : "No"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">Símbolo obligatorio</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{policy.passwordRequireSymbol ? "Sí" : "No"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">2FA</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{policy.enforce2FA ? "Exigido" : "Desactivado"}</p>
          </div>
        </CardContent>
      </Card>

      <ChangeOwnPasswordCard />
    </div>
  );
}
