import crypto from "node:crypto";
import { NextResponse } from "next/server";

type HeaderBag = Headers | { get(name: string): string | null };

export function getOrCreateRequestId(req: { headers: HeaderBag }) {
  const incoming = req.headers.get("x-request-id")?.trim();
  if (incoming) return incoming;
  return crypto.randomUUID();
}

export function readClientIp(headers: HeaderBag) {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff
      .split(",")
      .map((part) => part.trim())
      .find(Boolean);
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return null;
}

export function withRequestIdHeader<T extends NextResponse>(response: T, requestId: string): T {
  response.headers.set("x-request-id", requestId);
  return response;
}
