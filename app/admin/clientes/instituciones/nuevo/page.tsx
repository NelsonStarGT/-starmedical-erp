import { cookies } from "next/headers";
import InstitutionCreateForm from "@/components/clients/InstitutionCreateForm";
import { getSessionUserFromCookies } from "@/lib/auth";
import { getClientContactDirectories } from "@/lib/clients/contactDirectories.server";
import { getEffectiveOperatingCountryDefaults } from "@/lib/clients/operatingCountryDefaults.server";
import { tenantIdFromUser } from "@/lib/tenant";

export default async function NuevaInstitucionPage() {
  const cookieStore = await cookies();
  const currentUser = await getSessionUserFromCookies(cookieStore);
  const tenantId = tenantIdFromUser(currentUser);
  const [operatingDefaults, contactDirectories] = await Promise.all([
    getEffectiveOperatingCountryDefaults(tenantId, { cookieStore }),
    getClientContactDirectories(tenantId, { includeInactive: true })
  ]);

  return (
    <InstitutionCreateForm initialOperatingDefaults={operatingDefaults} initialContactDirectories={contactDirectories} />
  );
}
