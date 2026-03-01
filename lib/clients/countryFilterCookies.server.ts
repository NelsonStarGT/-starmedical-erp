import "server-only";

import { cookies } from "next/headers";
import { readClientsCountryFilterCookie } from "@/lib/clients/countryFilter.server";

type CookieStoreLike = {
  get(name: string): { value?: string | null } | undefined;
};

export async function getClientsCountryFilterFromCookies(cookieStore?: CookieStoreLike | null) {
  if (cookieStore) return readClientsCountryFilterCookie(cookieStore);
  const runtimeCookieStore = await cookies();
  return readClientsCountryFilterCookie(runtimeCookieStore);
}

