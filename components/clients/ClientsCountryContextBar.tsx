"use client";

import CbcCountryFilterBar from "@/components/clients/CbcCountryFilterBar";

export default function ClientsCountryContextBar({
  initialCountryId,
  tenantId
}: {
  initialCountryId: string | null;
  tenantId?: string | null;
}) {
  return <CbcCountryFilterBar initialCountryId={initialCountryId} tenantId={tenantId} />;
}
