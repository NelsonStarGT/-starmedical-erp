import { MembershipsShell } from "@/components/memberships/MembershipsShell";
import { PlanEditorForm } from "@/components/memberships/PlanEditorForm";

export default function MembershipPlanCreatePage() {
  return (
    <MembershipsShell
      title="Planes · Crear"
      description="Crea un producto de suscripción con identidad comercial, precios y beneficios."
    >
      <PlanEditorForm mode="create" />
    </MembershipsShell>
  );
}
