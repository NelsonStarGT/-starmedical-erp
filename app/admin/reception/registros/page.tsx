import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ClientProfileType } from "@prisma/client";
import { getSessionUserFromCookies } from "@/lib/auth";
import { buildReceptionContext } from "@/lib/reception/rbac";
import {
  actionListClientSelfRegistrations,
  type ClientSelfRegistrationQueueRow
} from "@/app/admin/reception/actions";
import ClientSelfRegistrationsClient from "@/app/admin/reception/registros/ClientSelfRegistrationsClient";

const CLIENT_TYPE_OPTIONS: Array<{ id: ClientProfileType; label: string }> = [
  { id: ClientProfileType.PERSON, label: "Persona" },
  { id: ClientProfileType.COMPANY, label: "Empresa" },
  { id: ClientProfileType.INSTITUTION, label: "Institución" },
  { id: ClientProfileType.INSURER, label: "Aseguradora" }
];

export default async function ReceptionSelfRegistrationsPage() {
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  if (!user) redirect("/login");

  const context = buildReceptionContext(user);
  const initialRows = (await actionListClientSelfRegistrations({
    status: "PENDING",
    take: 80
  })) as ClientSelfRegistrationQueueRow[];

  return (
    <ClientSelfRegistrationsClient
      capabilities={context.capabilities}
      initialRows={initialRows}
      clientTypeOptions={CLIENT_TYPE_OPTIONS}
    />
  );
}
