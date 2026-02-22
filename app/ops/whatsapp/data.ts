import {
  Agent,
  Contact,
  Conversation,
  ConversationPriority,
  FolderKey,
  Message,
  QueueKey,
  QuickReply,
  Workspace,
  WhatsAppNumber,
  SlaStatus
} from "./types";
import type { Automation, Template, TemplateCategory } from "./types";

const routingForTags = (tags: string[]): QueueKey => {
  const normalized = tags.map((tag) => tag.toLowerCase());
  if (normalized.some((tag) => tag.includes("ventas"))) return "ventas";
  if (normalized.some((tag) => tag.includes("pago") || tag.includes("factura"))) return "compras";
  if (normalized.some((tag) => tag.includes("resultados"))) return "clinico";
  if (normalized.some((tag) => tag.includes("ocupacional"))) return "ocupacional";
  return "soporte";
};

const priorityFor = (tags: string[], slaStatus: SlaStatus): ConversationPriority => {
  const normalized = tags.map((tag) => tag.toLowerCase());
  if (slaStatus === "risk" || normalized.some((tag) => tag.includes("urgente"))) return "urgent";
  return "normal";
};

export const folderOrder: FolderKey[] = [
  "Nuevos",
  "En Atención",
  "Ventas",
  "Soporte",
  "Salud Ocupacional",
  "Automatizados",
  "Cerrados"
];

export const workspaces: Workspace[] = [
  { id: "ws-starmedical", name: "StarMedical", slug: "starmedical", brandAccent: "#4aa59c" },
  { id: "ws-droneallen", name: "DroneAllen", slug: "droneallen", brandAccent: "#4aadf5" },
  { id: "ws-allenmkt", name: "AllenMKT", slug: "allenmkt", brandAccent: "#2e75ba" }
];

export const numbers: WhatsAppNumber[] = [
  { id: "num-sta-ventas", workspaceId: "ws-starmedical", label: "Ventas GT", e164: "+50230100100", isDefault: true },
  { id: "num-sta-soporte", workspaceId: "ws-starmedical", label: "Soporte Clínico", e164: "+50230100110", isDefault: false },
  { id: "num-sta-ocupacional", workspaceId: "ws-starmedical", label: "Salud Ocupacional", e164: "+50230100120", isDefault: false },
  { id: "num-dro-ventas", workspaceId: "ws-droneallen", label: "Ventas UAV", e164: "+50250100200", isDefault: true },
  { id: "num-dro-soporte", workspaceId: "ws-droneallen", label: "Soporte Técnico", e164: "+50250100210", isDefault: false },
  { id: "num-mkt-leads", workspaceId: "ws-allenmkt", label: "Leads MKT", e164: "+50260100300", isDefault: true }
];

export const agents: Agent[] = [
  { id: "agent-ana", name: "Ana Morales", role: "Coordinadora clínica", initials: "AM", color: "#4aa59c" },
  { id: "agent-carlos", name: "Carlos Méndez", role: "Ejecutivo de ventas", initials: "CM", color: "#2e75ba" },
  { id: "agent-valeria", name: "Valeria Ruiz", role: "Soporte omnicanal", initials: "VR", color: "#4aadf5" },
  { id: "agent-ramiro", name: "Ramiro Paredes", role: "Compras / Facturación", initials: "RP", color: "#0ea5e9" },
  { id: "agent-luis", name: "Luis Ortega", role: "Salud ocupacional", initials: "LO", color: "#0b1f3a" }
];

