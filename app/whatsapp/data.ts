import { Contact, Conversation, FolderKey, Message, QuickReply } from "./types";

export const folderOrder: FolderKey[] = [
  "Nuevos",
  "En Atención",
  "Ventas",
  "Soporte",
  "Salud Ocupacional",
  "Automatizados",
  "Cerrados"
];

export const initialContacts: Contact[] = [
  {
    id: "c1",
    name: "Lucía Fernández",
    phone: "+502 3456 7810",
    companyName: "StarMedical GT",
    flags: { isPatient: true, isVip: true, hasMembership: true }
  },
  {
    id: "c2",
    name: "Carlos Vega",
    phone: "+502 3344 0778",
    companyName: "Industrias La Reforma",
    flags: { isPatient: true, isVip: false, hasMembership: true }
  },
  {
    id: "c3",
    name: "Mariana Ruiz",
    phone: "+502 5566 2011",
    companyName: "Grupo Cayalá",
    flags: { isPatient: true, isVip: false, hasMembership: false }
  },
  {
    id: "c4",
    name: "Andrés Soto",
    phone: "+502 4477 1201",
    companyName: "Alfa Soporte GT",
    flags: { isPatient: false, isVip: false, hasMembership: false }
  },
  {
    id: "c5",
    name: "Paola Díaz",
    phone: "+502 5412 0098",
    companyName: "Wellness GT",
    flags: { isPatient: true, isVip: true, hasMembership: false }
  },
  {
    id: "c6",
    name: "Diego Morales",
    phone: "+502 4211 9090",
    companyName: "Construtec Centroamérica",
    flags: { isPatient: true, isVip: false, hasMembership: true }
  },
  {
    id: "c7",
    name: "Renata Campos",
    phone: "+502 5123 4400",
    companyName: "Future Labs GT",
    flags: { isPatient: false, isVip: false, hasMembership: false }
  },
  {
    id: "c8",
    name: "Sergio Paredes",
    phone: "+502 3201 6501",
    companyName: "Logística Marítima",
    flags: { isPatient: true, isVip: false, hasMembership: false }
  },
  {
    id: "c9",
    name: "Natalia Quispe",
    phone: "+502 3012 3443",
    companyName: "BioHealth GT",
    flags: { isPatient: true, isVip: false, hasMembership: true }
  },
  {
    id: "c10",
    name: "Luis Cabrera",
    phone: "+502 3010 0222",
    companyName: "RetailMax Guatemala",
    flags: { isPatient: false, isVip: false, hasMembership: false }
  }
];

export const initialConversations: Conversation[] = [
  {
    id: "conv-1",
    folder: "Nuevos",
    contactId: "c1",
    lastMessage: "Me gustaría agendar un control preventivo.",
    updatedAt: "2024-05-10T13:05:00Z",
    tags: ["Lead", "Control"],
    slaStatus: "ok"
  },
  {
    id: "conv-2",
    folder: "En Atención",
    contactId: "c2",
    lastMessage: "¿Pueden enviarme la orden firmada hoy?",
    updatedAt: "2024-05-10T12:50:00Z",
    tags: ["Empresarial", "Documentos"],
    slaStatus: "warning"
  },
  {
    id: "conv-3",
    folder: "Ventas",
    contactId: "c3",
    lastMessage: "Quiero confirmar precios del paquete ejecutivo.",
    updatedAt: "2024-05-10T12:20:00Z",
    tags: ["Cotización", "Paquete"],
    slaStatus: "ok"
  },
  {
    id: "conv-4",
    folder: "Soporte",
    contactId: "c4",
    lastMessage: "El enlace de resultados no funciona.",
    updatedAt: "2024-05-10T11:55:00Z",
    tags: ["Soporte", "Resultados"],
    slaStatus: "warning"
  },
  {
    id: "conv-5",
    folder: "Salud Ocupacional",
    contactId: "c6",
    lastMessage: "Tenemos 12 evaluaciones pendientes esta semana.",
    updatedAt: "2024-05-10T11:20:00Z",
    tags: ["Ocupacional", "Empresa"],
    slaStatus: "ok"
  },
  {
    id: "conv-6",
    folder: "Automatizados",
    contactId: "c7",
    lastMessage: "Workflow: Derivar a ejecutivo después del saludo.",
    updatedAt: "2024-05-10T10:45:00Z",
    tags: ["Bot", "Flujo"],
    slaStatus: "ok"
  },
  {
    id: "conv-7",
    folder: "Cerrados",
    contactId: "c8",
    lastMessage: "Gracias por el seguimiento, todo ok.",
    updatedAt: "2024-05-09T18:20:00Z",
    tags: ["Cerrado"],
    slaStatus: "ok"
  },
  {
    id: "conv-8",
    folder: "En Atención",
    contactId: "c5",
    lastMessage: "Tengo dudas del plan familiar.",
    updatedAt: "2024-05-10T12:10:00Z",
    tags: ["Ventas", "Familia"],
    slaStatus: "ok"
  },
  {
    id: "conv-9",
    folder: "Nuevos",
    contactId: "c9",
    lastMessage: "Necesito reagendar para mañana temprano.",
    updatedAt: "2024-05-10T13:15:00Z",
    tags: ["Reagenda", "Urgente"],
    slaStatus: "risk"
  },
  {
    id: "conv-10",
    folder: "Soporte",
    contactId: "c10",
    lastMessage: "No recibí el comprobante de pago.",
    updatedAt: "2024-05-10T10:05:00Z",
    tags: ["Pagos", "Soporte"],
    slaStatus: "warning"
  }
];

