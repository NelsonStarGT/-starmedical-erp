"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import {
  Cliente,
  ClienteEstado,
  CondicionPago,
  DocumentoCliente,
  DocumentoClienteDefinicion,
  NotaCliente,
  RelacionFamiliar,
  SectorIndustria,
  TipoCliente,
  TipoClienteValor,
  TipoRelacionComercial
} from "@/lib/types";

type ClientContextValue = {
  clientes: Cliente[];
  tiposCliente: TipoCliente[];
  sectores: SectorIndustria[];
  relaciones: TipoRelacionComercial[];
  condicionesPago: CondicionPago[];
  documentosDef: DocumentoClienteDefinicion[];
  relacionesFamiliares: RelacionFamiliar[];
  addOrUpdateCliente: (cliente: Cliente) => void;
  addNota: (clienteId: number, nota: NotaCliente) => void;
  addOrUpdateRelacion: (menorId: number, tutorId: number, tipoRelacion: RelacionFamiliar["tipoRelacion"]) => void;
  addTipoCliente: (tipo: TipoCliente) => void;
  addSector: (sector: SectorIndustria) => void;
  addRelacion: (relacion: TipoRelacionComercial) => void;
  addCondicionPago: (condicion: CondicionPago) => void;
  addDocumentoDef: (doc: DocumentoClienteDefinicion) => void;
};

const ClientContext = createContext<ClientContextValue | undefined>(undefined);

const tiposClienteSeed: TipoCliente[] = [
  { id: 1, nombreTipo: "Empresa", descripcion: "Cliente corporativo", estado: "Activo" },
  { id: 2, nombreTipo: "Persona", descripcion: "Cliente individual", estado: "Activo" },
  { id: 3, nombreTipo: "Institución", descripcion: "Gobierno/ONG/educación", estado: "Activo" }
];

const sectoresSeed: SectorIndustria[] = [
  { id: 1, nombreSector: "Industrial", descripcion: "Manufactura y plantas", estado: "Activo" },
  { id: 2, nombreSector: "Servicios", descripcion: "Empresas de servicios", estado: "Activo" },
  { id: 3, nombreSector: "Construcción", descripcion: "Obras y proyectos", estado: "Activo" },
  { id: 4, nombreSector: "Comercio", descripcion: "Retail y comercio", estado: "Activo" },
  { id: 5, nombreSector: "Educación", descripcion: "Colegios y universidades", estado: "Activo" },
  { id: 6, nombreSector: "Salud", descripcion: "Hospitales aliados", estado: "Activo" },
  { id: 7, nombreSector: "Gobierno", descripcion: "Entidades públicas", estado: "Activo" }
];

const relacionesSeed: TipoRelacionComercial[] = [
  { id: 1, nombre: "SSO", descripcion: "Salud y Seguridad Ocupacional" },
  { id: 2, nombre: "Diagnóstico clínico", descripcion: "Servicios de laboratorio e imagen" },
  { id: 3, nombre: "Membresía empresarial", descripcion: "Planes anuales" },
  { id: 4, nombre: "Convenio preferencial", descripcion: "Preferencias para empleados" }
];

const condicionesPagoSeed: CondicionPago[] = [
  { id: 1, nombreCondicion: "Contado", descripcion: "Pago inmediato" },
  { id: 2, nombreCondicion: "Crédito 15 días", descripcion: "Pago a 15 días" },
  { id: 3, nombreCondicion: "Crédito 30 días", descripcion: "Pago a 30 días" },
  { id: 4, nombreCondicion: "Crédito 60 días", descripcion: "Pago a 60 días" }
];