export const initialContacts: Contact[] = [
  {
    id: "c1",
    name: "Lucía Fernández",
    phone: "+502 3456 7810",
    companyName: "StarMedical GT",
    type: "paciente",
    consent: "granted",
    membership: "Membresía Platino",
    insurance: "Seguros G&T",
    labels: ["VIP", "Control"],
    notes: "Prefiere citas matutinas y confirmación por WhatsApp.",
    flags: { isPatient: true, isVip: true, hasMembership: true }
  },
  {
    id: "c2",
    name: "Carlos Vega",
    phone: "+502 3344 0778",
    companyName: "Industrias La Reforma",
    type: "empresa",
    consent: "pending",
    membership: "Plan Corporativo",
    insurance: "Seguros La Reforma",
    labels: ["Empresarial", "Documentos"],
    notes: "Solicita orden firmada el mismo día.",
    flags: { isPatient: false, isVip: false, hasMembership: true }
  },
  {
    id: "c3",
    name: "Mariana Ruiz",
    phone: "+502 5566 2011",
    companyName: "Grupo Cayalá",
    type: "paciente",
    consent: "granted",
    membership: "Paquete Ejecutivo",
    insurance: "ASSA",
    labels: ["Ventas", "Seguimiento"],
    notes: "Interesada en paquete ejecutivo, pide PDF.",
    flags: { isPatient: true, isVip: false, hasMembership: true }
  },
  {
    id: "c4",
    name: "Andrés Soto",
    phone: "+502 4477 1201",
    companyName: "Alfa Soporte GT",
    type: "lead",
    consent: "pending",
    membership: undefined,
    insurance: undefined,
    labels: ["Resultados", "Soporte"],
    notes: "Prefiere que envíen resultados en PDF.",
    flags: { isPatient: false, isVip: false, hasMembership: false }
  },
  {
    id: "c5",
    name: "Paola Díaz",
    phone: "+502 5412 0098",
    companyName: "Wellness GT",
    type: "paciente",
    consent: "granted",
    membership: "Plan Familiar",
    insurance: "Seguro La Ceiba",
    labels: ["Ventas", "Familia"],
    notes: "Quiere coberturas pediátricas; contacto confiable.",
    flags: { isPatient: true, isVip: true, hasMembership: true }
  },
  {
    id: "c6",
    name: "Diego Morales",
    phone: "+502 4211 9090",
    companyName: "Construtec Centroamérica",
    type: "empresa",
    consent: "granted",
    membership: "Contrato Ocupacional",
    insurance: "Mapfre Empresas",
    labels: ["Ocupacional", "Empresa"],
    notes: "12 evaluaciones pendientes, prefiere jueves/viernes.",
    flags: { isPatient: false, isVip: false, hasMembership: true }
  },
  {
    id: "c7",
    name: "Renata Campos",
    phone: "+502 5123 4400",
    companyName: "Future Labs GT",
    type: "lead",
    consent: "pending",
    membership: undefined,
    insurance: undefined,
    labels: ["Bot", "Automatizado"],
    notes: "Usa chatbot, espera demo y handoff a ejecutivo.",
    flags: { isPatient: false, isVip: false, hasMembership: false }
  },
  {
    id: "c8",
    name: "Sergio Paredes",
    phone: "+502 3201 6501",
    companyName: "Logística Marítima",
    type: "paciente",
    consent: "denied",
    membership: undefined,
    insurance: "Seguro ProVida",
    labels: ["Follow-up"],
    notes: "Cerró caso pero quiere recordatorios por correo.",
    flags: { isPatient: true, isVip: false, hasMembership: false }
  },
  {
    id: "c9",
    name: "Natalia Quispe",
    phone: "+502 3012 3443",
    companyName: "BioHealth GT",
    type: "paciente",
    consent: "pending",
    membership: "Plan Preventivo",
    insurance: "ASSA",
    labels: ["Urgente", "Reagenda"],
    notes: "Pide reagendar temprano; sensitiva a tiempos de respuesta.",
    flags: { isPatient: true, isVip: false, hasMembership: true }
  },
  {
    id: "c10",
    name: "Luis Cabrera",
    phone: "+502 3010 0222",
    companyName: "RetailMax Guatemala",
    type: "empresa",
    consent: "granted",
    membership: undefined,
    insurance: "GNP",
    labels: ["Pagos", "Factura"],
    notes: "Requiere comprobantes y facturas sin errores.",
    flags: { isPatient: false, isVip: false, hasMembership: false }
  }
];

