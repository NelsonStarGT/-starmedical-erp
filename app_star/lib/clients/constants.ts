import { ClientProfileType } from "@prisma/client";

export const CLIENT_TYPE_LABELS: Record<ClientProfileType, string> = {
  PERSON: "Persona",
  COMPANY: "Empresa",
  INSTITUTION: "Institución",
  INSURER: "Aseguradora"
};

export const CLIENT_TYPE_PLURAL: Record<ClientProfileType, string> = {
  PERSON: "Personas",
  COMPANY: "Empresas",
  INSTITUTION: "Instituciones",
  INSURER: "Aseguradoras"
};