const documentosDefSeed: DocumentoClienteDefinicion[] = [
  { id: 1, nombreDocumento: "Convenio/Contrato firmado", aplicaA: "Todos", esObligatorio: true, tieneVencimiento: true },
  { id: 2, nombreDocumento: "RTU", aplicaA: "Empresa", esObligatorio: true, tieneVencimiento: true },
  { id: 3, nombreDocumento: "Patente de comercio", aplicaA: "Empresa", esObligatorio: true, tieneVencimiento: false },
  { id: 4, nombreDocumento: "Patente de empresa", aplicaA: "Empresa", esObligatorio: false, tieneVencimiento: false },
  { id: 5, nombreDocumento: "Constancia de representante legal", aplicaA: "Empresa", esObligatorio: true, tieneVencimiento: true },
  { id: 6, nombreDocumento: "Listado de colaboradores", aplicaA: "Todos", esObligatorio: false, tieneVencimiento: false }
];

const clientesSeed: Cliente[] = [
  {
    id: 1,
    tipoCliente: "Empresa",
    nombreComercial: "Grupo Industrial Norte",
    razonSocial: "Grupo Industrial Norte S.A.",
    nit: "8990023-1",
    codigoInternoCliente: "CLI-001",
    estadoCliente: "Activo",
    sectorIndustriaId: 1,
    sitioWeb: "https://industrialnorte.com",
    emailCorporativo: "contacto@industrialnorte.com",
    telefonoCorporativo: "5555-0000",
    notificacionesEmail: true,
    notificacionesWhatsApp: true,
    contactoPrincipalNombre: "Laura Martínez",
    contactoPrincipalCargo: "Gerente de RRHH",
    contactoPrincipalCorreo: "laura.martinez@industrialnorte.com",
    contactoPrincipalTelefono: "5555-1010",
    contactosSecundarios: [
      { rol: "Finanzas", nombre: "Carlos Jiménez", correo: "finanzas@industrialnorte.com", telefono: "5555-2020" },
      { rol: "Facturación", nombre: "Alejandra Ruiz", correo: "facturacion@industrialnorte.com", telefono: "5555-3030" }
    ],
    direccionFiscal: "Zona industrial 5, Palín",
    direccionComercial: "Km 20 Ruta al Pacífico",
    pais: "Guatemala",
    departamento: "Escuintla",
    municipio: "Palín",
    ciudad: "Palín",
    tipoRelacionComercialId: 1,
    fechaInicioRelacion: "2024-01-10",
    fechaFinRelacion: "2025-01-10",
    condicionesPagoId: 3,
    sucursalesAtendidas: ["Palín", "Escuintla"],
    listaServiciosContratados: ["Exámenes preocupacionales", "RX columna", "Audiometrías"],
    documentos: [
      { documentoId: 1, fechaVencimiento: "2025-01-05" },
      { documentoId: 2, fechaVencimiento: "2024-12-15" }
    ],
    representanteLegal: "Mario López",
    dpiRepresentante: "1234567890101",
    empleados: [
      { id: 1, nombre: "Jorge García", dpi: "30101010", puesto: "Supervisor", telefono: "5555-6060", seguro: "IGSS", estado: "Activo" },
      { id: 2, nombre: "Lucía Pérez", dpi: "30303030", puesto: "Operaria", telefono: "5555-7070", seguro: "Privado", estado: "Activo" }
    ],
    notas: [
      { id: 1, fecha: "2024-11-05", usuario: "Nelson", texto: "Solicitar actualización de RTU en diciembre." }
    ]
  },
  {
    id: 2,
    tipoCliente: "Institución",
    nombreComercial: "Colegio Horizonte",
    razonSocial: "Colegio Horizonte",
    nit: "1234567-8",
    codigoInternoCliente: "CLI-002",
    estadoCliente: "En negociación",
    sectorIndustriaId: 5,
    contactoPrincipalNombre: "Marcos Díaz",
    contactoPrincipalCargo: "Administrador",
    contactoPrincipalCorreo: "admin@horizonte.edu.gt",
    contactoPrincipalTelefono: "5555-2020",
    representanteLegal: "Carlos Herrera",
    dpiRepresentante: "1231231231231",
    direccionFiscal: "Zona 3, Cobán",
    pais: "Guatemala",
    departamento: "Alta Verapaz",
    municipio: "Cobán",
    ciudad: "Cobán",
    tipoRelacionComercialId: 4,
    condicionesPagoId: 2,
    sucursalesAtendidas: ["Cobán"],
    documentos: [{ documentoId: 1 }],
    notas: []
  },
  {
    id: 3,
    tipoCliente: "Persona",
    nombreCompleto: "Ana Torres",
    fechaNacimiento: "1988-03-12",
    nit: "6565656-9",
    codigoInternoCliente: "CLI-003",
    estadoCliente: "Activo",
    sectorIndustriaId: 2,
    contactoPrincipalNombre: "Ana Torres",
    contactoPrincipalCorreo: "ana.torres@gmail.com",
    contactoPrincipalTelefono: "5555-3030",
    ciudad: "Guatemala",
    pais: "Guatemala",
    tipoRelacionComercialId: 2,
    condicionesPagoId: 1,
    sucursalesAtendidas: ["Palín"],
    documentos: [{ documentoId: 1 }]
  }
];

