export type FolderKey =
  | "Nuevos"
  | "En Atención"
  | "Ventas"
  | "Soporte"
  | "Salud Ocupacional"
  | "Automatizados"
  | "Cerrados";

export type SlaStatus = "ok" | "warning" | "risk";
export type AutomationStatus = "active" | "paused";
export type QueueKey = "ventas" | "compras" | "soporte" | "clinico" | "ocupacional";
export type ConversationPriority = "normal" | "urgent";
export type ConsentStatus = "granted" | "pending" | "denied";
export type ContactType = "paciente" | "empresa" | "lead";

export type Agent = {
  id: string;
  name: string;
  role: string;
  initials?: string;
  color?: string;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  brandAccent?: string;
};

export type WhatsAppNumber = {
  id: string;
  workspaceId: string;
  label: string;
  e164: string;
  isDefault: boolean;
};

export type Conversation = {
  id: string;
  folder: FolderKey;
  workspaceId: string;
  numberId: string;
  contactId: string;
  lastMessage: string;
  updatedAt: string;
  tags: string[];
  slaStatus: SlaStatus;
  assignedUserIds: string[];
  queueKey: QueueKey;
  priority: ConversationPriority;
  unreadCount: number;
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
  type: ContactType;
  consent: ConsentStatus;
  membership?: string;
  insurance?: string;
  labels: string[];
  notes?: string;
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

export type TemplateCategory = "Clínico" | "Ventas" | "Empresas" | "Seguimiento" | "Urgencias" | "Laboratorio";

export type Template = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  category: TemplateCategory;
  steps: string[];
};

export type Automation = {
  id: string;
  name: string;
  status: AutomationStatus;
  trigger: string;
  action: string;
  workspaceId: string;
  numberId: string;
  templateId?: string;
  steps: string[];
  message?: string;
  schedule?: string;
  tags?: string[];
  assignment?: string;
};
