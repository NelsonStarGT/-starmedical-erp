import SecurityPolicyPanel from "@/components/configuracion/SecurityPolicyPanel";
import PageHeader from "@/components/layout/PageHeader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function ConfigSeguridadPage() {
  return (
    <div className="space-y-4 text-slate-900">
      <PageHeader
        eyebrow="Configuración · Seguridad"
        title="Hardening y auditoría"
        subtitle="Políticas de sesión/contraseña/lockout por tenant, RBAC y tabla de auditoría con filtros por actor/acción/fecha."
      />

      <SecurityPolicyPanel />
    </div>
  );
}
