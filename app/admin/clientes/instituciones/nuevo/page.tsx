import { cookies } from "next/headers";
import InstitutionCreateForm from "@/components/clients/InstitutionCreateForm";
import { getSessionUserFromCookies } from "@/lib/auth";
import { getClientContactDirectories } from "@/lib/clients/contactDirectories.server";
import { getOperatingCountryDefaults } from "@/lib/clients/operatingCountryDefaults.server";
import { tenantIdFromUser } from "@/lib/tenant";

export default async function NuevaInstitucionPage() {
  const currentUser = await getSessionUserFromCookies(cookies());
  const tenantId = tenantIdFromUser(currentUser);
  const [operatingDefaults, contactDirectories] = await Promise.all([
    getOperatingCountryDefaults(tenantId),
    getClientContactDirectories(tenantId, { includeInactive: true })
  ]);

  return (
    <InstitutionCreateForm initialOperatingDefaults={operatingDefaults} initialContactDirectories={contactDirectories} />
  );
}
