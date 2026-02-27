import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { POST as setOperatingCountry } from "@/app/api/admin/clientes/operating-country/route";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { CLIENTS_COUNTRY_FILTER_COOKIE } from "@/lib/clients/operatingCountryContext";

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-star-secret";

function buildAuthRequest(url: string, body?: unknown) {
  const token = jwt.sign(
    {
      id: "user-admin",
      email: "admin@starmedical.test",
      roles: ["ADMIN"],
      permissions: [],
      tenantId: "tenant-alpha"
    },
    AUTH_SECRET,
    { expiresIn: "1h" }
  );

  return new NextRequest(url, {
    method: "POST",
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body ?? {})
  });
}

test("country-filter route persiste cookie con countryId válido", async () => {
  const delegate = (prisma as any).geoCountry;
  assert.ok(delegate?.findFirst, "geoCountry delegate missing");

  const originalFindFirst = delegate.findFirst;
  let capturedWhere: any = null;

  delegate.findFirst = async (args: any) => {
    capturedWhere = args?.where ?? null;
    return {
      id: "country-co",
      iso2: "CO",
      name: "Colombia"
    };
  };

  try {
    const req = buildAuthRequest("http://localhost/api/admin/clientes/operating-country", {
      countryId: "country-co"
    });
    const res = await setOperatingCountry(req);

    assert.equal(res.status, 200);
    assert.equal(capturedWhere?.id, "country-co");
    assert.equal(capturedWhere?.isActive, true);

    const payload = (await res.json()) as { ok?: boolean; data?: { countryId?: string; iso2?: string } };
    assert.equal(payload.ok, true);
    assert.equal(payload.data?.countryId, "country-co");
    assert.equal(payload.data?.iso2, "CO");

    const setCookie = res.headers.get("set-cookie") || "";
    assert.match(setCookie, new RegExp(`${CLIENTS_COUNTRY_FILTER_COOKIE}=country-co`));
  } finally {
    delegate.findFirst = originalFindFirst;
  }
});

test("country-filter route responde 400 cuando countryId es inválido", async () => {
  const delegate = (prisma as any).geoCountry;
  assert.ok(delegate?.findFirst, "geoCountry delegate missing");

  const originalFindFirst = delegate.findFirst;
  delegate.findFirst = async () => null;

  try {
    const req = buildAuthRequest("http://localhost/api/admin/clientes/operating-country", {
      countryId: "country-invalid"
    });
    const res = await setOperatingCountry(req);

    assert.equal(res.status, 400);
    const payload = (await res.json()) as { ok?: boolean; error?: string };
    assert.equal(payload.ok, false);
    assert.match(payload.error || "", /inválido|inactivo/i);
  } finally {
    delegate.findFirst = originalFindFirst;
  }
});

test("country-filter route permite seleccionar todos los países", async () => {
  const req = buildAuthRequest("http://localhost/api/admin/clientes/operating-country", {
    countryId: "ALL"
  });
  const res = await setOperatingCountry(req);

  assert.equal(res.status, 200);
  const payload = (await res.json()) as { ok?: boolean; data?: { countryId?: string | null } };
  assert.equal(payload.ok, true);
  assert.equal(payload.data?.countryId ?? null, null);

  const setCookie = res.headers.get("set-cookie") || "";
  assert.match(setCookie, new RegExp(`${CLIENTS_COUNTRY_FILTER_COOKIE}=ALL`));
});
