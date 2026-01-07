import { HorarioMedico } from "@/lib/types/agenda";

export const horariosMock: HorarioMedico[] = [
  {
    id: "h1",
    medicoId: "m1",
    sucursalId: "s1",
    diasSemana: ["Lunes", "Miércoles", "Viernes"],
    bloques: [
      { inicio: "08:00", fin: "12:00" },
      { inicio: "14:00", fin: "18:00" }
    ]
  },
  {
    id: "h2",
    medicoId: "m2",
    sucursalId: "s1",
    diasSemana: ["Martes", "Jueves"],
    bloques: [
      { inicio: "09:00", fin: "13:00" },
      { inicio: "15:00", fin: "17:00" }
    ]
  },
  {
    id: "h3",
    medicoId: "m3",
    sucursalId: "s2",
    diasSemana: ["Lunes", "Martes", "Jueves"],
    bloques: [{ inicio: "08:00", fin: "12:00" }]
  }
];
