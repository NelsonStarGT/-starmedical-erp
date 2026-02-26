export function normalizeTenantUserLookupQuery(value?: string | null) {
  return (value ?? "").trim();
}

export function canSearchTenantUserQuery(value?: string | null) {
  return normalizeTenantUserLookupQuery(value).length >= 2;
}