export const initialConversations: Conversation[] = [
  {
    id: "conv-1",
    folder: "Nuevos",
    workspaceId: "ws-starmedical",
    numberId: "num-sta-ventas",
    contactId: "c1",
    lastMessage: "Me gustaría agendar un control preventivo.",
    updatedAt: "2024-05-10T13:05:00Z",
    tags: ["Lead", "Control", "Resultados"],
    slaStatus: "ok",
    assignedUserIds: ["agent-ana"],
    queueKey: routingForTags(["Lead", "Control", "Resultados"]),
    priority: priorityFor(["Lead", "Control", "Resultados"], "ok"),
    unreadCount: 2
  },
  {
    id: "conv-2",
    folder: "En Atención",
    workspaceId: "ws-starmedical",
    numberId: "num-sta-soporte",
    contactId: "c2",
    lastMessage: "¿Pueden enviarme la orden firmada hoy?",
    updatedAt: "2024-05-10T12:50:00Z",
    tags: ["Empresarial", "Documentos", "Pagos"],
    slaStatus: "warning",
    assignedUserIds: ["agent-ramiro"],
    queueKey: routingForTags(["Empresarial", "Documentos", "Pagos"]),
    priority: priorityFor(["Empresarial", "Documentos", "Pagos"], "warning"),
    unreadCount: 1
  },
  {
    id: "conv-3",
    folder: "Ventas",
    workspaceId: "ws-starmedical",
    numberId: "num-sta-ventas",
    contactId: "c3",
    lastMessage: "Quiero confirmar precios del paquete ejecutivo.",
    updatedAt: "2024-05-10T12:20:00Z",
    tags: ["Ventas", "Cotización", "Paquete"],
    slaStatus: "ok",
    assignedUserIds: ["agent-carlos"],
    queueKey: routingForTags(["Ventas", "Cotización", "Paquete"]),
    priority: priorityFor(["Ventas", "Cotización", "Paquete"], "ok"),
    unreadCount: 1
  },
  {
    id: "conv-4",
    folder: "Soporte",
    workspaceId: "ws-droneallen",
    numberId: "num-dro-soporte",
    contactId: "c4",
    lastMessage: "El enlace de resultados no funciona.",
    updatedAt: "2024-05-10T11:55:00Z",
    tags: ["Soporte", "Resultados"],
    slaStatus: "warning",
    assignedUserIds: ["agent-valeria"],
    queueKey: routingForTags(["Soporte", "Resultados"]),
    priority: priorityFor(["Soporte", "Resultados"], "warning"),
    unreadCount: 0
  },
  {
    id: "conv-5",
    folder: "Salud Ocupacional",
    workspaceId: "ws-starmedical",
    numberId: "num-sta-ocupacional",
    contactId: "c6",
    lastMessage: "Tenemos 12 evaluaciones pendientes esta semana.",
    updatedAt: "2024-05-10T11:20:00Z",
    tags: ["Ocupacional", "Empresa"],
    slaStatus: "ok",
    assignedUserIds: ["agent-luis"],
    queueKey: routingForTags(["Ocupacional", "Empresa"]),
    priority: priorityFor(["Ocupacional", "Empresa"], "ok"),
    unreadCount: 1
  },
  {
    id: "conv-6",
    folder: "Automatizados",
    workspaceId: "ws-allenmkt",
    numberId: "num-mkt-leads",
    contactId: "c7",
    lastMessage: "Workflow: Derivar a ejecutivo después del saludo.",
    updatedAt: "2024-05-10T10:45:00Z",
    tags: ["Bot", "Flujo"],
    slaStatus: "ok",
    assignedUserIds: [],
    queueKey: routingForTags(["Bot", "Flujo"]),
    priority: priorityFor(["Bot", "Flujo"], "ok"),
    unreadCount: 0
  },
  {
    id: "conv-7",
    folder: "Cerrados",
    workspaceId: "ws-starmedical",
    numberId: "num-sta-ventas",
    contactId: "c8",
    lastMessage: "Gracias por el seguimiento, todo ok.",
    updatedAt: "2024-05-09T18:20:00Z",
    tags: ["Cerrado"],
    slaStatus: "ok",
    assignedUserIds: [],
    queueKey: routingForTags(["Cerrado"]),
    priority: priorityFor(["Cerrado"], "ok"),
    unreadCount: 0
  },
  {
    id: "conv-8",
    folder: "En Atención",
    workspaceId: "ws-starmedical",
    numberId: "num-sta-ventas",
    contactId: "c5",
    lastMessage: "Tengo dudas del plan familiar.",
    updatedAt: "2024-05-10T12:10:00Z",
    tags: ["Ventas", "Familia"],
    slaStatus: "ok",
    assignedUserIds: ["agent-ana", "agent-carlos"],
    queueKey: routingForTags(["Ventas", "Familia"]),
    priority: priorityFor(["Ventas", "Familia"], "ok"),
    unreadCount: 3
  },
  {
    id: "conv-9",
    folder: "Nuevos",
    workspaceId: "ws-droneallen",
    numberId: "num-dro-ventas",
    contactId: "c9",
    lastMessage: "Necesito reagendar para mañana temprano.",
    updatedAt: "2024-05-10T13:15:00Z",
    tags: ["Reagenda", "Urgente", "Resultados"],
    slaStatus: "risk",
    assignedUserIds: ["agent-valeria"],
    queueKey: routingForTags(["Reagenda", "Urgente", "Resultados"]),
    priority: priorityFor(["Reagenda", "Urgente", "Resultados"], "risk"),
    unreadCount: 2
  },
  {
    id: "conv-10",
    folder: "Soporte",
    workspaceId: "ws-starmedical",
    numberId: "num-sta-soporte",
    contactId: "c10",
    lastMessage: "No recibí el comprobante de pago.",
    updatedAt: "2024-05-10T10:05:00Z",
    tags: ["Pagos", "Soporte", "Factura"],
    slaStatus: "warning",
    assignedUserIds: ["agent-ramiro"],
    queueKey: routingForTags(["Pagos", "Soporte", "Factura"]),
    priority: priorityFor(["Pagos", "Soporte", "Factura"], "warning"),
    unreadCount: 1
  },
  {
    id: "conv-11",
    folder: "Ventas",
    workspaceId: "ws-allenmkt",
    numberId: "num-mkt-leads",
    contactId: "c2",
    lastMessage: "Quiero un paquete para 5 cuentas publicitarias.",
    updatedAt: "2024-05-10T09:30:00Z",
    tags: ["Leads", "Upsell", "Ventas"],
    slaStatus: "ok",
    assignedUserIds: ["agent-carlos"],
    queueKey: routingForTags(["Leads", "Upsell", "Ventas"]),
    priority: priorityFor(["Leads", "Upsell", "Ventas"], "ok"),
    unreadCount: 0
  },
  {
    id: "conv-12",
    folder: "Automatizados",
    workspaceId: "ws-droneallen",
    numberId: "num-dro-ventas",
    contactId: "c3",
    lastMessage: "Chatbot: enviar demo de vuelo autónomo.",
    updatedAt: "2024-05-10T08:55:00Z",
    tags: ["Bot", "Demo"],
    slaStatus: "ok",
    assignedUserIds: [],
    queueKey: routingForTags(["Bot", "Demo"]),
    priority: priorityFor(["Bot", "Demo"], "ok"),
    unreadCount: 0
  }
];

