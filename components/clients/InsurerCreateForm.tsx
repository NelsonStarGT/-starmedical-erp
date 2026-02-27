"use client";

import ClientOrganizationCreateFormBase from "@/components/clients/ClientOrganizationCreateFormBase";
import type { ClientContactDirectoriesSnapshot } from "@/lib/clients/contactDirectories";
import type { OperatingCountryDefaultsSnapshot } from "@/lib/clients/operatingCountryDefaults";

export default function InsurerCreateForm({
  initialOperatingDefaults,
  initialContactDirectories
}: {
  initialOperatingDefaults?: OperatingCountryDefaultsSnapshot;
  initialContactDirectories?: ClientContactDirectoriesSnapshot;
}) {
  return (
    <ClientOrganizationCreateFormBase
      mode="insurer"
      initialOperatingDefaults={initialOperatingDefaults}
      initialContactDirectories={initialContactDirectories}
    />
  );
}
