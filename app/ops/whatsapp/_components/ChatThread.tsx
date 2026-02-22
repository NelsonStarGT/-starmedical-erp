'use client';

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Paperclip, SendHorizonal, UserPlus2, UserX, Workflow } from "lucide-react";
import { useMemo } from "react";
import QuickRepliesMenu from "./QuickRepliesMenu";
import { useWhatsApp } from "./WhatsAppProvider";
import type { QueueKey } from "../types";

function formatClock(date: string) {
  try {
    return format(new Date(date), "HH:mm", { locale: es });
  } catch {
    return "";
  }
}

const queueLabel: Record<QueueKey, string> = {
  ventas: "Ventas",
  compras: "Compras",
  soporte: "Soporte",
  clinico: "Clínico",
  ocupacional: "Ocupacional"
};

export default function ChatThread() {
  const {
    selectedConversation,
    conversationMessages,
    sendMessage,
    quickReplies,
    drafts,
    setDraftForConversation,
    isLoading,
    agents,
    assignConversation,
    removeAssignee,
    takeConversation,
    currentUserId
  } = useWhatsApp();

  const composerValue = selectedConversation ? drafts[selectedConversation.id] ?? "" : "";

  const resolveTemplate = useMemo(
    () => (text: string) => {
      if (!selectedConversation) return text;
      const { contact } = selectedConversation;
      return text
        .replace(/{{nombre}}/gi, contact.name)
        .replace(/{{sede}}/gi, "Sede Zona 10")
        .replace(/{{fecha_cita}}/gi, "10 mayo, 9:00am");
    },
    [selectedConversation]
  );

  const handleSend = () => {
    sendMessage(composerValue);
  };

  const assignees = useMemo(
    () =>
      selectedConversation
        ? selectedConversation.assignedUserIds
            .map((id) => agents.find((agent) => agent.id === id))
            .filter(Boolean)
        : [],
    [agents, selectedConversation]
  );

  const availableAssignees = useMemo(
    () => agents.filter((agent) => !selectedConversation?.assignedUserIds.includes(agent.id ?? "")),
    [agents, selectedConversation]
  );

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="h-5 w-32 bg-slate-100 rounded-full animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={`msg-skeleton-${idx}`} className="flex gap-3">
              <div className="h-9 w-9 rounded-full bg-slate-100 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-slate-100 rounded-full animate-pulse" />
                <div className="h-12 w-full bg-slate-100 rounded-2xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!selectedConversation) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center h-full min-h-[520px]">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-[#2e75ba]">Selecciona una conversación</p>
          <p className="text-sm text-slate-500">Elige una conversación de la izquierda para ver el chat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col h-full min-h-[520px]">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{selectedConversation.contact.name}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F8FAFC] border border-slate-200 px-2 py-0.5">
              {selectedConversation.contact.phone}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#4aa59c]/10 text-[#2e75ba] border border-[#4aa59c33] px-2 py-0.5">
              <Workflow className="h-3.5 w-3.5" />
              Ruta: {queueLabel[selectedConversation.queueKey]}
            </span>
            {selectedConversation.priority === "urgent" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Urgente
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5">
              {selectedConversation.contact.type === "paciente" || selectedConversation.queueKey === "clinico"
                ? "Clínico"
                : "Administrativo"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {assignees.length > 0 ? (
            assignees.map((agent) => (
              <span
                key={agent?.id}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F8FAFC] px-2 py-1 text-xs font-semibold text-slate-700"
              >
                <span
                  className="h-7 w-7 rounded-full text-white flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: agent?.color ?? "#4aa59c" }}
                >
                  {agent?.initials ?? agent?.name.slice(0, 2).toUpperCase()}
                </span>
                {agent?.name}
                <button
                  type="button"
                  onClick={() => agent?.id && removeAssignee(selectedConversation.id, agent.id)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-white"
                  aria-label="Remover asignación"
                >
                  <UserX className="h-3.5 w-3.5" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-500">Sin asignar</span>
          )}
          <div className="flex items-center gap-2">
            <select
              className="rounded-xl border border-slate-200 bg-[#F8FAFC] px-2 py-1.5 text-xs font-semibold text-slate-800 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
              onChange={(event) => {
                const userId = event.target.value;
                if (userId) assignConversation(selectedConversation.id, userId);
              }}
              value=""
            >
              <option value="" disabled>
                Asignar a...
              </option>
              {availableAssignees.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            {selectedConversation.assignedUserIds.length === 0 && (
              <button
                type="button"
                onClick={() => takeConversation(selectedConversation.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-[#4aa59c33] hover:scale-[1.01]"
              >
                <UserPlus2 className="h-4 w-4" />
                Tomar chat
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gradient-to-b from-[#F8FAFC] via-white to-white">
        {conversationMessages.map((message) => {
          const isOutgoing = message.direction === "out";
          return (
            <div key={message.id} className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                  isOutgoing ? "bg-[#4aa59c]/15 text-slate-900" : "bg-slate-100 text-slate-900"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                  <span>{formatClock(message.createdAt)}</span>
                  {isOutgoing && <span className="uppercase">{message.status}</span>}
                </div>
              </div>
            </div>
          );
        })}
        {conversationMessages.length === 0 && (
          <div className="text-center text-sm text-slate-500 py-10">
            <p className="font-semibold text-[#2e75ba]">Sin mensajes aún</p>
            <p>Envía el primer mensaje usando el editor inferior.</p>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <QuickRepliesMenu
            replies={quickReplies}
            onSelect={(reply) => {
              if (!selectedConversation) return;
              setDraftForConversation(selectedConversation.id, resolveTemplate(reply.text));
            }}
          />
          <button
            type="button"
            disabled
            title="Próximamente"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed"
          >
            <Paperclip className="h-4 w-4" />
            Adjuntar (Próximamente)
          </button>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              value={composerValue}
              onChange={(event) => selectedConversation && setDraftForConversation(selectedConversation.id, event.target.value)}
              placeholder="Escribe un mensaje…"
              rows={3}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              className="w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
            />
          </div>
          <button
            type="button"
            onClick={handleSend}
            className="inline-flex h-11 w-12 items-center justify-center rounded-2xl bg-[#4aa59c] text-white shadow-md shadow-[#4aa59c33] transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
            aria-label="Enviar mensaje"
          >
            <SendHorizonal className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
