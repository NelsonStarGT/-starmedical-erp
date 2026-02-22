import type { Contact, ConsentStatus, ContactType } from "@/app/ops/whatsapp/types";

export type ErpContact = {
  id_cliente: string;
  nombre: string;
  telefono: string;
  empresa?: string;
  tipo: ContactType;
  consentimiento: ConsentStatus;
  membresia?: string;
  seguro?: string;
  etiquetas?: string[];
  notas?: string;
};

const mockErpContacts: ErpContact[] = [
  {
    id_cliente: "erp-1001",
    nombre: "Andrea Salazar",
    telefono: "+502 5555 1001",
    empresa: "StarMedical GT",
    tipo: "paciente",
    consentimiento: "granted",
    membresia: "Membresía Oro",
    seguro: "Seguros G&T",
    etiquetas: ["Clínico", "Control"],
    notas: "Prefiere sede Zona 10."
  },
  {
    id_cliente: "erp-1002",
    nombre: "Corporación Vida Sana",
    telefono: "+502 5555 1002",
    empresa: "Vida Sana",
    tipo: "empresa",
    consentimiento: "pending",
    membresia: "Contrato Corporativo",
    seguro: "Mapfre Empresas",
    etiquetas: ["Empresa", "Ocupacional"],
    notas: "Solicitan reportes mensuales consolidado."
  },
  {
    id_cliente: "erp-1003",
    nombre: "Jorge Méndez",
    telefono: "+502 5555 1003",
    empresa: "Lead Online",
    tipo: "lead",
    consentimiento: "pending",
    etiquetas: ["Leads", "Marketing"],
    notas: "Entró por campaña digital, sin membresía."
  }
];

export async function fetchContactsFromErp(): Promise<ErpContact[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockErpContacts), 300);
  });
}

export function mapErpContactToWhatsAppContact(source: ErpContact): Contact {
  const isPatient = source.tipo === "paciente";
  const hasMembership = Boolean(source.membresia);

  return {
    id: source.id_cliente,
    name: source.nombre,
    phone: source.telefono,
    companyName: source.empresa,
    type: source.tipo,
    consent: source.consentimiento,
    membership: source.membresia,
    insurance: source.seguro,
    labels: source.etiquetas ?? [],
    notes: source.notas ?? "",
    flags: {
      isPatient,
      isVip: false,
      hasMembership
    }
  };
}
