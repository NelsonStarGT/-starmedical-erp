'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { agents as agentDirectory, numbers, quickReplyTemplates, templates, workspaces } from "../data";
import type {
  Agent,
  Contact,
  Conversation,
  Message,
  QuickReply,
  WhatsAppNumber,
  Workspace
} from "../types";
import { fetchThreads, sendMessage as sendGatewayMessage } from "@/service/whatsappGateway";

type ConversationWithContact = Conversation & { contact: Contact };
type InboxFilterKey = "all" | "unread" | "assignedToMe" | "unassigned" | "urgent";

type WhatsAppContextValue = {
  workspaces: Workspace[];
  numbers: WhatsAppNumber[];
  agents: Agent[];
  currentUserId: string;
  setCurrentUserId: (userId: string) => void;
  templates: typeof templates;
  contacts: Contact[];
  conversations: Conversation[];
  messages: Message[];
  quickReplies: QuickReply[];
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (workspaceId: string) => void;
  activeNumberId: string | null;
  setActiveNumberId: (numberId: string) => void;
  inboxFilter: InboxFilterKey;
  setInboxFilter: (filter: InboxFilterKey) => void;
  globalSearch: string;
  setGlobalSearch: (value: string) => void;
  listSearch: string;
  setListSearch: (value: string) => void;
  filteredConversations: ConversationWithContact[];
  selectedConversation: ConversationWithContact | null;
  selectConversation: (conversationId: string) => void;
  conversationMessages: Message[];
  sendMessage: (text: string) => void;
  drafts: Record<string, string>;
  setDraftForConversation: (conversationId: string, value: string) => void;
  assignConversation: (conversationId: string, userId: string) => void;
  removeAssignee: (conversationId: string, userId: string) => void;
  takeConversation: (conversationId: string) => void;
  markConversationRead: (conversationId: string) => void;
  updateContactNotes: (contactId: string, notes: string) => void;
  addContactLabel: (contactId: string, label: string) => void;
  removeContactLabel: (contactId: string, label: string) => void;
  filterCounts: Record<InboxFilterKey, number>;
  isLoading: boolean;
};

const WhatsAppContext = createContext<WhatsAppContextValue | undefined>(undefined);

const initialFilter: InboxFilterKey = "all";

