import RoleGuard from "@/components/medical/RoleGuard";
import OperationalWorklistClient from "@/components/medical/worklist/OperationalWorklistClient";
import { allowedRolesForWorklist } from "@/lib/medical/worklistAccess";

export default function RxOperationalWorklistPage() {
  return (
    <RoleGuard allowRoles={allowedRolesForWorklist("RX")} redirectTo="/modulo-medico/dashboard">
      <OperationalWorklistClient modality="RX" />
    </RoleGuard>
  );
}
