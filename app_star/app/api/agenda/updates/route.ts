import { NextRequest, NextResponse } from "next/server";
import { agendaEmitter, type AgendaEvent } from "@/lib/agendaEvents";
import { requireAuth } from "@/lib/auth";
import { canReadAgendaEvent, enforceAgendaBranchScope } from "@/lib/agenda/access";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.errorResponse) return auth.errorResponse;

  const branchParam = req.nextUrl.searchParams.get("branchId");
  const branchScope = enforceAgendaBranchScope(auth.user, branchParam);
  if (!branchScope.allowed) {
    return NextResponse.json({ error: branchScope.reason || "No autorizado para esta sede" }, { status: 403 });
  }

  const effectiveBranchId = branchScope.effectiveBranchId;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: AgendaEvent) => {
        if (!canReadAgendaEvent(effectiveBranchId, event.data)) return;
        controller.enqueue(encoder.encode(`event: ${event.type}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event.data)}\n\n`));
      };

      const createdHandler = (data: any) => send({ type: "appointment_created", data });
      const updatedHandler = (data: any) => send({ type: "appointment_updated", data });
      const deletedHandler = (data: any) => send({ type: "appointment_deleted", data });

      agendaEmitter.on("appointment_created", createdHandler);
      agendaEmitter.on("appointment_updated", updatedHandler);
      agendaEmitter.on("appointment_deleted", deletedHandler);

      const initial = encoder.encode(`event: ping\ndata: "connected"\n\n`);
      controller.enqueue(initial);

      req.signal.addEventListener("abort", () => {
        agendaEmitter.removeListener("appointment_created", createdHandler);
        agendaEmitter.removeListener("appointment_updated", updatedHandler);
        agendaEmitter.removeListener("appointment_deleted", deletedHandler);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream"
    }
  });
}
