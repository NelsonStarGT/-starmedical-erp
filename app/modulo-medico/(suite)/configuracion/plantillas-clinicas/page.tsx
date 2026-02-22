import RoleGuard from "@/components/medical/RoleGuard";
import ClinicalTemplatesAdminClient from "@/components/medical/configuration/ClinicalTemplatesAdminClient";

export default function MedicalClinicalTemplatesPage() {
  return (
    <RoleGuard requirePermissions="SYSTEM:ADMIN">
      <ClinicalTemplatesAdminClient />
    </RoleGuard>
  );
}
