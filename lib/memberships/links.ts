export type MembershipInvoiceLinkInput = {
  contractId: string;
  basePath?: "/admin/facturacion" | "/admin/finanzas";
  source?: string;
  params?: Record<string, string | number | boolean | null | undefined>;
};

export function buildMembershipInvoiceLink(input: MembershipInvoiceLinkInput) {
  const basePath = input.basePath || "/admin/facturacion";
  const source = input.source || "membership";

  const query = new URLSearchParams();
  query.set("source", source);
  query.set("contractId", input.contractId);

  for (const [key, value] of Object.entries(input.params || {})) {
    if (value === null || value === undefined || value === "") continue;
    query.set(key, String(value));
  }

  const search = query.toString();
  return search ? `${basePath}?${search}` : basePath;
}
