"use server";

import { requireRecepcionCapability } from "@/lib/recepcion/server";
import { searchRecepcionClients } from "@/lib/recepcion/client-search.service";

export async function actionSearchRecepcionClients(input: { q: string; limit?: number }) {
  const { user } = await requireRecepcionCapability("RECEPTION_VIEW");
  const items = await searchRecepcionClients({
    user,
    q: input.q,
    limit: input.limit
  });

  return { items };
}
