'use client';

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Search, UserPlus2 } from "lucide-react";
import { useMemo } from "react";
import TagChip from "./TagChip";
import SlaDot from "./SlaDot";
import { useWhatsApp } from "./WhatsAppProvider";
import type { QueueKey } from "../types";

function formatTimeAgo(date: string) {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
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

const queueTone: Record<QueueKey, string> = {
  ventas: "bg-[#4aa59c]/10 text-[#2e75ba] border-[#4aa59c33]",
  compras: "bg-amber-50 text-amber-700 border-amber-200",
  soporte: "bg-[#4aadf5]/10 text-[#2e75ba] border-[#4aadf5]/40",
  clinico: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ocupacional: "bg-slate-100 text-slate-700 border-slate-200"
};

export default function ConversationList() {
  const {
    filteredConversations,
    selectConversation,
    selectedConversation,
    listSearch,
    setListSearch,
    isLoading,
    inboxFilter,
    setInboxFilter,
    filterCounts,
    agents,
    currentUserId
  } = useWhatsApp();

  const fallbackAvatar = useMemo(
    () => ["#4aa59c", "#4aadf5", "#2e75ba", "#0b1f3a"],
    []
  );

  const agentMap = useMemo(
    () =>
      agents.reduce<Record<string, (typeof agents)[number]>>((acc, agent) => {
        acc[agent.id] = agent;
        return acc;
      }, {}),
    [agents]
  );

  const filters = [
    { key: "all", label: "Todos" },
    { key: "unread", label: "No leídos" },
    { key: "assignedToMe", label: "Asignados a mí" },
    { key: "unassigned", label: "Sin asignar" },
    { key: "urgent", label: "Urgentes" }
  ] as const;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm h-full flex flex-col">
      <div className="px-4 py-3 border-b border-slate-100 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#2e75ba]">Chats activos</p>
            <p className="text-xs text-slate-500">Lista de conversaciones con filtros tipo WATI.</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-[#F8FAFC] px-2 py-1 text-[11px] font-semibold text-slate-600 border border-slate-200">
            {filteredConversations.length} abiertos
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const isActive = inboxFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setInboxFilter(filter.key)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-[#4aa59c] text-white border-[#4aa59c] shadow-sm"
                    : "border-slate-200 text-slate-700 bg-[#F8FAFC] hover:bg-white"
                }`}
              >
                {filter.label}
                <span
                  className={`inline-flex min-w-[20px] justify-center rounded-full px-1 ${
                    isActive ? "bg-white/20 text-white" : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  {filterCounts[filter.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={listSearch}
            onChange={(event) => setListSearch(event.target.value)}
            placeholder="Buscar conversación"
            className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {isLoading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div key={`conv-skeleton-${idx}`} className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 rounded-full bg-slate-100 animate-pulse" />
                    <div className="h-3 w-40 rounded-full bg-slate-100 animate-pulse" />
                  </div>
                </div>
              </div>
            ))
          : filteredConversations.map((conversation, index) => {
              const isActive = selectedConversation?.id === conversation.id;
              const color = fallbackAvatar[index % fallbackAvatar.length];
              const assigned = conversation.assignedUserIds.map((id) => agentMap[id]).filter(Boolean);
              const isMine = conversation.assignedUserIds.includes(currentUserId);

              return (
                <button
                  key={conversation.id}
                  onClick={() => selectConversation(conversation.id)}
                  className={`w-full text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c] ${
                    isActive ? "bg-[#4aa59c]/5 border-l-4 border-[#4aa59c]" : index % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"
                  }`}
                >
                  <div className="px-4 py-3 flex gap-3">
                    <div
                      className="h-11 w-11 rounded-full flex items-center justify-center text-white font-semibold shadow-sm"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    >
                      {conversation.contact.name
                        .split(" ")
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join("")}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {conversation.contact.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{conversation.contact.phone}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${queueTone[conversation.queueKey]}`}
                            >
                              {queueLabel[conversation.queueKey]}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-slate-600">
                              {conversation.contact.type === "paciente" || conversation.queueKey === "clinico"
                                ? "Clínico"
                                : "Administrativo"}
                            </span>
                            {isMine && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#4aa59c]/10 text-[#2e75ba] border border-[#4aa59c33] px-2 py-0.5">
                                <UserPlus2 className="h-3 w-3" />
                                Asignado a ti
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <SlaDot status={conversation.slaStatus} />
                            <span className="text-[11px] text-slate-500 whitespace-nowrap">
                              {formatTimeAgo(conversation.updatedAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {conversation.unreadCount > 0 && (
                              <span className="inline-flex items-center justify-center rounded-full bg-[#4aadf5] text-white px-2 py-0.5 text-[11px] font-bold">
                                {conversation.unreadCount}
                              </span>
                            )}
                            {conversation.priority === "urgent" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[11px] font-semibold">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Urgente
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 line-clamp-2">{conversation.lastMessage}</p>
                      <div className="flex flex-wrap gap-2">
                        {conversation.tags.map((tag) => (
                          <TagChip key={`${conversation.id}-${tag}`} label={tag} />
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {assigned.length > 0 ? (
                          assigned.map((agent) => (
                            <span
                              key={`${conversation.id}-${agent.id}`}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
                            >
                              <span
                                className="h-6 w-6 rounded-full text-white flex items-center justify-center text-xs font-bold"
                                style={{ backgroundColor: agent.color ?? "#4aa59c" }}
                              >
                                {agent.initials ?? agent.name.slice(0, 2).toUpperCase()}
                              </span>
                              {agent.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">Sin asignar</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

        {!isLoading && filteredConversations.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            <p className="font-semibold text-[#2e75ba]">No hay conversaciones en este filtro</p>
            <p className="text-slate-500">Ajusta el filtro o vuelve más tarde.</p>
          </div>
        )}
      </div>
    </div>
  );
}
