"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { QuickPatientModal } from "@/components/clients/QuickPatientModal";
import { ImportClientsModal } from "@/components/clients/ImportClientsModal";
import { cn, isValidEmail } from "@/lib/utils";
import {
  Cliente,
  ClienteEstado,
  DocumentoCliente,
  NotaCliente,
  ReferenciaComercial,
  EmpleadoCliente,
  TipoClienteValor
} from "@/lib/types";
import { useClientData } from "@/components/clients/ClientProvider";

type FormTab =
  | "generales"
  | "contactos"
  | "referencias"
  | "demografia"
  | "legales"
  | "empleados"
  | "documentos"
  | "historial"
  | "personales"
  | "contacto"
  | "salud"
  | "afiliaciones";

const estados: ClienteEstado[] = ["Activo", "Inactivo", "En negociación"];
const tiposCliente: TipoClienteValor[] = ["Empresa", "Persona", "Institución"];
const tipoOptionsAll: TipoClienteValor[] = ["Empresa", "Persona", "Institución"];
const sucursalesStar = ["Palín", "Escuintla", "Cobán", "Quetzaltenango"];
const relacionesMockEtiquetas = ["Exámenes preocupacionales", "RX columna", "Audiometrías", "Perfil completo"];

const getAge = (dateString?: string) => {
  if (!dateString) return null;
  const normalized = dateString.includes("/") ? dateString.split("/").reverse().join("-") : dateString;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

const perPage = 10;

export default function ClientesLista() {
  const {
    clientes,
    sectores,
    relaciones,
    condicionesPago,
    documentosDef,
    addOrUpdateCliente,
    addNota,
    addOrUpdateRelacion,
    relacionesFamiliares
  } = useClientData();

  const [filters, setFilters] = useState({
    search: "",
    tipo: "",
    sectorId: "",
    estado: "",
    sucursal: ""
  });
  const [page, setPage] = useState(1);
  const [formTab, setFormTab] = useState<FormTab>("generales");
  const [success, setSuccess] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [docErrors, setDocErrors] = useState<Record<number, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newReference, setNewReference] = useState<Partial<ReferenciaComercial>>({});
  const [newEmployee, setNewEmployee] = useState<Partial<EmpleadoCliente>>({});
  const [tutorId, setTutorId] = useState<number | undefined>(undefined);
  const [tutorRelacion, setTutorRelacion] = useState<"Padre" | "Madre" | "Encargado" | "Tutor legal" | "">("");
  const [showTutorModal, setShowTutorModal] = useState(false);
  const [newTutorForm, setNewTutorForm] = useState({
    nombres: "",
    apellidos: "",
    dpi: "",
    fecha: "",
    celular: "",
    email: ""
  });
  const todayISO = useMemo(() => new Date().toISOString().split("T")[0], []);

  const emptyForm: Partial<Cliente> = {
    tipoCliente: "Empresa",
    estadoCliente: "Activo",
    sectorIndustriaId: sectores[0]?.id || 1,
    sucursalesAtendidas: [],
    contactosSecundarios: [],
    referencias: [],
    empleados: [],
    nacionalidad: "Guatemala"
  };
  const [formValues, setFormValues] = useState<Partial<Cliente>>(emptyForm);

  const age = useMemo(() => getAge(formValues.fechaNacimiento), [formValues.fechaNacimiento]);
  const isMinor = age !== null && age < 18;

  const adultPersonas = useMemo(
    () =>
      clientes.filter((c) => {
        if (c.tipoCliente !== "Persona") return false;
        if (!c.nit || !/^\d{13}$/.test(c.nit)) return false;
        const a = getAge(c.fechaNacimiento);
        return a === null ? false : a >= 18;
      }),
    [clientes]
  );

  const filterClientes = useMemo(() => {
    const searchTerm = filters.search.toLowerCase();
    return clientes.filter((c) => {
      const name =
        (c.nombreComercial || c.razonSocial || c.nombreCompleto || "").toLowerCase();
      const nit = (c.nit || "").toLowerCase();
      const matchesSearch = name.includes(searchTerm) || nit.includes(searchTerm);
      const matchesTipo = filters.tipo ? c.tipoCliente === filters.tipo : true;
      const matchesSector = filters.sectorId ? c.sectorIndustriaId === Number(filters.sectorId) : true;
      const matchesEstado = filters.estado ? c.estadoCliente === filters.estado : true;
      const matchesSucursal = filters.sucursal
        ? (c.sucursalesAtendidas || []).includes(filters.sucursal)
        : true;
      return matchesSearch && matchesTipo && matchesSector && matchesEstado && matchesSucursal;
    });
  }, [clientes, filters]);

  const totalPages = Math.max(1, Math.ceil(filterClientes.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const paginated = filterClientes.slice((currentPage - 1) * perPage, currentPage * perPage);

  const resetForm = () => {
    setFormValues(emptyForm);
    setFormErrors({});
    setDocErrors({});
    setFormTab("generales");
    setEditingId(null);
    setNewNote("");
    setTutorId(undefined);
    setTutorRelacion("");
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    const tipo = formValues.tipoCliente as TipoClienteValor;
    const personas = clientes.filter((c) => c.tipoCliente === "Persona");

    if (tipo === "Empresa" || tipo === "Institución") {
      if (!formValues.nombreComercial && !formValues.razonSocial) {
        errors.nombreComercial = "Nombre comercial o razón social es obligatorio.";
      }
      if (!formValues.nit) errors.nit = "NIT obligatorio.";
    }

    if (tipo === "Persona") {
      if (!formValues.primerNombre) errors.primerNombre = "Requerido";
      if (!formValues.primerApellido) errors.primerApellido = "Requerido";
      if (!formValues.fechaNacimiento) errors.fechaNacimiento = "Requerido";
      if (!formValues.sexo) errors.sexo = "Requerido";
      if (!formValues.nit) errors.nit = "DPI requerido";
      else if (!/^\d{13}$/.test(formValues.nit)) errors.nit = "DPI debe tener 13 dígitos";
      else {
        const duplicate = personas.find(
          (p) => (p.nit || "").toLowerCase() === formValues.nit?.toLowerCase() && p.id !== editingId
        );
        if (duplicate) errors.nit = "DPI ya registrado";
      }
      if (!formValues.contactoPrincipalTelefono) errors.contactoPrincipalTelefono = "Celular requerido";
      if (formValues.contactoPrincipalCorreo && !isValidEmail(formValues.contactoPrincipalCorreo)) {
        errors.contactoPrincipalCorreo = "Correo inválido";
      }
      if (isMinor) {
        if (!tutorId) errors.tutorId = "Tutor obligatorio para menores";
        const tutor = adultPersonas.find((p) => p.id === tutorId);
        if (!tutor) errors.tutorId = "Tutor no válido";
        if (!tutorRelacion) errors.tutorRelacion = "Selecciona relación";
      }
    } else {
      if (!formValues.contactoPrincipalNombre) errors.contactoPrincipalNombre = "Requerido.";
      if (!formValues.contactoPrincipalCorreo) errors.contactoPrincipalCorreo = "Correo requerido.";
      else if (!isValidEmail(formValues.contactoPrincipalCorreo))
        errors.contactoPrincipalCorreo = "Correo inválido.";
      if (!formValues.contactoPrincipalTelefono)
        errors.contactoPrincipalTelefono = "Teléfono requerido.";
    }

    setFormErrors(errors);
    const hasDocErrors = Object.keys(docErrors).length > 0;
    return Object.keys(errors).length === 0 && !hasDocErrors;
  };

  const handleSave = () => {
    if (!validate()) return;
    const nextId = editingId ?? (clientes.length ? Math.max(...clientes.map((c) => c.id)) + 1 : 1);
    const tipo = (formValues.tipoCliente as TipoClienteValor) || "Empresa";
    let payload: Cliente;

    if (tipo === "Persona") {
      payload = {
        id: nextId,
        tipoCliente: "Persona",
        primerNombre: formValues.primerNombre,
        segundoNombre: formValues.segundoNombre,
        tercerNombre: formValues.tercerNombre,
        primerApellido: formValues.primerApellido,
        segundoApellido: formValues.segundoApellido,
        apellidoCasada: formValues.apellidoCasada,
        nombreCompleto: [
          formValues.primerNombre,
          formValues.segundoNombre,
          formValues.tercerNombre,
          formValues.primerApellido,
          formValues.segundoApellido,
          formValues.apellidoCasada
        ]
          .filter(Boolean)
          .join(" "),
        fotoUrl: formValues.fotoUrl,
        fechaNacimiento: formValues.fechaNacimiento,
        sexo: formValues.sexo,
        estadoCivil: formValues.estadoCivil,
        nacionalidad: formValues.nacionalidad,
        contactoPrincipalNombre: [
          formValues.primerNombre,
          formValues.segundoNombre,
          formValues.tercerNombre,
          formValues.primerApellido,
          formValues.segundoApellido
        ]
          .filter(Boolean)
          .join(" "),
        contactoPrincipalTelefono: formValues.contactoPrincipalTelefono,
        telefono: formValues.telefono,
        contactoPrincipalCorreo: formValues.contactoPrincipalCorreo,
        ocupacion: formValues.ocupacion,
        lugarTrabajo: formValues.lugarTrabajo,
        tipoSanguineo: formValues.tipoSanguineo,
        seguroId: formValues.seguroId,
        empresaAsociadaId: formValues.empresaAsociadaId,
        institucionAsociadaId: formValues.institucionAsociadaId,
        nit: formValues.nit,
        estadoCliente: (formValues.estadoCliente as ClienteEstado) || "Activo",
        sectorIndustriaId: sectorServiciosId,
        direccionCompleta: formValues.direccionCompleta,
        direccionFiscal: formValues.direccionFiscal,
        departamento: formValues.departamento,
        municipio: formValues.municipio,
        ciudad: formValues.ciudad,
        codigoPostal: formValues.codigoPostal,
        sucursalesAtendidas: [],
        documentos: formValues.documentos || documentosDef.map((d) => ({ documentoId: d.id })),
        notas: formValues.notas || [],
        referencias: formValues.referencias || [],
        empleados: formValues.empleados || []
      };
    } else {
      payload = {
        id: nextId,
        tipoCliente: tipo,
        fotoUrl: formValues.fotoUrl,
        nombreComercial: formValues.nombreComercial,
        razonSocial: formValues.razonSocial,
        nit: formValues.nit,
        codigoInternoCliente: formValues.codigoInternoCliente,
        estadoCliente: (formValues.estadoCliente as ClienteEstado) || "Activo",
        sectorIndustriaId: formValues.sectorIndustriaId || sectores[0]?.id || 1,
        sitioWeb: formValues.sitioWeb,
        emailCorporativo: formValues.emailCorporativo,
        telefonoCorporativo: formValues.telefonoCorporativo,
        notificacionesWhatsApp: formValues.notificacionesWhatsApp,
        notificacionesEmail: formValues.notificacionesEmail,
        direccionFiscal: formValues.direccionFiscal,
        direccionComercial: formValues.direccionComercial,
        direccionCompleta: formValues.direccionCompleta,
        numeroExterior: formValues.numeroExterior,
        numeroInterior: formValues.numeroInterior,
        observacionesGenerales: formValues.observacionesGenerales,
        contactoPrincipalNombre: formValues.contactoPrincipalNombre || "",
        contactoPrincipalCargo: formValues.contactoPrincipalCargo,
        contactoPrincipalCorreo: formValues.contactoPrincipalCorreo || "",
        contactoPrincipalTelefono: formValues.contactoPrincipalTelefono || "",
        contactosSecundarios: formValues.contactosSecundarios || [],
        pais: formValues.pais,
        departamento: formValues.departamento,
        municipio: formValues.municipio,
        ciudad: formValues.ciudad,
        codigoPostal: formValues.codigoPostal,
        direccionesOperacion: formValues.direccionesOperacion || [],
        tipoRelacionComercialId: formValues.tipoRelacionComercialId,
        fechaInicioRelacion: formValues.fechaInicioRelacion,
        fechaFinRelacion: formValues.fechaFinRelacion,
        condicionesPagoId: formValues.condicionesPagoId,
        limiteCredito: formValues.limiteCredito ? Number(formValues.limiteCredito) : undefined,
        sucursalesAtendidas: formValues.sucursalesAtendidas || [],
        listaServiciosContratados: formValues.listaServiciosContratados || [],
        documentos: formValues.documentos || documentosDef.map((d) => ({ documentoId: d.id })),
        notas: formValues.notas || [],
        referencias: formValues.referencias || [],
        representanteLegal: formValues.representanteLegal,
        dpiRepresentante: formValues.dpiRepresentante,
        patenteComercio: formValues.patenteComercio,
        empleados: formValues.empleados || []
      };
    }

    addOrUpdateCliente(payload);
    if (payload.tipoCliente === "Persona" && isMinor && tutorId && tutorRelacion) {
      addOrUpdateRelacion(payload.id, tutorId, tutorRelacion as any);
    }
    setSuccess("Cliente guardado correctamente.");
    resetForm();
    setShowModal(false);
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingId(cliente.id);
    setFormValues(cliente);
    setFormTab(cliente.tipoCliente === "Persona" ? "personales" : "generales");
    if (cliente.tipoCliente === "Persona") {
      const rel = relacionesFamiliares.find((r) => r.menorId === cliente.id);
      setTutorId(rel?.tutorId);
      setTutorRelacion((rel?.tipoRelacion as any) || "");
    } else {
      setTutorId(undefined);
      setTutorRelacion("");
    }
    setSuccess("");
    setDocErrors({});
    setShowModal(true);
  };

  const clienteNombre = (c: Cliente) =>
    c.nombreComercial || c.razonSocial || c.nombreCompleto || "Cliente";

  const sectorName = (id: number) => sectores.find((s) => s.id === id)?.nombreSector || "Sector";
  const relacionName = (id?: number) =>
    relaciones.find((r) => r.id === id)?.nombre || "Sin relación";
  const condicionName = (id?: number) =>
    condicionesPago.find((c) => c.id === id)?.nombreCondicion || "Sin condición";

  const changeDocument = (documentoId: number, key: keyof DocumentoCliente, value: string) => {
    setFormValues((prev) => {
      const documents = prev.documentos || documentosDef.map((d) => ({ documentoId: d.id }));
      if (key === "fechaVencimiento") {
        if (value && value < todayISO) {
          setDocErrors((errs) => ({ ...errs, [documentoId]: "La fecha no puede ser anterior a hoy." }));
          return prev;
        }
        setDocErrors((errs) => {
          const { [documentoId]: _, ...rest } = errs;
          return rest;
        });
      }
      const updated = documents.map((doc) =>
        doc.documentoId === documentoId ? { ...doc, [key]: value } : doc
      );
      return { ...prev, documentos: updated };
    });
  };

  const handleDocumentFile = (documentoId: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setFormValues((prev) => {
          const documents = prev.documentos || documentosDef.map((d) => ({ documentoId: d.id }));
          const updated = documents.map((doc) =>
            doc.documentoId === documentoId ? { ...doc, archivo: result, archivoNombre: file.name } : doc
          );
          return { ...prev, documentos: updated };
        });
        setDocErrors((errs) => {
          const { [documentoId]: _, ...rest } = errs;
          return rest;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDocumentFile = (documentoId: number) => {
    setFormValues((prev) => {
      const documents = prev.documentos || documentosDef.map((d) => ({ documentoId: d.id }));
      const updated = documents.map((doc) =>
        doc.documentoId === documentoId ? { ...doc, archivo: "", archivoNombre: "" } : doc
      );
      return { ...prev, documentos: updated };
    });
    setDocErrors((errs) => {
      const { [documentoId]: _, ...rest } = errs;
      return rest;
    });
  };

  const handleNoteAdd = () => {
    if (!newNote.trim() || !editingId) return;
    const note: NotaCliente = {
      id: Date.now(),
      fecha: todayISO,
      usuario: "Nelson",
      texto: newNote.trim()
    };
    addNota(editingId, note);
    setFormValues((prev) => ({ ...prev, notas: [...(prev.notas || []), note] }));
    setNewNote("");
  };

  const handleClientPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setFormValues((prev) => ({ ...prev, fotoUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddReference = () => {
    if (!newReference.nombre) return;
    const ref: ReferenciaComercial = {
      id: Date.now(),
      nombre: newReference.nombre,
      apellido: newReference.apellido,
      empresa: newReference.empresa,
      telefono: newReference.telefono
    };
    setFormValues((prev) => ({ ...prev, referencias: [...(prev.referencias || []), ref] }));
    setNewReference({});
  };

  const handleSaveTutor = () => {
    if (!newTutorForm.nombres || !newTutorForm.apellidos || !newTutorForm.dpi || !newTutorForm.fecha || !newTutorForm.celular) {
      alert("Todos los campos del tutor son obligatorios.");
      return;
    }
    if (!/^\d{13}$/.test(newTutorForm.dpi)) {
      alert("El DPI del tutor debe tener 13 dígitos.");
      return;
    }
    const ageTutor = getAge(newTutorForm.fecha);
    if (ageTutor === null || ageTutor < 18) {
      alert("El tutor debe ser mayor de edad.");
      return;
    }
    if (clientes.some((c) => c.tipoCliente === "Persona" && (c.nit || "").toLowerCase() === newTutorForm.dpi.toLowerCase())) {
      alert("Ya existe un cliente con ese DPI.");
      return;
    }
    const nextId = clientes.length ? Math.max(...clientes.map((c) => c.id)) + 1 : 1;
    const tutor: Cliente = {
      id: nextId,
      tipoCliente: "Persona",
      nombreCompleto: `${newTutorForm.nombres} ${newTutorForm.apellidos}`,
      primerNombre: newTutorForm.nombres.split(" ")[0],
      primerApellido: newTutorForm.apellidos.split(" ")[0],
      fechaNacimiento: newTutorForm.fecha,
      sexo: "Otro",
      nit: newTutorForm.dpi,
      estadoCliente: "Activo",
      sectorIndustriaId: sectorServiciosId,
      contactoPrincipalTelefono: newTutorForm.celular,
      contactoPrincipalCorreo: newTutorForm.email,
      sucursalesAtendidas: [],
      documentos: documentosDef.map((d) => ({ documentoId: d.id }))
    };
    addOrUpdateCliente(tutor);
    setTutorId(tutor.id);
    if (!tutorRelacion) setTutorRelacion("Encargado");
    setShowTutorModal(false);
    setNewTutorForm({ nombres: "", apellidos: "", dpi: "", fecha: "", celular: "", email: "" });
  };

  const handleAddEmployee = () => {
    if (!newEmployee.nombre) return;
    const emp: EmpleadoCliente = {
      id: Date.now(),
      nombre: newEmployee.nombre,
      dpi: newEmployee.dpi,
      puesto: newEmployee.puesto,
      telefono: newEmployee.telefono,
      seguro: newEmployee.seguro,
      estado: "Activo"
    };
    setFormValues((prev) => ({ ...prev, empleados: [...(prev.empleados || []), emp] }));
    setNewEmployee({});
  };

  const updateContacto = (rol: any, key: "nombre" | "telefono" | "correo", value: string) => {
    setFormValues((prev) => {
      const contacts = prev.contactosSecundarios || [];
      const exists = contacts.find((c) => c.rol === rol);
      const updated = exists
        ? contacts.map((c) => (c.rol === rol ? { ...c, [key]: value } : c))
        : [...contacts, { rol, [key]: value }];
      return { ...prev, contactosSecundarios: updated };
    });
  };

  const sectorServiciosId = useMemo(() => {
    const match = sectores.find((s) => s.nombreSector.toLowerCase().includes("servicios"));
    return match?.id || sectores[0]?.id || 1;
  }, [sectores]);

  const empresasOptions = useMemo(
    () =>
      clientes
        .filter((c) => c.tipoCliente === "Empresa" || c.tipoCliente === "Institución")
        .map((c) => ({
          id: c.id,
          label: c.nombreComercial || c.razonSocial || `Cliente ${c.id}`
        })),
    [clientes]
  );

  const handleQuickPatientSave = (data: {
    nombres: string;
    apellidos: string;
    celular: string;
    fechaNacimiento: string;
    sexo: string;
    dpi?: string;
    correo?: string;
    empresaId?: number;
  }) => {
    const dpi = data.dpi || "";
    const ageQuick = getAge(data.fechaNacimiento);
    if (ageQuick !== null && ageQuick < 18) {
      alert("El paciente es menor de edad. Use el formulario completo para asignar tutor responsable.");
      return;
    }
    if (!/^\d{13}$/.test(dpi)) {
      alert("El DPI debe tener 13 dígitos.");
      return;
    }
    const duplicate = clientes.find(
      (c) => c.tipoCliente === "Persona" && (c.nit || "").toLowerCase() === dpi.toLowerCase()
    );
    if (duplicate) {
      alert("El DPI ya está registrado.");
      return;
    }
    const nextId = clientes.length ? Math.max(...clientes.map((c) => c.id)) + 1 : 1;
    const payload: Cliente = {
      id: nextId,
      tipoCliente: "Persona",
      nombreCompleto: `${data.nombres} ${data.apellidos}`.trim(),
      fechaNacimiento: data.fechaNacimiento,
      nit: data.dpi,
      estadoCliente: "Activo",
      sectorIndustriaId: sectorServiciosId,
      contactoPrincipalNombre: `${data.nombres} ${data.apellidos}`.trim(),
      contactoPrincipalTelefono: data.celular,
      contactoPrincipalCorreo: data.correo,
      sexo: data.sexo,
      empresaAsociadaId: data.empresaId,
      sucursalesAtendidas: [],
      documentos: documentosDef.map((d) => ({ documentoId: d.id })),
      notas: [],
      referencias: [],
      empleados: []
    };
    addOrUpdateCliente(payload);
    setSuccess("Paciente creado correctamente.");
    setShowQuickModal(false);
    setFilters((prev) => ({ ...prev, tipo: "Persona" }));
  };

  const handleTipoChange = (value: TipoClienteValor) => {
    setFormValues((prev) => ({
      ...prev,
      tipoCliente: value,
      sectorIndustriaId: value === "Persona" ? sectorServiciosId : prev.sectorIndustriaId
    }));
    setFormErrors({});
    setDocErrors({});
    setFormTab(value === "Persona" ? "personales" : "generales");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 py-4">
          <div>
            <label className="text-xs font-medium text-slate-600">Búsqueda (nombre o NIT)</label>
            <input
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                setPage(1);
              }}
              placeholder="Nombre o NIT"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Tipo de cliente</label>
            <select
              value={filters.tipo}
              onChange={(e) => {
                setFilters({ ...filters, tipo: e.target.value });
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Todos</option>
              {tiposCliente.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Sector</label>
            <select
              value={filters.sectorId}
              onChange={(e) => {
                setFilters({ ...filters, sectorId: e.target.value });
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Todos</option>
              {sectores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombreSector}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Estado</label>
            <select
              value={filters.estado}
              onChange={(e) => {
                setFilters({ ...filters, estado: e.target.value });
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Todos</option>
              {estados.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Sucursal StarMedical</label>
            <select
              value={filters.sucursal}
              onChange={(e) => {
                setFilters({ ...filters, sucursal: e.target.value });
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Todas</option>
              {sucursalesStar.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Gestión de clientes</CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Importar desde Excel
            </button>
            <button
              onClick={() => {
                resetForm();
                setSuccess("");
                if (filters.tipo === "Persona") {
                  setShowQuickModal(true);
                } else {
                  setShowModal(true);
                }
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {filters.tipo === "Persona" ? "Nuevo paciente rápido" : "Nuevo cliente"}
            </button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Sector
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Empleados
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Ciudad / Depto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {paginated.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-700">{c.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{clienteNombre(c)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{c.tipoCliente}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{sectorName(c.sectorIndustriaId)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{c.empleados?.length || 0}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {c.ciudad || "-"} {c.departamento ? `/ ${c.departamento}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={c.estadoCliente === "Activo" ? "success" : c.estadoCliente === "En negociación" ? "warning" : "neutral"}>
                      {c.estadoCliente}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 text-sm font-semibold">
                      <button
                        onClick={() => handleEdit(c)}
                        className="text-brand-primary hover:underline"
                      >
                        Editar
                      </button>
                      <button className="text-slate-600 hover:underline">Ver</button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={7}>
                    No hay clientes con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50 hover:bg-white"
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50 hover:bg-white"
              >
                Siguiente
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Editar cliente" : "Nuevo cliente"}
        footer={
          <div className="flex items-center justify-between">
            <div>
              {success && (
                <span className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                  {success}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  resetForm();
                  setSuccess("");
                  setShowModal(false);
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={formValues.tipoCliente === "Persona" && isMinor && (!tutorId || !tutorRelacion)}
                className="rounded-xl bg-brand-primary px-4 py-2 text-white text-sm font-semibold shadow-sm hover:shadow-md"
              >
                Guardar cliente
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(formValues.tipoCliente === "Persona"
              ? (["personales", "contacto", "salud", "afiliaciones", "demografia", "documentos", "historial"] as FormTab[])
              : (["generales", "contactos", "referencias", "demografia", "legales", "empleados", "documentos", "historial"] as FormTab[])
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setFormTab(tab)}
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-medium",
                  formTab === tab ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/30" : "bg-slate-100 text-slate-700"
                )}
              >
                {tab === "generales" && "Datos generales"}
                {tab === "contactos" && "Contactos y ubicaciones"}
                {tab === "referencias" && "Referencias comerciales"}
                {tab === "demografia" && "Información demográfica"}
                {tab === "legales" && "Datos legales"}
                {tab === "empleados" && "Empleados asociados"}
                {tab === "documentos" && "Documentos"}
                {tab === "historial" && "Notas / historial"}
                {tab === "personales" && "Datos personales"}
                {tab === "contacto" && "Contacto"}
                {tab === "salud" && "Salud y seguro"}
                {tab === "afiliaciones" && "Afiliaciones"}
              </button>
            ))}
          </div>

          {formValues.tipoCliente !== "Persona" && formTab === "generales" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Tipo de cliente</label>
                <select
                  value={formValues.tipoCliente}
                  onChange={(e) => handleTipoChange(e.target.value as TipoClienteValor)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  {tipoOptionsAll.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Identificación visual</label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-sm font-semibold text-slate-700">
                    {formValues.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={formValues.fotoUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      (formValues.nombreComercial?.[0] || formValues.razonSocial?.[0] || "C").toUpperCase()
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 cursor-pointer">
                      <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleClientPhotoChange} />
                      <span className="text-brand-primary">Seleccionar imagen</span>
                      <span className="text-xs text-slate-500">PNG o JPG</span>
                    </label>
                    {formValues.fotoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormValues({ ...formValues, fotoUrl: "" })}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Quitar imagen
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {renderSelectFrom("Sector / industria", "sectorIndustriaId", sectores, "nombreSector", true)}
              {renderInput("Nombre comercial", "nombreComercial")}
              {renderInput("Razón social", "razonSocial")}
              {renderInput("NIT", "nit")}
              {renderInput("Código interno de cliente", "codigoInternoCliente")}
              {renderSelectSimple("Estado del cliente", "estadoCliente", estados, true)}
              {renderInput("Sitio web", "sitioWeb")}
              {renderInput("Email corporativo", "emailCorporativo", false, "email")}
              {renderInput("Teléfono corporativo", "telefonoCorporativo")}
              <div className="flex items-center gap-4 md:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(formValues.notificacionesWhatsApp)}
                    onChange={(e) => setFormValues({ ...formValues, notificacionesWhatsApp: e.target.checked })}
                  />
                  Notificaciones WhatsApp
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(formValues.notificacionesEmail)}
                    onChange={(e) => setFormValues({ ...formValues, notificacionesEmail: e.target.checked })}
                  />
                  Notificaciones Email
                </label>
              </div>
              {renderTextArea("Observaciones generales", "observacionesGenerales")}
              {formErrors.nombreComercial && <p className="text-xs text-red-600 md:col-span-2">{formErrors.nombreComercial}</p>}
              {formErrors.nit && <p className="text-xs text-red-600 md:col-span-2">{formErrors.nit}</p>}
            </div>
          )}

          {formValues.tipoCliente !== "Persona" && formTab === "contactos" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderInput("Contacto principal - Nombre", "contactoPrincipalNombre", true)}
              {renderInput("Contacto principal - Cargo", "contactoPrincipalCargo")}
              {renderInput("Contacto principal - Correo", "contactoPrincipalCorreo", true, "email")}
              {renderInput("Contacto principal - Teléfono", "contactoPrincipalTelefono", true)}
              <div className="md:col-span-3 space-y-2">
                <p className="text-sm font-medium text-slate-700">Contactos principales</p>
                {["Representante ventas", "Gerente ventas", "Cuentas por cobrar", "Finanzas", "Facturación", "Contabilidad"].map((rol) => (
                  <div key={rol} className="grid grid-cols-1 md:grid-cols-3 gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <input
                      placeholder={`${rol} - Nombre`}
                      className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      value={formValues.contactosSecundarios?.find((c) => c.rol === rol)?.nombre || ""}
                      onChange={(e) => updateContacto(rol as any, "nombre", e.target.value)}
                    />
                    <input
                      placeholder="Teléfono"
                      className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      value={formValues.contactosSecundarios?.find((c) => c.rol === rol)?.telefono || ""}
                      onChange={(e) => updateContacto(rol as any, "telefono", e.target.value)}
                    />
                    <input
                      placeholder="Correo"
                      className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      value={formValues.contactosSecundarios?.find((c) => c.rol === rol)?.correo || ""}
                      onChange={(e) => updateContacto(rol as any, "correo", e.target.value)}
                    />
                  </div>
                ))}
              </div>
              {formErrors.contactoPrincipalNombre && <p className="text-xs text-red-600 md:col-span-3">{formErrors.contactoPrincipalNombre}</p>}
              {formErrors.contactoPrincipalCorreo && <p className="text-xs text-red-600 md:col-span-3">{formErrors.contactoPrincipalCorreo}</p>}
              {formErrors.contactoPrincipalTelefono && <p className="text-xs text-red-600 md:col-span-3">{formErrors.contactoPrincipalTelefono}</p>}
            </div>
          )}

          {formValues.tipoCliente !== "Persona" && formTab === "referencias" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  placeholder="Nombre"
                  value={newReference.nombre || ""}
                  onChange={(e) => setNewReference({ ...newReference, nombre: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
                <input
                  placeholder="Apellido"
                  value={newReference.apellido || ""}
                  onChange={(e) => setNewReference({ ...newReference, apellido: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
                <input
                  placeholder="Empresa o persona"
                  value={newReference.empresa || ""}
                  onChange={(e) => setNewReference({ ...newReference, empresa: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
                <div className="flex gap-2">
                  <input
                    placeholder="Teléfono"
                    value={newReference.telefono || ""}
                    onChange={(e) => setNewReference({ ...newReference, telefono: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddReference}
                    className="rounded-xl bg-brand-primary px-3 py-2 text-white text-sm font-semibold shadow-sm"
                  >
                    Agregar
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {(formValues.referencias || []).map((ref) => (
                  <div key={ref.id} className="rounded-xl border border-slate-200 p-3 bg-white flex items-center justify-between text-sm">
                    <span>{ref.nombre} {ref.apellido} · {ref.empresa} · {ref.telefono}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormValues({
                          ...formValues,
                          referencias: (formValues.referencias || []).filter((r) => r.id !== ref.id)
                        })
                      }
                      className="text-xs text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formValues.tipoCliente !== "Persona" && formTab === "demografia" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderInput("Dirección fiscal", "direccionFiscal", false, "text", 2)}
              {renderInput("Dirección comercial", "direccionComercial", false, "text", 2)}
              {renderInput("Dirección completa", "direccionCompleta", false, "text", 2)}
              {renderInput("País", "pais")}
              {renderInput("Departamento", "departamento")}
              {renderInput("Municipio", "municipio")}
              {renderInput("Ciudad", "ciudad")}
              {renderInput("Código postal", "codigoPostal")}
              {renderInput("Número exterior", "numeroExterior")}
              {renderInput("Número interior", "numeroInterior")}
              {renderTextArea("Direcciones de operación (planta/bodega/obra)", "direccionesOperacion", 3, "textareaList")}
            </div>
          )}

          {formValues.tipoCliente !== "Persona" && formTab === "legales" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderInput("Representante legal", "representanteLegal", false)}
              {renderInput("DPI del representante", "dpiRepresentante")}
              {renderInput("Patente de comercio", "patenteComercio")}
            </div>
          )}

          {formValues.tipoCliente !== "Persona" && formTab === "empleados" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <input
                  placeholder="Nombre del empleado"
                  value={newEmployee.nombre || ""}
                  onChange={(e) => setNewEmployee({ ...newEmployee, nombre: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
                <input
                  placeholder="DPI"
                  value={newEmployee.dpi || ""}
                  onChange={(e) => setNewEmployee({ ...newEmployee, dpi: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
                <input
                  placeholder="Puesto"
                  value={newEmployee.puesto || ""}
                  onChange={(e) => setNewEmployee({ ...newEmployee, puesto: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
                <input
                  placeholder="Teléfono"
                  value={newEmployee.telefono || ""}
                  onChange={(e) => setNewEmployee({ ...newEmployee, telefono: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
                <input
                  placeholder="Seguro/afiliación"
                  value={newEmployee.seguro || ""}
                  onChange={(e) => setNewEmployee({ ...newEmployee, seguro: e.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
                <button
                  type="button"
                  onClick={handleAddEmployee}
                  className="md:col-span-5 rounded-xl bg-brand-primary px-4 py-2 text-white text-sm font-semibold shadow-sm hover:shadow-md"
                >
                  Agregar empleado
                </button>
              </div>
              <div className="overflow-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Nombre</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">DPI</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Puesto</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Teléfono</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Seguro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {(formValues.empleados || []).map((emp) => (
                      <tr key={emp.id}>
                        <td className="px-3 py-2 text-sm text-slate-700">{emp.nombre}</td>
                        <td className="px-3 py-2 text-sm text-slate-700">{emp.dpi}</td>
                        <td className="px-3 py-2 text-sm text-slate-700">{emp.puesto}</td>
                        <td className="px-3 py-2 text-sm text-slate-700">{emp.telefono}</td>
                        <td className="px-3 py-2 text-sm text-slate-700">{emp.seguro}</td>
                      </tr>
                    ))}
                    {(formValues.empleados || []).length === 0 && (
                      <tr>
                        <td className="px-3 py-4 text-center text-sm text-slate-500" colSpan={5}>
                          Sin empleados registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {formValues.tipoCliente === "Persona" && formTab === "personales" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3 space-y-1">
                <label className="text-sm font-medium text-slate-700">Tipo de cliente</label>
                <select
                  value={formValues.tipoCliente}
                  onChange={(e) => handleTipoChange(e.target.value as TipoClienteValor)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  {tipoOptionsAll.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              {isMinor && (
                <div className="md:col-span-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Este cliente es menor de edad. Debe asignar un tutor responsable.
                </div>
              )}
              <div className="space-y-2 md:col-span-3">
                <label className="text-sm font-medium text-slate-700">Identificación visual</label>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-sm font-semibold text-slate-700">
                    {formValues.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={formValues.fotoUrl} alt="Paciente" className="h-full w-full object-cover" />
                    ) : (
                      (formValues.primerNombre?.[0] || "P").toUpperCase()
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 cursor-pointer">
                      <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleClientPhotoChange} />
                      <span className="text-brand-primary">Seleccionar imagen</span>
                      <span className="text-xs text-slate-500">PNG o JPG</span>
                    </label>
                    {formValues.fotoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormValues({ ...formValues, fotoUrl: "" })}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Quitar imagen
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {renderInput("Primer nombre", "primerNombre", true)}
              {renderInput("Segundo nombre", "segundoNombre")}
              {renderInput("Tercer nombre", "tercerNombre")}
              {renderInput("Primer apellido", "primerApellido", true)}
              {renderInput("Segundo apellido", "segundoApellido")}
              {renderInput("Apellido de casada", "apellidoCasada")}
              {renderInput("Fecha de nacimiento", "fechaNacimiento", true, "date")}
              {renderSelectSimple("Sexo", "sexo", ["Masculino", "Femenino", "Otro"], true)}
              {renderSelectSimple("Estado civil", "estadoCivil", ["Soltero", "Casado", "Unión libre", "Otro"])}
              {renderInput("Nacionalidad", "nacionalidad")}
              {renderInput("DPI o NIT", "nit")}
              {formErrors.primerNombre && <p className="text-xs text-red-600 md:col-span-3">{formErrors.primerNombre}</p>}
              {formErrors.primerApellido && <p className="text-xs text-red-600 md:col-span-3">{formErrors.primerApellido}</p>}
              {formErrors.fechaNacimiento && <p className="text-xs text-red-600 md:col-span-3">{formErrors.fechaNacimiento}</p>}
              {formErrors.sexo && <p className="text-xs text-red-600 md:col-span-3">{formErrors.sexo}</p>}
            </div>
          )}

          {formValues.tipoCliente === "Persona" && formTab === "contacto" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderInput("Celular", "contactoPrincipalTelefono", true)}
              {renderInput("Teléfono", "telefono")}
              {renderInput("Email", "contactoPrincipalCorreo", false, "email")}
              {renderInput("Ocupación", "ocupacion")}
              {renderInput("Lugar de trabajo", "lugarTrabajo")}
              {formErrors.contactoPrincipalTelefono && <p className="text-xs text-red-600 md:col-span-3">{formErrors.contactoPrincipalTelefono}</p>}
              {formErrors.contactoPrincipalCorreo && <p className="text-xs text-red-600 md:col-span-3">{formErrors.contactoPrincipalCorreo}</p>}
            </div>
          )}

          {formValues.tipoCliente === "Persona" && formTab === "salud" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderSelectSimple("Tipo sanguíneo", "tipoSanguineo", ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-", "No refiere"])}
              {renderInput("Seguro (ID)", "seguroId")}
            </div>
          )}

          {formValues.tipoCliente === "Persona" && formTab === "afiliaciones" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Empresa asociada</label>
                  <select
                    value={formValues.empresaAsociadaId || ""}
                    onChange={(e) => setFormValues({ ...formValues, empresaAsociadaId: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  >
                    <option value="">Sin empresa</option>
                    {empresasOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Institución asociada</label>
                  <select
                    value={formValues.institucionAsociadaId || ""}
                    onChange={(e) =>
                      setFormValues({ ...formValues, institucionAsociadaId: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  >
                    <option value="">Sin institución</option>
                    {clientes
                      .filter((c) => c.tipoCliente === "Institución")
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombreComercial || c.razonSocial || `Institución ${c.id}`}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {isMinor && (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    Este cliente es menor de edad. Debe asignar un tutor responsable.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-sm font-medium text-slate-700">Buscar tutor (nombre / DPI / teléfono)</label>
                      <select
                        value={tutorId || ""}
                        onChange={(e) => setTutorId(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      >
                        <option value="">Selecciona tutor</option>
                        {adultPersonas.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombreCompleto || `${p.primerNombre || ""} ${p.primerApellido || ""}`} · DPI {p.nit}
                          </option>
                        ))}
                      </select>
                      {formErrors.tutorId && <p className="text-xs text-red-600">{formErrors.tutorId}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Tipo de relación</label>
                      <select
                        value={tutorRelacion}
                        onChange={(e) => setTutorRelacion(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      >
                        <option value="">Selecciona</option>
                        <option value="Padre">Padre</option>
                        <option value="Madre">Madre</option>
                        <option value="Encargado">Encargado</option>
                        <option value="Tutor legal">Tutor legal</option>
                      </select>
                      {formErrors.tutorRelacion && <p className="text-xs text-red-600">{formErrors.tutorRelacion}</p>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTutorModal(true)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white w-fit"
                  >
                    Registrar nuevo tutor
                  </button>
                </div>
              )}
            </div>
          )}

          {formValues.tipoCliente === "Persona" && formTab === "demografia" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderInput("Dirección", "direccionCompleta", false, "text", 2)}
              {renderInput("Departamento", "departamento")}
              {renderInput("Municipio", "municipio")}
              {renderInput("Ciudad", "ciudad")}
              {renderInput("Código postal", "codigoPostal")}
            </div>
          )}

          {formTab === "documentos" && (
            <div className="space-y-4">
              {documentosDef.map((doc) => (
                <div key={doc.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{doc.nombreDocumento}</p>
                      <p className="text-xs text-slate-500">
                        {doc.esObligatorio ? "Obligatorio" : "Opcional"} · Aplica a {doc.aplicaA}
                        {doc.tieneVencimiento ? " · Requiere vencimiento" : ""}
                      </p>
                    </div>
                    {doc.tieneVencimiento && <Badge variant="warning">Control de vencimiento</Badge>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div className="space-y-2">
                      <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleDocumentFile(doc.id, e)}
                          accept="application/pdf,image/*"
                        />
                        <span className="text-brand-primary">Seleccionar archivo</span>
                        <span className="text-xs text-slate-500">PDF o imagen</span>
                      </label>
                      {formValues.documentos?.find((d) => d.documentoId === doc.id)?.archivoNombre && (
                        <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 border border-slate-200">
                          <span className="text-sm text-slate-700">
                            {formValues.documentos?.find((d) => d.documentoId === doc.id)?.archivoNombre}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocumentFile(doc.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Quitar
                          </button>
                        </div>
                      )}
                      {docErrors[doc.id] && (
                        <p className="text-xs text-red-600">{docErrors[doc.id]}</p>
                      )}
                    </div>
                    {doc.tieneVencimiento && (
                      <div className="space-y-1">
                        <input
                          type="date"
                          min={todayISO}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                          value={
                            formValues.documentos?.find((d) => d.documentoId === doc.id)?.fechaVencimiento ||
                            ""
                          }
                          onChange={(e) => changeDocument(doc.id, "fechaVencimiento", e.target.value)}
                        />
                        {docErrors[doc.id] && (
                          <p className="text-xs text-red-600">{docErrors[doc.id]}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {formTab === "historial" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nueva nota</label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  rows={3}
                  placeholder="Reunión, acuerdos, seguimiento..."
                />
                <button
                  type="button"
                  onClick={handleNoteAdd}
                  className="rounded-xl bg-brand-primary px-4 py-2 text-white text-sm font-semibold shadow-sm hover:shadow-md"
                >
                  Agregar nota
                </button>
              </div>
              <div className="space-y-2">
                {(formValues.notas || []).length === 0 && (
                  <p className="text-sm text-slate-500">Sin notas registradas.</p>
                )}
                {(formValues.notas || []).map((nota) => (
                  <div key={nota.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{nota.fecha}</span>
                      <span>{nota.usuario}</span>
                    </div>
                    <p className="text-sm text-slate-800 mt-1">{nota.texto}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <QuickPatientModal
        open={showQuickModal}
        onClose={() => setShowQuickModal(false)}
        onSave={handleQuickPatientSave}
        successMessage={success && filters.tipo === "Persona" ? success : undefined}
        empresas={empresasOptions}
      />
      {showTutorModal && (
        <Modal
          open={showTutorModal}
          onClose={() => setShowTutorModal(false)}
          title="Registrar nuevo tutor"
          footer={
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTutorModal(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTutor}
                className="rounded-xl bg-brand-primary px-4 py-2 text-white text-sm font-semibold shadow-sm hover:shadow-md"
              >
                Guardar tutor
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Nombres"
              value={newTutorForm.nombres}
              onChange={(e) => setNewTutorForm({ ...newTutorForm, nombres: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <input
              placeholder="Apellidos"
              value={newTutorForm.apellidos}
              onChange={(e) => setNewTutorForm({ ...newTutorForm, apellidos: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <input
              placeholder="DPI (13 dígitos)"
              value={newTutorForm.dpi}
              onChange={(e) => setNewTutorForm({ ...newTutorForm, dpi: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <input
              type="date"
              placeholder="Fecha de nacimiento"
              value={newTutorForm.fecha}
              onChange={(e) => setNewTutorForm({ ...newTutorForm, fecha: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <input
              placeholder="Celular"
              value={newTutorForm.celular}
              onChange={(e) => setNewTutorForm({ ...newTutorForm, celular: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <input
              placeholder="Email"
              type="email"
              value={newTutorForm.email}
              onChange={(e) => setNewTutorForm({ ...newTutorForm, email: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </Modal>
      )}
      <ImportClientsModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        clientes={clientes}
        onApply={(rows) => {
          const creates = rows.filter((r) => r.accion === "Crear" && r.data);
          const updates = rows.filter((r) => r.accion === "Actualizar" && r.data);

          // Crear
          creates.forEach((row) => {
            const nextId = clientes.length
              ? Math.max(...clientes.map((c) => c.id)) + 1
              : 1;
            addOrUpdateCliente({
              id: nextId,
              tipoCliente: (row.data?.tipoCliente as any) || "Empresa",
              ...row.data
            } as Cliente);
            if (row.tutorId && row.data?.tipoCliente === "Persona") {
              addOrUpdateRelacion(nextId, row.tutorId, (row.tutorRelacion as any) || "Encargado");
            }
          });

          // Actualizar
          updates.forEach((row) => {
            const match = clientes.find((c) => {
              if (row.data?.tipoCliente === "Persona") {
                return (c.nit || "").toLowerCase() === (row.data?.nit || "").toLowerCase();
              }
              return (
                (c.nit || "").toLowerCase() === (row.data?.nit || "").toLowerCase() ||
                (c.codigoInternoCliente || "").toLowerCase() === (row.data?.codigoInternoCliente || "").toLowerCase()
              );
            });
            if (match) {
              addOrUpdateCliente({ ...match, ...row.data, id: match.id });
              if (row.tutorId && row.data?.tipoCliente === "Persona") {
                addOrUpdateRelacion(match.id, row.tutorId, (row.tutorRelacion as any) || "Encargado");
              }
            }
          });

          setSuccess("Importación aplicada");
        }}
      />
    </div>
  );

  function renderInput(
    label: string,
    key: keyof Cliente,
    required = false,
    type = "text",
    span?: number
  ) {
    const isArea = type === "text" && span === 2;
    return (
      <div className={cn("space-y-1", span === 2 ? "md:col-span-2" : "")}>
        <label className="text-sm font-medium text-slate-700" htmlFor={key as string}>
          {label}
        </label>
        <input
          id={key as string}
          type={type === "textareaList" ? "text" : type}
          value={
            type === "textareaList"
              ? (formValues.direccionesOperacion || []).join("; ")
              : (formValues as any)[key] || ""
          }
          onChange={(e) =>
            setFormValues({
              ...formValues,
              [key]: type === "textareaList" ? e.target.value.split(";").map((v) => v.trim()).filter(Boolean) : e.target.value
            })
          }
          className={cn(
            "w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20",
            isArea && "h-20"
          )}
          placeholder={label}
        />
        {required && formErrors[key as string] && (
          <p className="text-xs text-red-600">{formErrors[key as string]}</p>
        )}
      </div>
    );
  }

  function renderTextArea(label: string, key: keyof Cliente, rows = 3, mode: "default" | "textareaList" = "default") {
    if (mode === "textareaList") {
      return renderInput(label, key, false, "textareaList");
    }
    return (
      <div className="space-y-1 md:col-span-2">
        <label className="text-sm font-medium text-slate-700" htmlFor={key as string}>
          {label}
        </label>
        <textarea
          id={key as string}
          rows={rows}
          value={(formValues as any)[key] || ""}
          onChange={(e) => setFormValues({ ...formValues, [key]: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        />
      </div>
    );
  }

  function renderSelectSimple(
    label: string,
    key: keyof Cliente,
    options: readonly string[],
    required = false
  ) {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor={key as string}>
          {label}
        </label>
        <select
          id={key as string}
          value={(formValues as any)[key] || ""}
          onChange={(e) => setFormValues({ ...formValues, [key]: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        >
          <option value="">Selecciona</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {required && formErrors[key as string] && (
          <p className="text-xs text-red-600">{formErrors[key as string]}</p>
        )}
      </div>
    );
  }

  function renderSelectFrom<T extends { id: number }>(
    label: string,
    key: keyof Cliente,
    options: T[],
    labelKey: keyof T,
    required = false
  ) {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor={key as string}>
          {label}
        </label>
        <select
          id={key as string}
          value={(formValues as any)[key] || ""}
          onChange={(e) => setFormValues({ ...formValues, [key]: Number(e.target.value) })}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        >
          <option value="">Selecciona</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {(opt as any)[labelKey]}
            </option>
          ))}
        </select>
        {required && formErrors[key as string] && (
          <p className="text-xs text-red-600">{formErrors[key as string]}</p>
        )}
      </div>
    );
  }
}
