import RoleGuard from "@/components/medical/RoleGuard";
import OperationalWorklistClient from "@/components/medical/worklist/OperationalWorklistClient";
import { allowedRolesForWorklist } from "@/lib/medical/worklistAccess";

export default function UsgOperationalWorklistPage() {
  return (
    <RoleGuard allowRoles={allowedRolesForWorklist("USG")} redirectTo="/modulo-medico/dashboard">
      <OperationalWorklistClient modality="USG" />
    </RoleGuard>
  );
}
