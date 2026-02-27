import QueueBoardV1 from "@/components/recepcion/QueueBoardV1";
import { requireRecepcionCapability } from "@/lib/recepcion/server";

export default async function RecepcionColaPage() {
  const { access } = await requireRecepcionCapability("RECEPTION_QUEUE_VIEW");

  return <QueueBoardV1 canWrite={access.canWriteQueue} />;
}
