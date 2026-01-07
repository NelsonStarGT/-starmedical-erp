import { NextRequest } from "next/server";
import { agendaEmitter, type AgendaEvent } from "@/lib/agendaEvents";

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: AgendaEvent) => {
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
