import { MembershipsShell } from "@/components/memberships/MembershipsShell";
import { PlanEditorForm } from "@/components/memberships/PlanEditorForm";

export default function MembershipPlanCreatePage() {
  return (
    <MembershipsShell
      title="Planes · Crear"
      description="Alta de plan con segmento, categoría, duración, beneficios y foto (URL)."
    >
      <PlanEditorForm mode="create" />
    </MembershipsShell>
  );
}
