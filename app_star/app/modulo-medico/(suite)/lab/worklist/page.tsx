import RoleGuard from "@/components/medical/RoleGuard";
import OperationalWorklistClient from "@/components/medical/worklist/OperationalWorklistClient";
import { allowedRolesForWorklist } from "@/lib/medical/worklistAccess";

export default function LabOperationalWorklistPage() {
  return (
    <RoleGuard allowRoles={allowedRolesForWorklist("LAB")} redirectTo="/modulo-medico/dashboard">
      <OperationalWorklistClient modality="LAB" />
    </RoleGuard>
  );
}
