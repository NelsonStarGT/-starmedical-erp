"use client";

import ClientOrganizationCreateFormBase from "@/components/clients/ClientOrganizationCreateFormBase";
import type { ClientContactDirectoriesSnapshot } from "@/lib/clients/contactDirectories";
import type { OperatingCountryDefaultsSnapshot } from "@/lib/clients/operatingCountryDefaults";

export default function InstitutionCreateForm({
  initialOperatingDefaults,
  initialContactDirectories
}: {
  initialOperatingDefaults?: OperatingCountryDefaultsSnapshot;
  initialContactDirectories?: ClientContactDirectoriesSnapshot;
}) {
  return (
    <ClientOrganizationCreateFormBase
      mode="institution"
      initialOperatingDefaults={initialOperatingDefaults}
      initialContactDirectories={initialContactDirectories}
    />
  );
}
