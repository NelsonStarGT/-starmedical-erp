import { TipoCita } from "@/lib/types/agenda";

export const tiposCitaMock: TipoCita[] = [
  {
    id: "t1",
    nombre: "Consulta general",
    descripcion: "Atención médica general",
    duracionMinutos: 30,
    color: "#00ADEF",
    estado: "Activo",
    disponibilidad: { dias: ["Lunes", "Miércoles", "Viernes"], bloques: [{ inicio: "08:00", fin: "12:00" }] }
  },
  {
    id: "t2",
    nombre: "Rayos X",
    descripcion: "Estudios de Rayos X",
    duracionMinutos: 20,
    color: "#4AA59C",
    estado: "Activo",
    disponibilidad: { dias: ["Martes", "Jueves"], bloques: [{ inicio: "09:00", fin: "17:00" }] }
  },
  {
    id: "t3",
    nombre: "Ultrasonido",
    descripcion: "USG diagnóstico",
    duracionMinutos: 25,
    color: "#F59E0B",
    estado: "Activo",
    disponibilidad: { dias: ["Lunes", "Martes", "Jueves"], bloques: [{ inicio: "08:00", fin: "12:00" }] }
  }
];
