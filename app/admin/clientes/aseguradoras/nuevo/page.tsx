import { cookies } from "next/headers";
import InsurerCreateForm from "@/components/clients/InsurerCreateForm";
import { getSessionUserFromCookies } from "@/lib/auth";
import { getOperatingCountryDefaults } from "@/lib/clients/operatingCountryDefaults.server";
import { tenantIdFromUser } from "@/lib/tenant";

export default async function NuevaAseguradoraPage() {
  const currentUser = await getSessionUserFromCookies(cookies());
  const operatingDefaults = await getOperatingCountryDefaults(tenantIdFromUser(currentUser));
  return <InsurerCreateForm initialOperatingDefaults={operatingDefaults} />;
}
