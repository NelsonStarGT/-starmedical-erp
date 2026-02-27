import AdmissionsWizardV1 from "@/components/recepcion/AdmissionsWizardV1";
import { requireRecepcionCapability } from "@/lib/recepcion/server";

export default async function RecepcionAdmisionesPage() {
  const { access } = await requireRecepcionCapability("RECEPTION_ADMISSIONS_VIEW");

  return <AdmissionsWizardV1 canWrite={access.canWriteAdmissions} />;
}
