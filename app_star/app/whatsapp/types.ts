export type FolderKey =
  | "Nuevos"
  | "En Atención"
  | "Ventas"
  | "Soporte"
  | "Salud Ocupacional"
  | "Automatizados"
  | "Cerrados";

export type SlaStatus = "ok" | "warning" | "risk";

export type Conversation = {
  id: string;
  folder: FolderKey;
  contactId: string;
  lastMessage: string;
  updatedAt: string;
  tags: string[];
  slaStatus: SlaStatus;
};

export type Contact = {
  id: string;
  name: string;
  phone: string;
  flags: {
    isPatient: boolean;
    isVip: boolean;
    hasMembership: boolean;
  };
  companyName?: string;
};

export type Message = {
  id: string;
  conversationId: string;
  direction: "in" | "out";
  text: string;
  createdAt: string;
  status: "sent" | "delivered" | "read";
};

export type QuickReply = {
  id: string;
  label: string;
  text: string;
};