export const initialMessages: Message[] = [
  { id: "m1", conversationId: "conv-1", direction: "in", text: "Hola, me gustaría agendar un control preventivo.", createdAt: "2024-05-10T12:55:00Z", status: "read" },
  { id: "m2", conversationId: "conv-1", direction: "out", text: "Hola Lucía, claro que sí. ¿Te funciona mañana a las 9am en la sede Zona 10?", createdAt: "2024-05-10T13:00:00Z", status: "delivered" },
  { id: "m3", conversationId: "conv-1", direction: "in", text: "Perfecto, por favor confírmenme la hora.", createdAt: "2024-05-10T13:05:00Z", status: "read" },
  { id: "m4", conversationId: "conv-2", direction: "in", text: "¿Pueden enviarme la orden firmada hoy? La necesitamos para ingreso.", createdAt: "2024-05-10T12:50:00Z", status: "read" },
  { id: "m5", conversationId: "conv-2", direction: "out", text: "Claro, Carlos. Estoy validando con el médico ocupacional y te la comparto en minutos.", createdAt: "2024-05-10T12:52:00Z", status: "sent" },
  { id: "m6", conversationId: "conv-3", direction: "in", text: "Quiero confirmar precios del paquete ejecutivo con 8 atenciones.", createdAt: "2024-05-10T12:20:00Z", status: "delivered" },
  { id: "m7", conversationId: "conv-3", direction: "out", text: "Con gusto, Mariana. El paquete ejecutivo está en Q 1,850 e incluye chequeo completo.", createdAt: "2024-05-10T12:28:00Z", status: "sent" },
  { id: "m8", conversationId: "conv-4", direction: "in", text: "El enlace de resultados no funciona, ¿pueden revisarlo?", createdAt: "2024-05-10T11:55:00Z", status: "read" },
  { id: "m9", conversationId: "conv-4", direction: "out", text: "Estamos verificando, Andrés. Te comparto un PDF directo en unos minutos.", createdAt: "2024-05-10T12:00:00Z", status: "sent" },
  { id: "m10", conversationId: "conv-5", direction: "in", text: "Tenemos 12 evaluaciones pendientes esta semana. ¿Hay disponibilidad?", createdAt: "2024-05-10T11:20:00Z", status: "delivered" },
  { id: "m11", conversationId: "conv-5", direction: "out", text: "Sí, Diego. Podemos agendar 6 jueves y 6 viernes en la mañana en Mixco y Zona 4.", createdAt: "2024-05-10T11:25:00Z", status: "sent" },
  { id: "m12", conversationId: "conv-6", direction: "in", text: "Workflow: Derivar a ejecutivo después del saludo.", createdAt: "2024-05-10T10:45:00Z", status: "delivered" },
  { id: "m13", conversationId: "conv-6", direction: "out", text: "Recibido, ajustamos el flujo y probamos hoy.", createdAt: "2024-05-10T10:47:00Z", status: "sent" },
  { id: "m14", conversationId: "conv-7", direction: "out", text: "Quedamos atentos para próximas campañas. Gracias por el seguimiento.", createdAt: "2024-05-09T18:20:00Z", status: "read" },
  { id: "m15", conversationId: "conv-8", direction: "in", text: "Tengo dudas del plan familiar, ¿cubre pediatría?", createdAt: "2024-05-10T12:10:00Z", status: "delivered" },
  { id: "m16", conversationId: "conv-8", direction: "out", text: "Hola Paola, sí, incluye 2 controles pediátricos al año en la sede Carretera a El Salvador.", createdAt: "2024-05-10T12:13:00Z", status: "sent" },
  { id: "m17", conversationId: "conv-9", direction: "in", text: "Necesito reagendar para mañana temprano, por favor.", createdAt: "2024-05-10T13:15:00Z", status: "read" },
  { id: "m18", conversationId: "conv-9", direction: "out", text: "Lo veo ahora mismo, Natalia. Te confirmo en 5 minutos.", createdAt: "2024-05-10T13:16:00Z", status: "sent" },
  { id: "m19", conversationId: "conv-10", direction: "in", text: "No recibí el comprobante de pago.", createdAt: "2024-05-10T10:05:00Z", status: "delivered" },
  { id: "m20", conversationId: "conv-10", direction: "out", text: "Te lo reenvío ahora mismo, Luis.", createdAt: "2024-05-10T10:07:00Z", status: "sent" },
  { id: "m21", conversationId: "conv-11", direction: "in", text: "Busco un paquete para 5 cuentas publicitarias y reportes mensuales.", createdAt: "2024-05-10T09:30:00Z", status: "delivered" },
  { id: "m22", conversationId: "conv-11", direction: "out", text: "Tenemos un bundle en Q 4,200 que incluye reportes y dashboard semanal.", createdAt: "2024-05-10T09:35:00Z", status: "sent" },
  { id: "m23", conversationId: "conv-12", direction: "in", text: "Chatbot: enviar demo de vuelo autónomo.", createdAt: "2024-05-10T08:55:00Z", status: "delivered" },
  { id: "m24", conversationId: "conv-12", direction: "out", text: "Compartiendo demo y agendando piloto en Mixco Tech Park.", createdAt: "2024-05-10T08:57:00Z", status: "sent" }
];