const relacionesFamiliaresSeed: RelacionFamiliar[] = [];

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>(clientesSeed);
  const [tiposCliente, setTiposCliente] = useState<TipoCliente[]>(tiposClienteSeed);
  const [sectores, setSectores] = useState<SectorIndustria[]>(sectoresSeed);
  const [relaciones, setRelaciones] = useState<TipoRelacionComercial[]>(relacionesSeed);
  const [condicionesPago, setCondicionesPago] = useState<CondicionPago[]>(condicionesPagoSeed);
  const [documentosDef, setDocumentosDef] = useState<DocumentoClienteDefinicion[]>(documentosDefSeed);
  const [relacionesFamiliares, setRelacionesFamiliares] = useState<RelacionFamiliar[]>(relacionesFamiliaresSeed);

  const addOrUpdateCliente = (cliente: Cliente) => {
    setClientes((prev) => {
      const exists = prev.some((c) => c.id === cliente.id);
      if (exists) {
        return prev.map((c) => (c.id === cliente.id ? cliente : c));
      }
      return [...prev, cliente];
    });
  };

  const addNota = (clienteId: number, nota: NotaCliente) => {
    setClientes((prev) =>
      prev.map((c) =>
        c.id === clienteId ? { ...c, notas: [...(c.notas || []), nota] } : c
      )
    );
  };

  const addTipoCliente = (tipo: TipoCliente) => setTiposCliente((prev) => [...prev, tipo]);
  const addSector = (sector: SectorIndustria) => setSectores((prev) => [...prev, sector]);
  const addRelacion = (relacion: TipoRelacionComercial) => setRelaciones((prev) => [...prev, relacion]);
  const addCondicionPago = (condicion: CondicionPago) => setCondicionesPago((prev) => [...prev, condicion]);
  const addDocumentoDef = (doc: DocumentoClienteDefinicion) => setDocumentosDef((prev) => [...prev, doc]);

  const addOrUpdateRelacion = (
    menorId: number,
    tutorId: number,
    tipoRelacion: RelacionFamiliar["tipoRelacion"]
  ) => {
    setRelacionesFamiliares((prev) => {
      const filtered = prev.filter((r) => r.menorId !== menorId);
      const nueva: RelacionFamiliar = {
        id: `${menorId}-${tutorId}-${Date.now()}`,
        menorId,
        tutorId,
        tipoRelacion,
        fechaAsignacion: new Date()
      };
      return [...filtered, nueva];
    });
  };

  const value = useMemo(
    () => ({
      clientes,
      tiposCliente,
      sectores,
      relaciones,
      condicionesPago,
      documentosDef,
      relacionesFamiliares,
      addOrUpdateCliente,
      addNota,
      addOrUpdateRelacion,
      addTipoCliente,
      addSector,
      addRelacion,
      addCondicionPago,
      addDocumentoDef
    }),
    [clientes, tiposCliente, sectores, relaciones, condicionesPago, documentosDef, relacionesFamiliares]
  );

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}

export const useClientData = () => {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("useClientData must be used within ClientProvider");
  return ctx;
};
