"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useUserData } from "@/components/users/UserProvider";
import { cn, isValidEmail } from "@/lib/utils";
import { DocumentoUsuario, Usuario } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";

type FormTab = "personales" | "academicos" | "laborales" | "demograficos" | "documentos";

const estadoCivil = ["Soltero", "Casado", "Unión libre", "Divorciado"];
const sexoOptions = ["Masculino", "Femenino", "Otro"];
const tipoPagoOptions = ["Mensual", "Quincenal", "Otro"];
const tipoUsuarioOptions = ["Clínico", "Administrativo", "Soporte"] as const;
const estadoOptions = ["Activo", "Inactivo", "Suspendido"] as const;

const perPage = 10;

export default function UsuariosLista() {
  const {
    usuarios,
    roles,
    sucursales,
    tiposContrato,
    tiposJornada,
    documentosDef,
    addOrUpdateUsuario,
    deactivateUsuario
  } = useUserData();

  const [filters, setFilters] = useState({ search: "", rolId: "", sucursalId: "", estado: "" });
  const [page, setPage] = useState(1);
  const [formTab, setFormTab] = useState<FormTab>("personales");
  const [success, setSuccess] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [docErrors, setDocErrors] = useState<Record<number, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const todayISO = useMemo(() => new Date().toISOString().split("T")[0], []);

  const emptyForm: Partial<Usuario> = {
    primerNombre: "",
    primerApellido: "",
    correo: "",
    rolId: 0,
    sucursalId: 0,
    tipoUsuario: "Administrativo",
    estado: "Activo",
    tipoContratoId: 0,
    fotoUrl: ""
  };
  const [formValues, setFormValues] = useState<Partial<Usuario>>(emptyForm);

  const filterUsuarios = useMemo(() => {
    const searchTerm = filters.search.toLowerCase();
    return usuarios.filter((u) => {
      const fullName = `${u.primerNombre} ${u.segundoNombre || ""} ${u.primerApellido} ${u.segundoApellido || ""}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchTerm) || (u.correo || "").toLowerCase().includes(searchTerm);
      const matchesRol = filters.rolId ? u.rolId === Number(filters.rolId) : true;
      const matchesSucursal = filters.sucursalId ? u.sucursalId === Number(filters.sucursalId) : true;
      const matchesEstado = filters.estado ? u.estado === filters.estado : true;
      return matchesSearch && matchesRol && matchesSucursal && matchesEstado;
    });
  }, [filters, usuarios]);

  const totalPages = Math.max(1, Math.ceil(filterUsuarios.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const paginated = filterUsuarios.slice((currentPage - 1) * perPage, currentPage * perPage);

  const resetForm = () => {
    setFormValues(emptyForm);
    setFormErrors({});
    setDocErrors({});
    setFormTab("personales");
    setEditingId(null);
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formValues.primerNombre) errors.primerNombre = "Requerido";
    if (!formValues.primerApellido) errors.primerApellido = "Requerido";
    if (!formValues.correo) errors.correo = "Requerido";
    else if (!isValidEmail(formValues.correo)) errors.correo = "Correo inválido";
    if (!formValues.sucursalId) errors.sucursalId = "Selecciona una sucursal";
    if (!formValues.rolId) errors.rolId = "Selecciona un rol";
    if (!formValues.tipoContratoId) errors.tipoContratoId = "Selecciona un tipo de contrato";
    setFormErrors(errors);
    const hasDocErrors = Object.keys(docErrors).length > 0;
    return Object.keys(errors).length === 0 && !hasDocErrors;
  };

  const handleSave = () => {
    if (!validate()) return;
    const nextId = editingId ?? (usuarios.length ? Math.max(...usuarios.map((u) => u.id)) + 1 : 1);
    const payload: Usuario = {
      id: nextId,
      primerNombre: formValues.primerNombre || "",
      segundoNombre: formValues.segundoNombre,
      tercerNombre: formValues.tercerNombre,
      primerApellido: formValues.primerApellido || "",
      segundoApellido: formValues.segundoApellido,
      apellidoCasada: formValues.apellidoCasada,
      fechaNacimiento: formValues.fechaNacimiento,
      identificacion: formValues.identificacion,
      celular: formValues.celular,
      correo: formValues.correo || "",
      estadoCivil: formValues.estadoCivil,
      sexo: formValues.sexo,
      fotoUrl: formValues.fotoUrl,
      rolId: Number(formValues.rolId),
      sucursalId: Number(formValues.sucursalId),
      tipoUsuario: (formValues.tipoUsuario as Usuario["tipoUsuario"]) || "Administrativo",
      estado: (formValues.estado as Usuario["estado"]) || "Activo",
      profesion: formValues.profesion,
      tituloAcademico: formValues.tituloAcademico,
      lugarEstudios: formValues.lugarEstudios,
      numeroColegiado: formValues.numeroColegiado,
      fechaInicioEstudios: formValues.fechaInicioEstudios,
      fechaFinEstudios: formValues.fechaFinEstudios,
      comentariosAcademicos: formValues.comentariosAcademicos,
      puesto: formValues.puesto,
      salarioBase: formValues.salarioBase ? Number(formValues.salarioBase) : undefined,
      bonificacion: formValues.bonificacion ? Number(formValues.bonificacion) : undefined,
      tipoPago: formValues.tipoPago,
      tipoJornadaId: formValues.tipoJornadaId ? Number(formValues.tipoJornadaId) : undefined,
      tipoContratoId: Number(formValues.tipoContratoId),
      fechaInicioLabores: formValues.fechaInicioLabores,
      fechaFinLabores: formValues.fechaFinLabores,
      direccion: formValues.direccion,
      pais: formValues.pais,
      departamento: formValues.departamento,
      municipio: formValues.municipio,
      ciudad: formValues.ciudad,
      codigoPostal: formValues.codigoPostal,
      numeroExterior: formValues.numeroExterior,
      numeroInterior: formValues.numeroInterior,
      documentos: formValues.documentos || documentosDef.map((d) => ({ documentoId: d.id }))
    };

    addOrUpdateUsuario(payload);
    setSuccess("Usuario guardado correctamente.");
    resetForm();
    setShowModal(false);
  };

  const handleEdit = (usuario: Usuario) => {
    setEditingId(usuario.id);
    setFormValues(usuario);
    setFormTab("personales");
    setSuccess("");
    setShowModal(true);
  };

  const fullName = (u: Usuario) =>
    [u.primerNombre, u.segundoNombre, u.tercerNombre, u.primerApellido, u.segundoApellido, u.apellidoCasada]
      .filter(Boolean)
      .join(" ");

  const initials = (u: Usuario) => {
    const parts = fullName(u).split(" ").filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  };

  const roleName = (id: number) => roles.find((r) => r.id === id)?.nombre || "Rol";
  const sucursalName = (id: number) => sucursales.find((s) => s.id === id)?.nombre || "Sucursal";

  const badgeVariant = (estado: Usuario["estado"]) =>
    estado === "Activo" ? "success" : estado === "Suspendido" ? "warning" : "neutral";

  const statusBadge = (estado: Usuario["estado"]) => <Badge variant={badgeVariant(estado)}>{estado}</Badge>;

  const changeDocument = (documentoId: number, key: keyof DocumentoUsuario, value: string) => {
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

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 py-4">
          <div>
            <label className="text-xs font-medium text-slate-600">Búsqueda</label>
            <input
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                setPage(1);
              }}
              placeholder="Nombre o correo"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Rol</label>
            <select
              value={filters.rolId}
              onChange={(e) => {
                setFilters({ ...filters, rolId: e.target.value });
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Todos</option>
              {roles.map((rol) => (
                <option key={rol.id} value={rol.id}>
                  {rol.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Sucursal</label>
            <select
              value={filters.sucursalId}
              onChange={(e) => {
                setFilters({ ...filters, sucursalId: e.target.value });
                setPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Todas</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
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
              {estadoOptions.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Listado</CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetForm();
                setSuccess("");
                setShowModal(true);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Nuevo expediente
            </button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Sucursal
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
              {paginated.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-700">{u.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-xs font-semibold text-slate-700">
                        {u.fotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.fotoUrl} alt={fullName(u)} className="h-full w-full object-cover" />
                        ) : (
                          initials(u)
                        )}
                      </div>
                      <span>{fullName(u)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{roleName(u.rolId)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{sucursalName(u.sucursalId)}</td>
                  <td className="px-4 py-3">{statusBadge(u.estado)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 text-sm font-semibold">
                      <button
                        onClick={() => handleEdit(u)}
                        className="text-brand-primary hover:underline"
                      >
                        Editar
                      </button>
                      <button className="text-slate-600 hover:underline">Ver</button>
                      <button
                        onClick={() => deactivateUsuario(u.id)}
                        className="text-red-600 hover:underline"
                      >
                        Desactivar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={6}>
                    No hay usuarios con los filtros seleccionados.
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
        onClose={() => {
          setShowModal(false);
        }}
        title={editingId ? "Editar usuario" : "Nuevo usuario"}
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
                className="rounded-xl bg-brand-primary px-4 py-2 text-white text-sm font-semibold shadow-sm hover:shadow-md"
              >
                Guardar usuario
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(["personales", "academicos", "laborales", "demograficos", "documentos"] as FormTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFormTab(tab)}
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-medium",
                  formTab === tab ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/30" : "bg-slate-100 text-slate-700"
                )}
              >
                {tab === "personales" && "Datos personales"}
                {tab === "academicos" && "Datos académicos"}
                {tab === "laborales" && "Datos laborales"}
                {tab === "demograficos" && "Datos demográficos"}
                {tab === "documentos" && "Documentos"}
              </button>
            ))}
          </div>

          {formTab === "personales" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderInput("Primer nombre", "primerNombre", true)}
              {renderInput("Segundo nombre", "segundoNombre")}
              {renderInput("Tercer nombre", "tercerNombre")}
              {renderInput("Primer apellido", "primerApellido", true)}
              {renderInput("Segundo apellido", "segundoApellido")}
              {renderInput("Apellido de casada", "apellidoCasada")}
              {renderInput("Fecha de nacimiento", "fechaNacimiento", false, "date")}
              {renderInput("Identificación (DPI)", "identificacion")}
              {renderInput("Celular", "celular")}
              {renderInput("Correo", "correo", true, "email")}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Foto de perfil</label>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-sm font-semibold text-slate-700">
                    {formValues.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={formValues.fotoUrl} alt="Foto" className="h-full w-full object-cover" />
                    ) : (
                      (formValues.primerNombre?.[0] || "U").toUpperCase()
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoChange(e)}
                    className="text-sm text-slate-600"
                  />
                  {formValues.fotoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormValues({ ...formValues, fotoUrl: "" })}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
              {renderSelect("Estado civil", "estadoCivil", estadoCivil)}
              {renderSelect("Sexo", "sexo", sexoOptions)}
              {renderSelect("Tipo de usuario", "tipoUsuario", tipoUsuarioOptions)}
              {renderSelect("Estado", "estado", estadoOptions)}
            </div>
          )}

          {formTab === "academicos" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderInput("Profesión", "profesion")}
              {renderInput("Título académico", "tituloAcademico")}
              {renderInput("Lugar de estudios", "lugarEstudios")}
              {renderInput("Número de colegiado", "numeroColegiado")}
              {renderInput("Fecha inicio estudios", "fechaInicioEstudios", false, "date")}
              {renderInput("Fecha fin estudios", "fechaFinEstudios", false, "date")}
              {renderTextArea("Comentarios académicos", "comentariosAcademicos", 3)}
            </div>
          )}

          {formTab === "laborales" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderSelectFrom("Sucursal", "sucursalId", sucursales, "nombre", true)}
              {renderInput("Puesto", "puesto")}
              {renderNumber("Salario base", "salarioBase")}
              {renderNumber("Bonificación", "bonificacion")}
              {renderSelect("Tipo de pago", "tipoPago", tipoPagoOptions)}
              {renderSelectFrom("Tipo de jornada", "tipoJornadaId", tiposJornada, "nombre")}
              {renderSelectFrom("Tipo de contrato", "tipoContratoId", tiposContrato, "nombre", true)}
              {renderInput("Fecha inicio labores", "fechaInicioLabores", false, "date")}
              {renderInput("Fecha fin labores", "fechaFinLabores", false, "date")}
              {renderSelectFrom("Rol", "rolId", roles, "nombre", true)}
            </div>
          )}

          {formTab === "demograficos" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderInput("Dirección", "direccion")}
              {renderInput("País", "pais")}
              {renderInput("Departamento", "departamento")}
              {renderInput("Municipio", "municipio")}
              {renderInput("Ciudad", "ciudad")}
              {renderInput("Código postal", "codigoPostal")}
              {renderInput("Número exterior", "numeroExterior")}
              {renderInput("Número interior", "numeroInterior")}
            </div>
          )}

          {formTab === "documentos" && (
            <div className="space-y-4">
              {documentosDef.map((doc) => (
                <div key={doc.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{doc.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {doc.obligatorio ? "Obligatorio" : "Opcional"}{" "}
                        {doc.requiereVencimiento ? "· Requiere fecha de vencimiento" : ""}
                      </p>
                    </div>
                    {doc.requiereVencimiento && (
                      <Badge variant="warning">Control de vencimiento</Badge>
                    )}
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
                    </div>
                    {doc.requiereVencimiento && (
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
        </div>
      </Modal>
    </div>
  );

  function renderInput(label: string, key: keyof Usuario, required = false, type = "text") {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor={key}>
          {label}
        </label>
        <input
          id={key}
          type={type}
          value={(formValues as any)[key] || ""}
          onChange={(e) => setFormValues({ ...formValues, [key]: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          placeholder={label}
        />
        {required && formErrors[key as string] && (
          <p className="text-xs text-red-600">{formErrors[key as string]}</p>
        )}
      </div>
    );
  }

  function renderNumber(label: string, key: keyof Usuario) {
    return renderInput(label, key, false, "number");
  }

  function renderTextArea(label: string, key: keyof Usuario, rows = 3) {
    return (
      <div className="space-y-1 md:col-span-3">
        <label className="text-sm font-medium text-slate-700" htmlFor={key}>
          {label}
        </label>
        <textarea
          id={key}
          rows={rows}
          value={(formValues as any)[key] || ""}
          onChange={(e) => setFormValues({ ...formValues, [key]: e.target.value })}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        />
      </div>
    );
  }

  function renderSelect(label: string, key: keyof Usuario, options: readonly string[], required = false) {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor={key}>
          {label}
        </label>
        <select
          id={key}
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
    key: keyof Usuario,
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