export const quickReplyTemplates: QuickReply[] = [
  {
    id: "qr-1",
    label: "Confirmar cita",
    text: "Hola {{nombre}}, confirmamos tu cita en {{sede}} el {{fecha_cita}}. Si necesitas reprogramar, avísanos."
  },
  {
    id: "qr-2",
    label: "Enviar indicaciones",
    text: "Te comparto las indicaciones: ayuno 8 horas, llegar 15 minutos antes y llevar documento de identidad."
  },
  {
    id: "qr-3",
    label: "Seguimiento post-consulta",
    text: "Hola {{nombre}}, ¿cómo sigues después de tu cita en {{sede}}? Podemos coordinar un control si lo requieres."
  },
  {
    id: "qr-4",
    label: "Compartir catálogo",
    text: "Te dejo nuestro catálogo digital y paquetes corporativos. ¿Quieres que un ejecutivo te llame hoy?"
  }
];

export const templateCategories: TemplateCategory[] = ["Clínico", "Ventas", "Empresas", "Seguimiento", "Urgencias", "Laboratorio"];

export const templates: Template[] = [
  {
    id: "tpl-welcome-hours",
    name: "Bienvenida + Derivación por horario",
    description: "Saluda y deriva según horario laboral a equipos o bot de guardia.",
    trigger: "Mensaje entrante",
    category: "Clínico",
    steps: [
      "Detectar horario laboral",
      "Enviar saludo personalizado",
      "Derivar a ejecutivo o bot de guardia",
      "Registrar etiqueta: bienvenida"
    ]
  },
  {
    id: "tpl-reminder",
    name: "Recordatorio de cita",
    description: "Envía recordatorio previo a la cita con confirmación rápida.",
    trigger: "Horario",
    category: "Seguimiento",
    steps: [
      "Consultar agenda",
      "Enviar recordatorio con fecha/hora",
      "Solicitar confirmación",
      "Escalar a agente si responde 'reprogramar'"
    ]
  },
  {
    id: "tpl-followup",
    name: "Seguimiento post-consulta",
    description: "Pide feedback y ofrece control si detecta malestar.",
    trigger: "Mensaje programado",
    category: "Seguimiento",
    steps: [
      "Enviar encuesta corta",
      "Detectar palabras clave de malestar",
      "Ofrecer control o llamada",
      "Registrar satisfacción"
    ]
  },
  {
    id: "tpl-quote",
    name: "Cotización automática",
    description: "Entrega precios base y deriva a ventas si hay interés.",
    trigger: "Mensaje entrante",
    category: "Ventas",
    steps: [
      "Detectar intención de compra",
      "Enviar catálogo abreviado",
      "Solicitar datos de contacto",
      "Asignar a ejecutivo de ventas"
    ]
  },
  {
    id: "tpl-enterprise",
    name: "Derivación empresa → ejecutivo",
    description: "Clasifica leads corporativos y asigna a ejecutivo B2B.",
    trigger: "Formulario / palabra clave",
    category: "Empresas",
    steps: [
      "Identificar empresa y tamaño",
      "Asignar ejecutivo ocupacional",
      "Programar llamada",
      "Crear ticket en CRM"
    ]
  },
  {
    id: "tpl-offhours",
    name: "Mensaje fuera de horario",
    description: "Responde fuera de horario y agenda seguimiento al abrir.",
    trigger: "Mensaje fuera de horario",
    category: "Urgencias",
    steps: [
      "Detectar que está fuera de horario",
      "Enviar mensaje de contención",
      "Derivar a guardia/urgencias si aplica",
      "Crear tarea para primera hora"
    ]
  }
];

