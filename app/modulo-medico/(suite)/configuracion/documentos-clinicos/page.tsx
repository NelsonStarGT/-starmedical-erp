import RoleGuard from "@/components/medical/RoleGuard";
import DocumentBrandingAdminClient from "@/components/medical/configuration/DocumentBrandingAdminClient";

export default function MedicalDocumentsConfigPage() {
  return (
    <RoleGuard requirePermissions="SYSTEM:ADMIN">
      <DocumentBrandingAdminClient />
    </RoleGuard>
  );
}