export const initialMessages: Message[] = [
  {
    id: "m1",
    conversationId: "conv-1",
    direction: "in",
    text: "Hola, me gustaría agendar un control preventivo.",
    createdAt: "2024-05-10T12:55:00Z",
    status: "read"
  },
  {
    id: "m2",
    conversationId: "conv-1",
    direction: "out",
    text: "Hola Lucía, claro que sí. ¿Te funciona mañana a las 9am en la sede Zona 10?",
    createdAt: "2024-05-10T13:00:00Z",
    status: "delivered"
  },
  {
    id: "m3",
    conversationId: "conv-1",
    direction: "in",
    text: "Perfecto, por favor confírmenme la hora.",
    createdAt: "2024-05-10T13:05:00Z",
    status: "read"
  },

  {
    id: "m4",
    conversationId: "conv-2",
    direction: "in",
    text: "¿Pueden enviarme la orden firmada hoy? La necesitamos para ingreso.",
    createdAt: "2024-05-10T12:50:00Z",
    status: "read"
  },
  {
    id: "m5",
    conversationId: "conv-2",
    direction: "out",
    text: "Claro, Carlos. Estoy validando con el médico ocupacional y te la comparto en minutos.",
    createdAt: "2024-05-10T12:52:00Z",
    status: "sent"
  },

  {
    id: "m6",
    conversationId: "conv-3",
    direction: "in",
    text: "Quiero confirmar precios del paquete ejecutivo con 8 atenciones.",
    createdAt: "2024-05-10T12:20:00Z",
    status: "delivered"
  },
  {
    id: "m7",
    conversationId: "conv-3",
    direction: "out",
    text: "Con gusto, Mariana. El paquete ejecutivo está en Q 1,850 e incluye chequeo completo.",
    createdAt: "2024-05-10T12:28:00Z",
    status: "sent"
  },

  {
    id: "m8",
    conversationId: "conv-4",
    direction: "in",
    text: "El enlace de resultados no funciona, ¿pueden revisarlo?",
    createdAt: "2024-05-10T11:55:00Z",
    status: "read"
  },
  {
    id: "m9",
    conversationId: "conv-4",
    direction: "out",
    text: "Estamos verificando, Andrés. Te comparto un PDF directo en unos minutos.",
    createdAt: "2024-05-10T12:00:00Z",
    status: "sent"
  },

  {
    id: "m10",
    conversationId: "conv-5",
    direction: "in",
    text: "Tenemos 12 evaluaciones pendientes esta semana. ¿Hay disponibilidad?",
    createdAt: "2024-05-10T11:20:00Z",
    status: "delivered"
  },
  {
    id: "m11",
    conversationId: "conv-5",
    direction: "out",
    text: "Sí, Diego. Podemos agendar 6 jueves y 6 viernes en la mañana en Mixco y Zona 4.",
    createdAt: "2024-05-10T11:25:00Z",
    status: "sent"
  },

  {
    id: "m12",
    conversationId: "conv-6",
    direction: "in",
    text: "Workflow: Derivar a ejecutivo después del saludo.",
    createdAt: "2024-05-10T10:45:00Z",
    status: "delivered"
  },
  {
    id: "m13",
    conversationId: "conv-6",
    direction: "out",
    text: "Recibido, ajustamos el flujo y probamos hoy.",
    createdAt: "2024-05-10T10:47:00Z",
    status: "sent"
  },

  {
    id: "m14",
    conversationId: "conv-7",
    direction: "out",
    text: "Quedamos atentos para próximas campañas. Gracias por el seguimiento.",
    createdAt: "2024-05-09T18:20:00Z",
    status: "read"
  },

  {
    id: "m15",
    conversationId: "conv-8",
    direction: "in",
    text: "Tengo dudas del plan familiar, ¿cubre pediatría?",
    createdAt: "2024-05-10T12:10:00Z",
    status: "delivered"
  },
  {
    id: "m16",
    conversationId: "conv-8",
    direction: "out",
    text: "Hola Paola, sí, incluye 2 controles pediátricos al año en la sede Carretera a El Salvador.",
    createdAt: "2024-05-10T12:13:00Z",
    status: "sent"
  },

  {
    id: "m17",
    conversationId: "conv-9",
    direction: "in",
    text: "Necesito reagendar para mañana temprano, por favor.",
    createdAt: "2024-05-10T13:15:00Z",
    status: "read"
  },
  {
    id: "m18",
    conversationId: "conv-9",
    direction: "out",
    text: "Lo veo ahora mismo, Natalia. Te confirmo en 5 minutos.",
    createdAt: "2024-05-10T13:16:00Z",
    status: "sent"
  },

  {
    id: "m19",
    conversationId: "conv-10",
    direction: "in",
    text: "No recibí el comprobante de pago.",
    createdAt: "2024-05-10T10:05:00Z",
    status: "delivered"
  },
  {
    id: "m20",
    conversationId: "conv-10",
    direction: "out",
    text: "Te lo reenvío ahora mismo, Luis.",
    createdAt: "2024-05-10T10:07:00Z",
    status: "sent"
  }
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
