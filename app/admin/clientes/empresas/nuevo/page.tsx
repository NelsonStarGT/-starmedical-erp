import { cookies } from "next/headers";
import CompanyCreateForm from "@/components/clients/CompanyCreateForm";
import { getSessionUserFromCookies } from "@/lib/auth";
import { getClientContactDirectories } from "@/lib/clients/contactDirectories.server";
import { getOperatingCountryDefaults } from "@/lib/clients/operatingCountryDefaults.server";
import { tenantIdFromUser } from "@/lib/tenant";

export default async function NuevaEmpresaPage() {
  const currentUser = await getSessionUserFromCookies(cookies());
  const tenantId = tenantIdFromUser(currentUser);
  const [operatingDefaults, contactDirectories] = await Promise.all([
    getOperatingCountryDefaults(tenantId),
    getClientContactDirectories(tenantId, { includeInactive: true })
  ]);
  return <CompanyCreateForm initialOperatingDefaults={operatingDefaults} initialContactDirectories={contactDirectories} />;
}
