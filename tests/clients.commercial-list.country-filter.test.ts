import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { listClientsCommercial } from "@/lib/clients/commercialList.service";
import { normalizeClientsCountryFilterInput } from "@/lib/clients/countryFilter.server";

test("commercial list aplica filtro geoCountryId cuando se recibe countryId", async () => {
  const delegate = (prisma as any).clientProfile;
  assert.ok(delegate?.findMany, "clientProfile delegate missing");

  const originalFindMany = delegate.findMany;
  let capturedWhere: any = null;
  delegate.findMany = async (args: any) => {
    capturedWhere = args?.where ?? null;
    return [];
  };

  try {
    await listClientsCommercial({
      tenantId: "tenant-alpha",
      countryId: "country-gt",
      page: 1,
      pageSize: 10
    });

    assert.equal(capturedWhere?.clientLocations?.some?.geoCountryId, "country-gt");
    assert.equal(capturedWhere?.clientLocations?.some?.isPrimary, true);
    assert.equal(capturedWhere?.clientLocations?.some?.isActive, true);
  } finally {
    delegate.findMany = originalFindMany;
  }
});

test("commercial list omite filtro geoCountryId cuando countryId=ALL", async () => {
  const delegate = (prisma as any).clientProfile;
  assert.ok(delegate?.findMany, "clientProfile delegate missing");

  const originalFindMany = delegate.findMany;
  let capturedWhere: any = null;
  delegate.findMany = async (args: any) => {
    capturedWhere = args?.where ?? null;
    return [];
  };

  try {
    await listClientsCommercial({
      tenantId: "tenant-alpha",
      countryId: normalizeClientsCountryFilterInput("ALL"),
      page: 1,
      pageSize: 10
    });

    assert.equal("clientLocations" in (capturedWhere || {}), false);
  } finally {
    delegate.findMany = originalFindMany;
  }
});

