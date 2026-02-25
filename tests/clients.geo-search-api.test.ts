import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as searchGeoDivisions } from "@/app/api/geo/divisions/search/route";

test("/api/geo/divisions/search protege acceso sin sesion", async () => {
  const req = new NextRequest("http://localhost:3000/api/geo/divisions/search?country=GT&level=2&q=esc");
  const res = await searchGeoDivisions(req);
  assert.ok([401, 403].includes(res.status));
});
