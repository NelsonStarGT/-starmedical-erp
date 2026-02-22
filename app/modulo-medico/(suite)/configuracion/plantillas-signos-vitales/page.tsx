import RoleGuard from "@/components/medical/RoleGuard";
import VitalsTemplatesAdminClient from "@/components/medical/configuration/VitalsTemplatesAdminClient";

export default function MedicalVitalsTemplatesPage() {
  return (
    <RoleGuard requirePermissions="SYSTEM:ADMIN">
      <VitalsTemplatesAdminClient />
    </RoleGuard>
  );
}
