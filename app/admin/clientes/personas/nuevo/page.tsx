import { cookies } from "next/headers";
import PersonCreateForm from "@/components/clients/PersonCreateForm";
import { getSessionUserFromCookies } from "@/lib/auth";
import { getClientsDateFormat } from "@/lib/clients/dateFormatConfig";
import { getOperatingCountryDefaults } from "@/lib/clients/operatingCountryDefaults.server";
import { tenantIdFromUser } from "@/lib/tenant";

export default async function NuevaPersonaPage() {
  const currentUser = await getSessionUserFromCookies(cookies());
  const tenantId = tenantIdFromUser(currentUser);
  const [dateFormat, operatingDefaults] = await Promise.all([
    getClientsDateFormat(tenantId),
    getOperatingCountryDefaults(tenantId)
  ]);
  return <PersonCreateForm initialDateFormat={dateFormat} initialOperatingDefaults={operatingDefaults} />;
}
