import { cookies } from "next/headers";
import CbcCountryFilterBar from "@/components/clients/CbcCountryFilterBar";
import { getSessionUserFromCookies } from "@/lib/auth";
import { readClientsCountryFilterCookie } from "@/lib/clients/countryFilter.server";
import { tenantIdFromUser } from "@/lib/tenant";

export default async function ClientesLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const currentUser = await getSessionUserFromCookies(cookieStore);
  const tenantId = currentUser ? tenantIdFromUser(currentUser) : null;
  const countryFilterId = readClientsCountryFilterCookie(cookieStore);

  return (
    <div className="space-y-4">
      <CbcCountryFilterBar initialCountryId={countryFilterId} tenantId={tenantId} />
      {children}
    </div>
  );
}
