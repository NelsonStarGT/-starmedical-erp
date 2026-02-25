import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as getPostal } from "@/app/api/geo/postal/route";

test("/api/geo/postal exige country", async () => {
  const req = new NextRequest("http://localhost:3000/api/geo/postal?postalCode=05011");
  const res = await getPostal(req);
  assert.equal(res.status, 400);
  const payload = (await res.json()) as { ok?: boolean; error?: string };
  assert.equal(payload.ok, false);
  const normalizedError = (payload.error ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  assert.ok(normalizedError.includes("pais"));
});
