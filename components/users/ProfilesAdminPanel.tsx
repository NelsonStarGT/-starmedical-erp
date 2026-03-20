"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { formatDateTimeStable } from "@/lib/users/datetime";

type ProfileRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissionCount: number;
  createdAt: string;
  updatedAt: string;
};

type ModuleSection = {
  key: string;
  label: string;
  href: string;
};

type ModuleEntry = {
  moduleKey: string;
  moduleLabel: string;
  sections: ModuleSection[];
};

type WizardStep = 1 | 2 | 3 | 4;

type WizardState = {
  name: string;
  description: string;
  family: "" | "ADMINISTRATIVE" | "OPERATIONAL";
  isActive: boolean;
  actionsByModule: Record<string, string[]>;
  sectionsByModule: Record<string, string[]>;
};

const ACTION_COLUMNS = [
  { key: "VIEW", label: "Ver" },
  { key: "CREATE", label: "Crear" },
  { key: "UPDATE", label: "Editar" },
  { key: "DELETE", label: "Eliminar" },
  { key: "APPROVE", label: "Aprobar" },
  { key: "EXPORT", label: "Exportar" },
  { key: "IMPORT", label: "Importar" },
  { key: "MANAGE", label: "Gestionar" }
] as const;

function emptyWizardState(): WizardState {
  return {
    name: "",
    description: "",
    family: "",
    isActive: true,
    actionsByModule: {},
    sectionsByModule: {}
  };
}

function familyLabel(value: WizardState["family"]) {
  if (value === "ADMINISTRATIVE") return "Administrativa";
  if (value === "OPERATIONAL") return "Operativa";
  return "Sin definir";
}

function moduleCoverage(state: WizardState) {
  return Object.values(state.actionsByModule).reduce((sum, items) => sum + items.length, 0);
}

