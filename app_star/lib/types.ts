// Users / RBAC naming contract:
// - Filters: jobRoleId (rol operativo), roleBaseKey (rol del sistema), branchId, status
// - Responses: roleBaseKeys (array RBAC), profile.jobRole { id, name }
export type UserStatus = "Activo" | "Inactivo" | "Suspendido";

export type RoleType = "Clínico" | "Administrativo" | "Soporte";

export interface Role {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo: RoleType;
  estado: "Activo" | "Inactivo";
}

export interface Sucursal {
  id: number;
  nombre: string;
  codigo: string;
  ciudad: string;
  departamento: string;
  estado: "Activa" | "Inactiva";
}

export interface TipoContrato {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface TipoJornada {
  id: number;
  nombre: string;
}

export interface DocumentoDefinicion {
  id: number;
  nombre: string;
  obligatorio: boolean;
  requiereVencimiento: boolean;
}

export interface DocumentoUsuario {
  documentoId: number;
  archivo?: string;
  archivoNombre?: string;
  fechaVencimiento?: string;
  estado?: "Vigente" | "Por vencer" | "Vencido";
}

// Clientes
export type ClienteEstado = "Activo" | "Inactivo" | "En negociación";

export type TipoClienteValor = "Empresa" | "Persona" | "Institución";

export interface TipoCliente {
  id: number;
  nombreTipo: string;
  descripcion?: string;
  estado: "Activo" | "Inactivo";
}

export interface SectorIndustria {
  id: number;
  nombreSector: string;
  descripcion?: string;
  estado: "Activo" | "Inactivo";
}

export interface TipoRelacionComercial {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface CondicionPago {
  id: number;
  nombreCondicion: string;
  descripcion?: string;
}

export interface DocumentoClienteDefinicion {
  id: number;
  nombreDocumento: string;
  aplicaA: "Empresa" | "Persona" | "Institución" | "Todos";
  esObligatorio: boolean;
  tieneVencimiento: boolean;
}

export interface DocumentoCliente {
  documentoId: number;
  archivo?: string;
  archivoNombre?: string;
  fechaVencimiento?: string;
}

export interface NotaCliente {
  id: number;
  fecha: string;
  usuario: string;
  texto: string;
}

export interface ContactoCliente {
  rol: "Representante ventas" | "Gerente ventas" | "Cuentas por cobrar" | "Finanzas" | "Facturación" | "Contabilidad";
  nombre?: string;
  telefono?: string;
  correo?: string;
}

export interface ReferenciaComercial {
  id: number;
  nombre: string;
  apellido?: string;
  empresa?: string;
  telefono?: string;
}

export interface EmpleadoCliente {
  id: number;
  nombre: string;
  dpi?: string;
  puesto?: string;
  telefono?: string;
  seguro?: string;
  estado?: "Activo" | "Inactivo";
}

export interface RelacionFamiliar {
  id: string;
  menorId: number;
  tutorId: number;
  tipoRelacion: "Padre" | "Madre" | "Encargado" | "Tutor legal";
  fechaAsignacion: Date;
}

export interface Cliente {
  id: number;
  tipoCliente: TipoClienteValor;
  empresaAsociadaId?: number;
  institucionAsociadaId?: number;
  nombreComercial?: string;
  razonSocial?: string;
  nombreCompleto?: string;
  primerNombre?: string;
  segundoNombre?: string;
  tercerNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  apellidoCasada?: string;
  fechaNacimiento?: string;
  sexo?: string;
  estadoCivil?: string;
  nacionalidad?: string;
  ocupacion?: string;
  lugarTrabajo?: string;
  telefono?: string;
  tipoSanguineo?: string;
  seguroId?: number;
  nit?: string;
  fotoUrl?: string;
  codigoInternoCliente?: string;
  estadoCliente: ClienteEstado;
  sectorIndustriaId: number;
  sitioWeb?: string;
  emailCorporativo?: string;
  telefonoCorporativo?: string;
  direccionFiscal?: string;
  direccionComercial?: string;
  notificacionesWhatsApp?: boolean;
  notificacionesEmail?: boolean;
  observacionesGenerales?: string;

  contactoPrincipalNombre?: string;
  contactoPrincipalCargo?: string;
  contactoPrincipalCorreo?: string;
  contactoPrincipalTelefono?: string;
  contactosSecundarios?: ContactoCliente[];

  pais?: string;
  departamento?: string;
  municipio?: string;
  ciudad?: string;
  codigoPostal?: string;
  direccionesOperacion?: string[];
  direccionCompleta?: string;
  numeroExterior?: string;
  numeroInterior?: string;

  tipoRelacionComercialId?: number;
  fechaInicioRelacion?: string;
  fechaFinRelacion?: string;
  condicionesPagoId?: number;
  limiteCredito?: number;
  sucursalesAtendidas?: string[];
  listaServiciosContratados?: string[];

  documentos?: DocumentoCliente[];
  notas?: NotaCliente[];
  referencias?: ReferenciaComercial[];
  representanteLegal?: string;
  dpiRepresentante?: string;
  patenteComercio?: string;
  empleados?: EmpleadoCliente[];
}

export interface Usuario {
  id: number;
  primerNombre: string;
  segundoNombre?: string;
  tercerNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  apellidoCasada?: string;
  fechaNacimiento?: string;
  identificacion?: string;
  celular?: string;
  correo: string;
  estadoCivil?: string;
  sexo?: string;
  fotoUrl?: string;
  rolOperativoId: number;
  rolesSistema?: string[];
  sucursalId: number;
  tipoUsuario: RoleType;
  estado: UserStatus;
  profesion?: string;
  tituloAcademico?: string;
  lugarEstudios?: string;
  numeroColegiado?: string;
  fechaInicioEstudios?: string;
  fechaFinEstudios?: string;
  comentariosAcademicos?: string;
  puesto?: string;
  salarioBase?: number;
  bonificacion?: number;
  tipoPago?: string;
  tipoJornadaId?: number;
  tipoContratoId: number;
  fechaInicioLabores?: string;
  fechaFinLabores?: string;
  direccion?: string;
  pais?: string;
  departamento?: string;
  municipio?: string;
  ciudad?: string;
  codigoPostal?: string;
  numeroExterior?: string;
  numeroInterior?: string;
  documentos?: DocumentoUsuario[];
}
