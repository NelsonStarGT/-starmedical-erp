import {
  initialContacts,
  initialConversations,
  initialMessages,
  numbers,
  workspaces
} from "@/app/ops/whatsapp/data";
import type { Contact, Conversation, Message } from "@/app/ops/whatsapp/types";

export type SendMessagePayload = {
  conversationId: string;
  text: string;
};

export type FetchThreadsParams = {
  workspaceId: string;
  numberId: string;
};

export async function fetchThreads(params: FetchThreadsParams): Promise<{
  conversations: Conversation[];
  messages: Message[];
  contacts: Contact[];
  workspaces: typeof workspaces;
  numbers: typeof numbers;
}> {
  const { workspaceId, numberId } = params;
  // Stub: en el futuro se reemplazará por integración real con el gateway.
  const filteredConversations = initialConversations.filter(
    (conversation) => conversation.workspaceId === workspaceId && conversation.numberId === numberId
  );
  const conversationIds = new Set(filteredConversations.map((c) => c.id));
  const filteredMessages = initialMessages.filter((msg) => conversationIds.has(msg.conversationId));
  const filteredContacts = initialContacts.filter((contact) =>
    filteredConversations.some((c) => c.contactId === contact.id)
  );

  return {
    conversations: filteredConversations,
    messages: filteredMessages,
    contacts: filteredContacts,
    workspaces,
    numbers
  };
}

export async function sendMessage(payload: SendMessagePayload): Promise<{ ok: boolean }> {
  // Stub: reemplazar con llamada a provider cuando esté disponible.
  console.debug("sendMockWhatsAppMessage", payload);
  return { ok: true };
}
