export type EstadoCita =
  | "Programada"
  | "Confirmada"
  | "En sala"
  | "Atendida"
  | "No se presentó"
  | "Cancelada";

export type EstadoPagoCita = "Pagado" | "Pendiente" | "Facturado";

export interface Cita {
  id: string;
  fecha: string; // '2025-12-09'
  horaInicio: string; // '14:30'
  horaFin: string; // '15:00'
  pacienteId: string;
  medicoId: string;
  sucursalId: string;
  salaId?: string;
  tipoCitaId: string;
  estado: EstadoCita;
  empresaId?: string;
  notas?: string;
  origen?: "Telefono" | "WhatsApp" | "Web" | "Walk-in" | "Empresa";
  estadoPago?: EstadoPagoCita;
  pacienteRecurrente?: boolean;
  creadoPor: string;
  fechaCreacion: string; // ISO
  ultimaActualizacion: string; // ISO
}

export interface PacienteAgenda {
  id: string;
  nombre: string;
  apellidos?: string;
  telefono?: string;
  dpi?: string;
  fechaNacimiento?: string;
  sexo?: "M" | "F" | "Otro";
  celular?: string;
}

export interface MedicoAgenda {
  id: string;
  nombre: string;
  especialidad?: string;
}

export interface SucursalAgenda {
  id: string;
  nombre: string;
  ciudad?: string;
}

export interface EmpresaAgenda {
  id: string;
  nombre: string;
}

export interface TipoCita {
  id: string;
  nombre: string;
  descripcion?: string;
  duracionMinutos: number;
  color?: string;
  estado: "Activo" | "Inactivo";
  disponibilidad?: {
    dias: string[];
    bloques: { inicio: string; fin: string }[];
  };
}

export interface SalaAgenda {
  id: string;
  nombre: string;
  sucursalId: string;
  tipoRecurso: string;
  estado: "Activo" | "Inactivo";
}

export interface HorarioMedico {
  id: string;
  medicoId: string;
  sucursalId: string;
  diasSemana: string[]; // ["Lunes","Martes"]
  bloques: { inicio: string; fin: string }[];
}

export type RolUsuarioAgenda = "Administrador" | "Recepcion" | "Especialista";
