import RoleGuard from "@/components/medical/RoleGuard";
import Cie10AdminClient from "@/components/medical/configuration/Cie10AdminClient";

export default function MedicalCie10ConfigPage() {
  return (
    <RoleGuard requirePermissions="SYSTEM:ADMIN">
      <Cie10AdminClient />
    </RoleGuard>
  );
}
