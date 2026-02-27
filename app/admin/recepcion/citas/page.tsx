import CitasBoardV1 from "@/components/recepcion/CitasBoardV1";
import { requireRecepcionCapability } from "@/lib/recepcion/server";

export default async function RecepcionCitasPage() {
  const { access } = await requireRecepcionCapability("RECEPTION_APPOINTMENTS_VIEW");

  return <CitasBoardV1 canWrite={access.canWriteAppointments} />;
}
