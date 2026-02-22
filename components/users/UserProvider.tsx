'use client';

import React, { createContext, useContext, useMemo, useState } from "react";
import {
  DocumentoDefinicion,
  DocumentoUsuario,
  Role,
  RoleType,
  Sucursal,
  TipoContrato,
  TipoJornada,
  UserStatus,
  Usuario
} from "@/lib/types";

type UserContextValue = {
  usuarios: Usuario[];
  roles: Role[];
  rolesOperativos: Role[];
  sucursales: Sucursal[];
  tiposContrato: TipoContrato[];
  tiposJornada: TipoJornada[];
  documentosDef: DocumentoDefinicion[];
  addOrUpdateUsuario: (usuario: Usuario) => void;
  deactivateUsuario: (id: number) => void;
  addRole: (role: Role) => void;
  addSucursal: (sucursal: Sucursal) => void;
  addTipoContrato: (tipo: TipoContrato) => void;
  addTipoJornada: (tipo: TipoJornada) => void;
  addDocumentoDef: (doc: DocumentoDefinicion) => void;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

const rolesSeed: Role[] = [
  { id: 1, nombre: "Administrador", descripcion: "Control total del sistema", tipo: "Administrativo", estado: "Activo" },
  { id: 2, nombre: "Médico", descripcion: "Personal clínico", tipo: "Clínico", estado: "Activo" },
  { id: 3, nombre: "Enfermería", descripcion: "Soporte clínico", tipo: "Clínico", estado: "Activo" },
  { id: 4, nombre: "Recepción", descripcion: "Atención al paciente", tipo: "Administrativo", estado: "Activo" },
  { id: 5, nombre: "Laboratorio", descripcion: "Procesos de laboratorio", tipo: "Soporte", estado: "Activo" },
  { id: 6, nombre: "Rayos X", descripcion: "Imagenología", tipo: "Soporte", estado: "Activo" },
  { id: 7, nombre: "Ultrasonido", descripcion: "Imagenología", tipo: "Soporte", estado: "Activo" },
  { id: 8, nombre: "Caja / Facturación", descripcion: "Facturación y cobros", tipo: "Administrativo", estado: "Activo" },
  { id: 9, nombre: "SSO - Monitor", descripcion: "Monitoreo SSO", tipo: "Administrativo", estado: "Activo" },
  { id: 10, nombre: "SSO - Coordinador", descripcion: "Coordinación SSO", tipo: "Administrativo", estado: "Activo" }
];

const sucursalesSeed: Sucursal[] = [
  { id: 1, nombre: "Palín", codigo: "PAL", ciudad: "Palín", departamento: "Escuintla", estado: "Activa" },
  { id: 2, nombre: "Escuintla", codigo: "ESC", ciudad: "Escuintla", departamento: "Escuintla", estado: "Activa" },
  { id: 3, nombre: "Cobán", codigo: "COB", ciudad: "Cobán", departamento: "Alta Verapaz", estado: "Activa" },
  { id: 4, nombre: "Quetzaltenango", codigo: "QZ", ciudad: "Quetzaltenango", departamento: "Quetzaltenango", estado: "Activa" }
];

const tiposContratoSeed: TipoContrato[] = [
  { id: 1, nombre: "Indefinido", descripcion: "Contrato permanente" },
  { id: 2, nombre: "Temporal", descripcion: "Contrato por tiempo definido" },
  { id: 3, nombre: "Servicios profesionales", descripcion: "Prestación por servicios" }
];

const tiposJornadaSeed: TipoJornada[] = [
  { id: 1, nombre: "Diurna" },
  { id: 2, nombre: "Nocturna" },
  { id: 3, nombre: "Mixta" }
];

const documentosDefSeed: DocumentoDefinicion[] = [
  { id: 1, nombre: "DPI", obligatorio: true, requiereVencimiento: true },
  { id: 2, nombre: "Contrato laboral", obligatorio: true, requiereVencimiento: false },
  { id: 3, nombre: "RTU", obligatorio: false, requiereVencimiento: true },
  { id: 4, nombre: "Constancia de salud", obligatorio: false, requiereVencimiento: true },
  { id: 5, nombre: "Antecedentes penales", obligatorio: true, requiereVencimiento: true },
  { id: 6, nombre: "Antecedentes policiales", obligatorio: true, requiereVencimiento: true },
  { id: 7, nombre: "Título académico", obligatorio: true, requiereVencimiento: false },
  { id: 8, nombre: "Firma", obligatorio: false, requiereVencimiento: false }
];

const usuariosSeed: Usuario[] = [
  {
    id: 1,
    primerNombre: "María",
    segundoNombre: "Alejandra",
    primerApellido: "López",
    segundoApellido: "García",
    correo: "maria.lopez@starmedical.com.gt",
    fotoUrl: "",
    rolId: 1,
    sucursalId: 1,
    tipoUsuario: "Administrativo",
    estado: "Activo",
    celular: "5555-1020",
    tipoContratoId: 1,
    tipoJornadaId: 1,
    documentos: [
      { documentoId: 1, fechaVencimiento: "2025-01-10" },
      { documentoId: 5, fechaVencimiento: "2024-12-20" }
    ]
  },
  {
    id: 2,
    primerNombre: "Carlos",
    segundoNombre: "Enrique",
    primerApellido: "Pérez",
    segundoApellido: "Ramírez",
    correo: "carlos.perez@starmedical.com.gt",
    fotoUrl: "",
    rolId: 2,
    sucursalId: 2,
    tipoUsuario: "Clínico",
    estado: "Activo",
    celular: "5555-2020",
    tipoContratoId: 2,
    tipoJornadaId: 3
  },
  {
    id: 3,
    primerNombre: "Andrea",
    primerApellido: "Díaz",
    segundoApellido: "Soto",
    correo: "andrea.diaz@starmedical.com.gt",
    fotoUrl: "",
    rolId: 4,
    sucursalId: 3,
    tipoUsuario: "Administrativo",
    estado: "Suspendido",
    celular: "5555-3030",
    tipoContratoId: 2,
    tipoJornadaId: 1
  },
  {
    id: 4,
    primerNombre: "Luis",
    segundoNombre: "Fernando",
    primerApellido: "Gómez",
    correo: "luis.gomez@starmedical.com.gt",
    fotoUrl: "",
    rolId: 5,
    sucursalId: 4,
    tipoUsuario: "Soporte",
    estado: "Inactivo",
    tipoContratoId: 3,
    tipoJornadaId: 2
  }
];

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosSeed);
  const [roles, setRoles] = useState<Role[]>(rolesSeed);
  const [sucursales, setSucursales] = useState<Sucursal[]>(sucursalesSeed);
  const [tiposContrato, setTiposContrato] = useState<TipoContrato[]>(tiposContratoSeed);
  const [tiposJornada, setTiposJornada] = useState<TipoJornada[]>(tiposJornadaSeed);
  const [documentosDef, setDocumentosDef] = useState<DocumentoDefinicion[]>(documentosDefSeed);

  const addOrUpdateUsuario = (usuario: Usuario) => {
    setUsuarios((prev) => {
      const exists = prev.some((u) => u.id === usuario.id);
      if (exists) {
        return prev.map((u) => (u.id === usuario.id ? usuario : u));
      }
      return [...prev, usuario];
    });
  };

  const deactivateUsuario = (id: number) => {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, estado: "Inactivo" as UserStatus } : u)));
  };

  const addRole = (role: Role) => setRoles((prev) => [...prev, role]);
  const addSucursal = (sucursal: Sucursal) => setSucursales((prev) => [...prev, sucursal]);
  const addTipoContrato = (tipo: TipoContrato) => setTiposContrato((prev) => [...prev, tipo]);
  const addTipoJornada = (tipo: TipoJornada) => setTiposJornada((prev) => [...prev, tipo]);
  const addDocumentoDef = (doc: DocumentoDefinicion) => setDocumentosDef((prev) => [...prev, doc]);

  const value = useMemo(
    () => ({
      usuarios,
      roles,
      rolesOperativos: roles,
      sucursales,
      tiposContrato,
      tiposJornada,
      documentosDef,
      addOrUpdateUsuario,
      deactivateUsuario,
      addRole,
      addSucursal,
      addTipoContrato,
      addTipoJornada,
      addDocumentoDef
    }),
    [usuarios, roles, sucursales, tiposContrato, tiposJornada, documentosDef]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export const useUserData = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUserData must be used within UserProvider");
  return ctx;
};
