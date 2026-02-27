import RegistrationsV1 from "@/components/recepcion/RegistrationsV1";
import { requireRecepcionCapability } from "@/lib/recepcion/server";

export default async function RecepcionRegistrosPage() {
  const { access } = await requireRecepcionCapability("RECEPTION_REGISTRATIONS_VIEW");

  return <RegistrationsV1 canWrite={access.canWriteRegistrations} />;
}
