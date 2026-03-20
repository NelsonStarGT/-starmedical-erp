import { NextResponse } from "next/server";

export async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function withApiErrorHandling<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>
) {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (error: any) {
      if (error?.status && error?.body) {
        return NextResponse.json(error.body, { status: error.status });
      }

      console.error("users api error", error);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
  };
}