export const initialAutomations: Automation[] = [
  {
    id: "auto-1",
    name: "Recordatorio de cita - Zona 10",
    status: "active",
    trigger: "Horario (24h antes)",
    action: "Enviar recordatorio",
    workspaceId: "ws-starmedical",
    numberId: "num-sta-ventas",
    templateId: "tpl-reminder",
    steps: ["Consultar agenda", "Enviar recordatorio", "Solicitar confirmación"],
    message: "Recordatorio: tienes una cita en {{sede}} el {{fecha}}. Responde 1 para confirmar.",
    schedule: "Todos los días 08:00",
    tags: ["recordatorio", "cita"],
    assignment: "Agenda"
  },
  {
    id: "auto-2",
    name: "Cotización automática - DroneAllen",
    status: "paused",
    trigger: "Mensaje entrante",
    action: "Enviar catálogo UAV",
    workspaceId: "ws-droneallen",
    numberId: "num-dro-ventas",
    templateId: "tpl-quote",
    steps: ["Detectar intención", "Enviar catálogo", "Solicitar datos", "Asignar ejecutivo"],
    message: "Gracias por tu interés. Aquí tienes los paquetes UAV. ¿Quieres que te llame un ejecutivo?",
    schedule: "Siempre activo",
    tags: ["ventas", "uav"],
    assignment: "Ventas UAV"
  },
  {
    id: "auto-3",
    name: "Seguimiento post-consulta",
    status: "active",
    trigger: "Mensaje programado",
    action: "Enviar encuesta y ofrecer control",
    workspaceId: "ws-starmedical",
    numberId: "num-sta-soporte",
    templateId: "tpl-followup",
    steps: ["Enviar encuesta", "Detectar malestar", "Ofrecer control"],
    message: "¿Cómo te sientes después de tu consulta? Responde 1 bien, 2 regular, 3 mal.",
    schedule: "18:00 diario",
    tags: ["seguimiento", "paciente"],
    assignment: "Soporte clínico"
  }
];
