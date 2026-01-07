import { PacienteAgenda } from "@/lib/types/agenda";

export const pacientesMock: PacienteAgenda[] = [
  { id: "p1", nombre: "Ana", apellidos: "Torres", telefono: "5555-3030", dpi: "1234567890101", fechaNacimiento: "1990-03-12", sexo: "F", celular: "50255553030" },
  { id: "p2", nombre: "Carlos", apellidos: "Pérez", telefono: "5555-2020", dpi: "1098765432109", fechaNacimiento: "1985-07-02", sexo: "M", celular: "50255552020" },
  { id: "p3", nombre: "Lucía", apellidos: "Gómez", telefono: "5555-9090", dpi: "5678901234567", fechaNacimiento: "1995-11-23", sexo: "F", celular: "50255559090" }
];
