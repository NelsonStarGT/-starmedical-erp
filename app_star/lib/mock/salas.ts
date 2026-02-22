import { SalaAgenda } from "@/lib/types/agenda";

export const salasMock: SalaAgenda[] = [
  { id: "room1", nombre: "Consultorio 1", sucursalId: "s1", tipoRecurso: "Consultorio", estado: "Activo" },
  { id: "room2", nombre: "Sala Rayos X", sucursalId: "s1", tipoRecurso: "Rayos X", estado: "Activo" },
  { id: "room3", nombre: "Sala USG", sucursalId: "s2", tipoRecurso: "Ultrasonido", estado: "Activo" }
];
