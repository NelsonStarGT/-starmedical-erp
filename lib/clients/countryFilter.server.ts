import type { Prisma } from "@prisma/client";
import {
  CLIENTS_COUNTRY_FILTER_COOKIE,
  CLIENTS_COUNTRY_FILTER_ALL,
  normalizeClientsCountryFilterValue
} from "@/lib/clients/operatingCountryContext";

type CookieStoreLike = {
  get(name: string): { value?: string | null } | undefined;
};

export function readClientsCountryFilterCookie(cookieStore?: CookieStoreLike | null) {
  const raw = cookieStore?.get(CLIENTS_COUNTRY_FILTER_COOKIE)?.value;
  return normalizeClientsCountryFilterValue(raw);
}

export function normalizeClientsCountryFilterInput(raw: unknown) {
  return normalizeClientsCountryFilterValue(raw);
}

export function clientsCountryFilterCookieValue(countryId: string | null) {
  return countryId ?? CLIENTS_COUNTRY_FILTER_ALL;
}

export function buildClientCountryFilterWhere(countryId: string | null): Prisma.ClientProfileWhereInput {
  if (!countryId) return {};
  return {
    clientLocations: {
      some: {
        isActive: true,
        isPrimary: true,
        geoCountryId: countryId
      }
    }
  };
}

export { CLIENTS_COUNTRY_FILTER_ALL };