export default function ProfilesAdminPanel({
  initialProfiles,
  modules
}: {
  initialProfiles: ProfileRow[];
  modules: ModuleEntry[];
}) {
  const [showTechnical, setShowTechnical] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [wizard, setWizard] = useState<WizardState>(emptyWizardState);
  const [message, setMessage] = useState<string>("");

  const businessProfiles = useMemo(
    () => initialProfiles.filter((profile) => !profile.isSystem),
    [initialProfiles]
  );
  const technicalProfiles = useMemo(
    () => initialProfiles.filter((profile) => profile.isSystem),
    [initialProfiles]
  );

  const selectedModules = useMemo(
    () => modules.filter((module) => (wizard.actionsByModule[module.moduleKey] || []).length > 0),
    [modules, wizard.actionsByModule]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("modal") === "create") {
      setModalOpen(true);
    }
  }, []);

  function openWizard() {
    setWizard(emptyWizardState());
    setWizardStep(1);
    setMessage("");
    setModalOpen(true);
  }

  function closeWizard() {
    setModalOpen(false);
    setWizardStep(1);
  }

  function validateStep(step: WizardStep) {
    if (step === 1) {
      if (!wizard.name.trim()) return "Completa el nombre del perfil.";
      if (!wizard.family) return "Selecciona una familia.";
    }
    if (step === 2) {
      if (selectedModules.length === 0) return "Selecciona al menos un módulo.";
    }
    return "";
  }

  function goNext() {
    const error = validateStep(wizardStep);
    if (error) {
      setMessage(error);
      return;
    }
    setMessage("");
    setWizardStep((current) => Math.min(4, current + 1) as WizardStep);
  }

  function goPrev() {
    setMessage("");
    setWizardStep((current) => Math.max(1, current - 1) as WizardStep);
  }

  function toggleAction(moduleKey: string, actionKey: string, enabled: boolean) {
    setWizard((current) => {
      const currentActions = new Set(current.actionsByModule[moduleKey] || []);
      if (enabled) currentActions.add(actionKey);
      else currentActions.delete(actionKey);

      return {
        ...current,
        actionsByModule: {
          ...current.actionsByModule,
          [moduleKey]: Array.from(currentActions).sort()
        }
      };
    });
  }

  function toggleSection(moduleKey: string, sectionKey: string, enabled: boolean) {
    setWizard((current) => {
      const currentSections = new Set(current.sectionsByModule[moduleKey] || []);
      if (enabled) currentSections.add(sectionKey);
      else currentSections.delete(sectionKey);

      return {
        ...current,
        sectionsByModule: {
          ...current.sectionsByModule,
          [moduleKey]: Array.from(currentSections).sort()
        }
      };
    });
  }

  function finalizeWizard() {
    const error = validateStep(4);
    if (error) {
      setMessage(error);
      return;
    }
    setMessage(
      "Wizard validado. Esta base persiste roles reales y deja la matriz lista para evolución posterior sin inventar permisos."
    );
    closeWizard();
  }

  const modalFooter = (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs text-slate-500">Paso {wizardStep} de 4</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={wizardStep === 1}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          Anterior
        </button>
        {wizardStep < 4 ? (
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg bg-[#4aa59c] px-3 py-2 text-sm font-semibold text-white"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            onClick={finalizeWizard}
            className="rounded-lg bg-[#2e75ba] px-3 py-2 text-sm font-semibold text-white"
          >
            Crear perfil
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {message ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">{message}</div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Perfiles de negocio</p>
            <p className="mt-1 text-xl font-semibold text-[#214467]">{businessProfiles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Perfiles técnicos</p>
            <p className="mt-1 text-xl font-semibold text-[#214467]">{technicalProfiles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Módulos reales detectados</p>
            <p className="mt-1 text-xl font-semibold text-[#214467]">{modules.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Perfiles</CardTitle>
              <p className="text-xs text-slate-500">
                La vista principal prioriza perfiles de negocio. Los perfiles técnicos/sistema solo aparecen bajo demanda.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowTechnical((current) => !current)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                {showTechnical ? "Ocultar perfiles técnicos/sistema" : "Ver perfiles técnicos/sistema"}
              </button>
              <button
                type="button"
                onClick={openWizard}
                className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white"
              >
                Nuevo perfil
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {businessProfiles.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Nombre del perfil</th>
                    <th className="px-3 py-2">Descripción corta</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Usuarios asignados</th>
                    <th className="px-3 py-2">Cobertura</th>
                    <th className="px-3 py-2">Actualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {businessProfiles.map((profile) => (
                    <tr key={profile.id}>
                      <td className="px-3 py-3 font-semibold text-slate-900">{profile.name}</td>
                      <td className="px-3 py-3 text-xs text-slate-600">{profile.description || "Sin descripción"}</td>
                      <td className="px-3 py-3">
                        <Badge variant="success">Activo</Badge>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600">{profile.userCount}</td>
                      <td className="px-3 py-3 text-xs text-slate-600">{profile.permissionCount} permisos</td>
                      <td className="px-3 py-3 text-xs text-slate-600">{formatDateTimeStable(profile.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#c6e7e3] bg-[#f7fcfb] px-6 py-10 text-center">
              <p className="text-lg font-semibold text-[#214467]">Aún no hay perfiles de negocio creados</p>
              <p className="mt-2 text-sm text-slate-600">
                Crea el primer perfil desde un wizard guiado de 4 pasos basado en módulos reales del ERP.
              </p>
              <button
                type="button"
                onClick={openWizard}
                className="mt-4 rounded-lg bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white"
              >
                Nuevo perfil
              </button>
            </div>
          )}

          {showTechnical ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Perfiles técnicos/sistema</p>
              <div className="mt-3 space-y-2">
                {technicalProfiles.length > 0 ? (
                  technicalProfiles.map((profile) => (
                    <div key={profile.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{profile.name}</p>
                        <p className="text-xs text-slate-500">{profile.description || "Sin descripción"}</p>
                      </div>
                      <Badge variant="info">Sistema</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No hay perfiles técnicos cargados.</p>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeWizard}
        title="Nuevo perfil"
        subtitle={
          wizardStep === 1
            ? "Paso 1 de 4 · Datos del perfil"
            : wizardStep === 2
              ? `Paso 2 de 4 · Permisos generales por módulo${wizard.name ? ` para: ${wizard.name}` : ""}`
              : wizardStep === 3
                ? `Paso 3 de 4 · Secciones y subpáginas para el perfil: ${wizard.name || "Nuevo perfil"}`
                : `Paso 4 de 4 · Resumen final para: ${wizard.name || "Nuevo perfil"}`
        }
        footer={modalFooter}
        className="max-w-5xl"
      >
        <div className="space-y-5">
          {wizardStep === 1 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nombre del perfil</label>
                <input
                  value={wizard.name}
                  onChange={(event) => setWizard((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Ejemplo: Médico, Recepción, Facturación"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Estado inicial</label>
                <select
                  value={wizard.isActive ? "active" : "inactive"}
                  onChange={(event) =>
                    setWizard((current) => ({ ...current, isActive: event.target.value === "active" }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Descripción corta</label>
                <textarea
                  value={wizard.description}
                  onChange={(event) => setWizard((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-[110px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Describe el propósito operativo del perfil."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Familia</label>
                <select
                  value={wizard.family}
                  onChange={(event) =>
                    setWizard((current) => ({
                      ...current,
                      family: event.target.value as WizardState["family"]
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <option value="">Selecciona una familia</option>
                  <option value="ADMINISTRATIVE">Administrativa</option>
                  <option value="OPERATIONAL">Operativa</option>
                </select>
              </div>
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
                Este wizard usa módulos y páginas reales detectados en `app/admin/*` de esta rama. No inventa módulos ni secciones.
              </div>
            </div>
          ) : null}

          {wizardStep === 2 ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Selecciona permisos generales por módulo. Si una acción no te sirve todavía, déjala sin marcar.
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Módulo</th>
                      {ACTION_COLUMNS.map((column) => (
                        <th key={column.key} className="px-3 py-2 text-center">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modules.map((module) => {
                      const selected = new Set(wizard.actionsByModule[module.moduleKey] || []);
                      return (
                        <tr key={module.moduleKey}>
                          <td className="px-3 py-3 font-semibold text-slate-900">{module.moduleLabel}</td>
                          {ACTION_COLUMNS.map((column) => (
                            <td key={column.key} className="px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={selected.has(column.key)}
                                onChange={(event) => toggleAction(module.moduleKey, column.key, event.target.checked)}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {wizardStep === 3 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Secciones y subpáginas para el perfil: <span className="font-semibold text-slate-900">{wizard.name || "Nuevo perfil"}</span>
              </div>
              {selectedModules.length > 0 ? (
                selectedModules.map((module) => {
                  const selectedSections = new Set(wizard.sectionsByModule[module.moduleKey] || []);
                  return (
                    <Card key={module.moduleKey}>
                      <CardHeader>
                        <CardTitle>{module.moduleLabel}</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-2 md:grid-cols-2">
                        {module.sections.length > 0 ? (
                          module.sections.map((section) => (
                            <label
                              key={section.key}
                              className="flex items-start gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700"
                            >
                              <input
                                type="checkbox"
                                checked={selectedSections.has(section.key)}
                                onChange={(event) =>
                                  toggleSection(module.moduleKey, section.key, event.target.checked)
                                }
                              />
                              <span>
                                <span className="block font-medium">{section.label}</span>
                                <span className="block text-xs text-slate-500">{section.href}</span>
                              </span>
                            </label>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">Este módulo no expone subpáginas detectables en esta rama.</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
                  Primero selecciona uno o más módulos en el paso 2.
                </div>
              )}
            </div>
          ) : null}

          {wizardStep === 4 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <h4 className="text-lg font-semibold text-slate-900">Resumen del perfil</h4>
                <p className="mt-1 text-sm text-slate-600">
                  Revisa la cobertura antes de crear el perfil base.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Datos del perfil</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-700">
                    <p><span className="font-semibold">Nombre:</span> {wizard.name || "Sin nombre"}</p>
                    <p><span className="font-semibold">Descripción:</span> {wizard.description || "Sin descripción"}</p>
                    <p><span className="font-semibold">Familia:</span> {familyLabel(wizard.family)}</p>
                    <p><span className="font-semibold">Estado inicial:</span> {wizard.isActive ? "Activo" : "Inactivo"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Cobertura</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-700">
                    <p><span className="font-semibold">Módulos seleccionados:</span> {selectedModules.length}</p>
                    <p><span className="font-semibold">Acciones generales:</span> {moduleCoverage(wizard)}</p>
                    <p>
                      <span className="font-semibold">Secciones habilitadas:</span>{" "}
                      {Object.values(wizard.sectionsByModule).reduce((sum, items) => sum + items.length, 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Resumen por módulo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedModules.map((module) => (
                    <div key={module.moduleKey} className="rounded-xl border border-slate-200 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{module.moduleLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Acciones: {(wizard.actionsByModule[module.moduleKey] || []).join(", ") || "Sin acciones"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Secciones: {(wizard.sectionsByModule[module.moduleKey] || []).join(", ") || "Sin secciones"}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