export function WhatsAppProvider({ children }: { children: React.ReactNode }) {
  const [workspaceList] = useState<Workspace[]>(workspaces);
  const [numberList] = useState<WhatsAppNumber[]>(numbers);
  const [agentList] = useState<Agent[]>(agentDirectory);
  const [currentUserId, setCurrentUserId] = useState<string>(agentDirectory[0]?.id ?? "");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(workspaces[0]?.id ?? null);
  const [activeNumberId, setActiveNumberId] = useState<string | null>(
    numbers.find((num) => num.workspaceId === workspaces[0]?.id && num.isDefault)?.id ?? null
  );
  const [inboxFilter, setInboxFilter] = useState<InboxFilterKey>(initialFilter);
  const [globalSearch, setGlobalSearch] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const contactMap = useMemo(
    () =>
      contacts.reduce<Record<string, Contact>>((acc, contact) => {
        acc[contact.id] = contact;
        return acc;
      }, {}),
    [contacts]
  );

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!activeWorkspaceId || !activeNumberId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const result = await fetchThreads({ workspaceId: activeWorkspaceId, numberId: activeNumberId });
        if (!active) return;
        setContacts(result.contacts ?? []);
        setConversations(result.conversations ?? []);
        setMessages(result.messages ?? []);
      } catch (error) {
        console.warn("WhatsApp Ops: no se pudo cargar threads mock", error);
        if (!active) return;
        setContacts([]);
        setConversations([]);
        setMessages([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [activeWorkspaceId, activeNumberId]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    const workspaceNumbers = numberList.filter((num) => num.workspaceId === activeWorkspaceId);
    const workspaceDefault = workspaceNumbers.find((num) => num.isDefault);
    setActiveNumberId((prev) => {
      const current = workspaceNumbers.find((num) => num.id === prev);
      if (current) return current.id;
      return workspaceDefault?.id ?? workspaceNumbers[0]?.id ?? null;
    });
  }, [activeWorkspaceId, numberList]);

  const filterCounts = useMemo(() => {
    const base = conversations.filter((conversation) => {
      if (activeWorkspaceId && conversation.workspaceId !== activeWorkspaceId) return false;
      if (activeNumberId && conversation.numberId !== activeNumberId) return false;
      return true;
    });
    const counts: Record<InboxFilterKey, number> = {
      all: base.length,
      unread: 0,
      assignedToMe: 0,
      unassigned: 0,
      urgent: 0
    };
    base.forEach((conversation) => {
      if (conversation.unreadCount > 0) counts.unread += 1;
      if (conversation.assignedUserIds.includes(currentUserId)) counts.assignedToMe += 1;
      if (conversation.assignedUserIds.length === 0) counts.unassigned += 1;
      if (conversation.priority === "urgent") counts.urgent += 1;
    });
    return counts;
  }, [activeNumberId, activeWorkspaceId, conversations, currentUserId]);

  const filteredConversations: ConversationWithContact[] = useMemo(() => {
    const normalizedGlobal = globalSearch.trim().toLowerCase();
    const normalizedList = listSearch.trim().toLowerCase();

    const matchesSearch = (conversation: Conversation, contact: Contact) => {
      const haystack = [
        contact.name,
        contact.phone,
        contact.companyName ?? "",
        conversation.lastMessage,
        conversation.tags.join(" "),
        contact.labels.join(" "),
        contact.notes ?? ""
      ]
        .join(" ")
        .toLowerCase();

      if (normalizedGlobal && !haystack.includes(normalizedGlobal)) return false;
      if (normalizedList && !haystack.includes(normalizedList)) return false;
      return true;
    };

    const matchesFilter = (conversation: Conversation) => {
      switch (inboxFilter) {
        case "unread":
          return conversation.unreadCount > 0;
        case "assignedToMe":
          return conversation.assignedUserIds.includes(currentUserId);
        case "unassigned":
          return conversation.assignedUserIds.length === 0;
        case "urgent":
          return conversation.priority === "urgent";
        default:
          return true;
      }
    };

    return conversations
      .filter((conversation) => {
        if (activeWorkspaceId && conversation.workspaceId !== activeWorkspaceId) return false;
        if (activeNumberId && conversation.numberId !== activeNumberId) return false;
        return true;
      })
      .map((conversation) => {
        const contact = contactMap[conversation.contactId];
        if (!contact) return null;
        return { ...conversation, contact };
      })
      .filter((conversation): conversation is ConversationWithContact => Boolean(conversation))
      .filter((conversation) => matchesSearch(conversation, conversation.contact))
      .filter((conversation) => matchesFilter(conversation))
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }, [
    activeNumberId,
    activeWorkspaceId,
    contactMap,
    conversations,
    currentUserId,
    globalSearch,
    inboxFilter,
    listSearch
  ]);

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
      )
    );
  }, []);

  useEffect(() => {
    if (selectedConversationId && filteredConversations.some((item) => item.id === selectedConversationId)) {
      return;
    }
    if (filteredConversations.length > 0) {
      const nextId = filteredConversations[0].id;
      setSelectedConversationId(nextId);
      markConversationRead(nextId);
      return;
    }
    setSelectedConversationId(null);
  }, [filteredConversations, markConversationRead, selectedConversationId]);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    const conversation = conversations.find((item) => item.id === selectedConversationId);
    if (!conversation) return null;
    const contact = contactMap[conversation.contactId];
    return contact ? { ...conversation, contact } : null;
  }, [contactMap, conversations, selectedConversationId]);

  const conversationMessages = useMemo(
    () =>
      selectedConversationId
        ? messages
            .filter((message) => message.conversationId === selectedConversationId)
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )
        : [],
    [messages, selectedConversationId]
  );

  const selectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    markConversationRead(conversationId);
  };

  const setDraftForConversation = (conversationId: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [conversationId]: value }));
  };

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!selectedConversationId || trimmed.length === 0) return;

    const message: Message = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `msg-${Date.now()}`,
      conversationId: selectedConversationId,
      direction: "out",
      text: trimmed,
      createdAt: new Date().toISOString(),
      status: "sent"
    };

    setMessages((prev) => [...prev, message]);
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === selectedConversationId
          ? {
              ...conversation,
              lastMessage: trimmed,
              updatedAt: message.createdAt,
              unreadCount: 0
            }
          : conversation
      )
    );
    setDraftForConversation(selectedConversationId, "");

    void sendGatewayMessage({ conversationId: selectedConversationId, text: trimmed }).catch((error) => {
      console.warn("WhatsApp Ops: no se pudo enviar mock", error);
    });
  };

  const assignConversation = (conversationId: string, userId: string) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              assignedUserIds: conversation.assignedUserIds.includes(userId)
                ? conversation.assignedUserIds
                : [...conversation.assignedUserIds, userId]
            }
          : conversation
      )
    );
  };

  const removeAssignee = (conversationId: string, userId: string) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              assignedUserIds: conversation.assignedUserIds.filter((id) => id !== userId)
            }
          : conversation
      )
    );
  };

  const takeConversation = (conversationId: string) => {
    if (!currentUserId) return;
    assignConversation(conversationId, currentUserId);
  };

  const updateContactNotes = (contactId: string, notes: string) => {
    setContacts((prev) =>
      prev.map((contact) => (contact.id === contactId ? { ...contact, notes } : contact))
    );
  };

  const addContactLabel = (contactId: string, label: string) => {
    const normalized = label.trim();
    if (!normalized) return;
    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === contactId
          ? contact.labels.includes(normalized)
            ? contact
            : { ...contact, labels: [...contact.labels, normalized] }
          : contact
      )
    );
  };

  const removeContactLabel = (contactId: string, label: string) => {
    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === contactId
          ? { ...contact, labels: contact.labels.filter((item) => item.toLowerCase() !== label.toLowerCase()) }
          : contact
      )
    );
  };

  const value: WhatsAppContextValue = {
    workspaces: workspaceList,
    numbers: numberList,
    agents: agentList,
    currentUserId,
    setCurrentUserId,
    templates,
    contacts,
    conversations,
    messages,
    quickReplies: quickReplyTemplates,
    activeWorkspaceId,
    setActiveWorkspaceId,
    activeNumberId,
    setActiveNumberId,
    inboxFilter,
    setInboxFilter,
    globalSearch,
    setGlobalSearch,
    listSearch,
    setListSearch,
    filteredConversations,
    selectedConversation,
    selectConversation,
    conversationMessages,
    sendMessage,
    drafts,
    setDraftForConversation,
    assignConversation,
    removeAssignee,
    takeConversation,
    markConversationRead,
    updateContactNotes,
    addContactLabel,
    removeContactLabel,
    filterCounts,
    isLoading
  };

  return <WhatsAppContext.Provider value={value}>{children}</WhatsAppContext.Provider>;
}

export function useWhatsApp() {
  const ctx = useContext(WhatsAppContext);
  if (!ctx) {
    throw new Error("useWhatsApp must be used inside WhatsAppProvider");
  }
  return ctx;
}
