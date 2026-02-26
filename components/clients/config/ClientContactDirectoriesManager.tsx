"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Save } from "lucide-react";
import {
  actionCreateClientContactDepartment,
  actionCreateClientContactJobTitle,
  actionCreateClientPbxCategory,
  actionLoadClientContactDepartmentDefaults,
  actionLoadClientContactJobTitleDefaults,
  actionLoadClientPbxCategoryDefaults,
  actionSaveClientContactDepartmentJobTitles,
  actionSetClientContactDepartmentActive,
  actionSetClientContactJobTitleActive,
  actionSetClientPbxCategoryActive,
  actionUpdateClientContactDepartment,
  actionUpdateClientContactJobTitle,
  actionUpdateClientPbxCategory
} from "@/app/admin/clientes/actions";
import ConfigDataTable, { type ConfigDataTableAction, type ConfigDataTableColumn } from "@/components/clients/config/ConfigDataTable";
import SearchableMultiSelect from "@/components/ui/SearchableMultiSelect";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { cn } from "@/lib/utils";

type DirectoryRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

type CorrelationRow = {
  departmentId: string;
  jobTitleIds: string[];
};

type DirectoryPanelMode = "department" | "jobTitle" | "pbxCategory";
type DirectoryAction = "edit" | "toggle";

const DIRECTORY_COLUMNS: ConfigDataTableColumn<DirectoryRow>[] = [
  {
    id: "name",
    header: "Nombre",
    render: (row) => <span className="font-semibold text-slate-900">{row.name}</span>
  },
  {
    id: "code",
    header: "Código",
    render: (row) => <span className="font-mono text-xs text-slate-600">{row.code}</span>
  },
  {
    id: "order",
    header: "Orden",
    render: (row) => <span className="text-slate-600">{row.sortOrder}</span>
  },
  {
    id: "status",
    header: "Estado",
    render: (row) => (
      <span
        className={cn(
          "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
          row.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"
        )}
      >
        {row.isActive ? "Activo" : "Inactivo"}
      </span>
    )
  }
];

function DirectoryPanel({
  mode,
  title,
  subtitle,
  rows,
  source = "db",
  onLoadDefaults
}: {
  mode: DirectoryPanelMode;
  title: string;
  subtitle: string;
  rows: DirectoryRow[];
  source?: "db" | "fallback";
  onLoadDefaults?: (() => Promise<{ created: number; reactivated: number }>) | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoadingDefaults, startLoadingDefaults] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [defaultsMessage, setDefaultsMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("100");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; code: string; description: string; sortOrder: string }>({
    name: "",
    code: "",
    description: "",
    sortOrder: "100"
  });

  const sorted = useMemo(
    () => [...rows].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es")),
    [rows]
  );
  const activeCount = useMemo(() => rows.filter((row) => row.isActive).length, [rows]);
  const inactiveCount = useMemo(() => rows.filter((row) => !row.isActive).length, [rows]);

  const rowActions = (row: DirectoryRow): ConfigDataTableAction<DirectoryRow>[] => [
    { id: "edit", label: "Editar" },
    { id: "toggle", label: row.isActive ? "Desactivar" : "Activar" }
  ];

  const create = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        if (mode === "department") {
          await actionCreateClientContactDepartment({
            name,
            code,
            description,
            sortOrder: Number(sortOrder)
          });
        } else if (mode === "jobTitle") {
          await actionCreateClientContactJobTitle({
            name,
            code,
            description,
            sortOrder: Number(sortOrder)
          });
        } else {
          await actionCreateClientPbxCategory({
            name,
            code,
            description,
            sortOrder: Number(sortOrder)
          });
        }
        setName("");
        setCode("");
        setDescription("");
        setSortOrder("100");
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo crear el registro.");
      }
    });
  };

  const saveEdit = () => {
    if (!editingId || !editDraft.name.trim()) return;
    startTransition(async () => {
      try {
        if (mode === "department") {
          await actionUpdateClientContactDepartment({
            id: editingId,
            name: editDraft.name,
            code: editDraft.code,
            description: editDraft.description,
            sortOrder: Number(editDraft.sortOrder)
          });
        } else if (mode === "jobTitle") {
          await actionUpdateClientContactJobTitle({
            id: editingId,
            name: editDraft.name,
            code: editDraft.code,
            description: editDraft.description,
            sortOrder: Number(editDraft.sortOrder)
          });
        } else {
          await actionUpdateClientPbxCategory({
            id: editingId,
            name: editDraft.name,
            code: editDraft.code,
            description: editDraft.description,
            sortOrder: Number(editDraft.sortOrder)
          });
        }
        setEditingId(null);
        setEditDraft({ name: "", code: "", description: "", sortOrder: "100" });
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo guardar.");
      }
    });
  };

  const onAction = (actionId: string, row: DirectoryRow) => {
    const action = actionId as DirectoryAction;
    if (action === "edit") {
      setEditingId(row.id);
      setEditDraft({
        name: row.name,
        code: row.code,
        description: row.description ?? "",
        sortOrder: String(row.sortOrder)
      });
      return;
    }

    if (action === "toggle") {
      startTransition(async () => {
        try {
          if (mode === "department") {
            await actionSetClientContactDepartmentActive({ id: row.id, isActive: !row.isActive });
          } else if (mode === "jobTitle") {
            await actionSetClientContactJobTitleActive({ id: row.id, isActive: !row.isActive });
          } else {
            await actionSetClientPbxCategoryActive({ id: row.id, isActive: !row.isActive });
          }
          setError(null);
          router.refresh();
        } catch (err) {
          setError((err as Error)?.message || "No se pudo actualizar estado.");
        }
      });
    }
  };

  const showLoadDefaultsCta = source === "fallback" && typeof onLoadDefaults === "function";

  return (
    <section className="space-y-3 rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Directorios</p>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
            source === "fallback"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          )}
        >
          Source: {source}
        </span>
      </div>
      <p className="text-xs text-slate-500">
        Activas: <span className="font-semibold text-slate-700">{activeCount}</span> · Inactivas:{" "}
        <span className="font-semibold text-slate-700">{inactiveCount}</span>
      </p>

      {showLoadDefaultsCta ? (
        <div className="space-y-2 rounded-lg border border-[#4aa59c]/20 bg-[#4aa59c]/5 px-3 py-2 text-xs text-slate-600">
          <p>Usando catálogo por defecto. Carga inicial recomendada para dejar este directorio tenant-scoped.</p>
          <button
            type="button"
            onClick={() => {
              if (!onLoadDefaults) return;
              startLoadingDefaults(async () => {
                try {
                  setError(null);
                  setDefaultsMessage(null);
                  const result = await onLoadDefaults();
                  setDefaultsMessage(`Iniciales cargadas: ${result.created} nuevas, ${result.reactivated} reactivadas.`);
                  router.refresh();
                } catch (err) {
                  setError((err as Error)?.message || "No se pudieron cargar los valores iniciales.");
                }
              });
            }}
            disabled={isLoadingDefaults}
            className={cn(
              "inline-flex h-9 items-center gap-1 rounded-lg border border-[#4aa59c]/40 bg-white px-3 text-xs font-semibold text-[#2e75ba] hover:border-[#4aadf5]",
              isLoadingDefaults && "cursor-not-allowed opacity-60"
            )}
          >
            Cargar iniciales
          </button>
          {defaultsMessage ? <p className="text-emerald-700">{defaultsMessage}</p> : null}
        </div>
      ) : null}

      {editingId ? (
        <div className="grid gap-2 rounded-xl border border-[#dce7f5] bg-[#f8fafc] p-3 md:grid-cols-[1.2fr_0.8fr_1fr_0.6fr_auto_auto]">
          <input
            value={editDraft.name}
            onChange={(event) => setEditDraft((prev) => ({ ...prev, name: event.target.value }))}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
            placeholder="Nombre"
          />
          <input
            value={editDraft.code}
            onChange={(event) => setEditDraft((prev) => ({ ...prev, code: event.target.value }))}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
            placeholder="codigo_slug"
          />
          <input
            value={editDraft.description}
            onChange={(event) => setEditDraft((prev) => ({ ...prev, description: event.target.value }))}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
            placeholder="Descripción"
          />
          <input
            value={editDraft.sortOrder}
            onChange={(event) => setEditDraft((prev) => ({ ...prev, sortOrder: event.target.value.replace(/[^\d-]/g, "") }))}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
            placeholder="Orden"
          />
          <button
            type="button"
            onClick={saveEdit}
            disabled={isPending || !editDraft.name.trim()}
            className={cn(
              "h-11 rounded-xl bg-[#4aa59c] px-4 text-sm font-semibold text-white hover:bg-[#4aadf5]",
              (isPending || !editDraft.name.trim()) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
            )}
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
          >
            Cancelar
          </button>
        </div>
      ) : null}

      <ConfigDataTable
        title={title}
        subtitle={subtitle}
        columns={DIRECTORY_COLUMNS}
        rows={sorted}
        actions={rowActions}
        onAction={onAction}
        enableSearch
        enableStatusFilter
        searchPlaceholder="Buscar por nombre o código..."
        getSearchText={(row) => `${row.name} ${row.code} ${row.description ?? ""}`}
        emptyState="Sin registros para este directorio."
        headerActions={
          <div className="grid gap-2 sm:grid-cols-[1.1fr_0.8fr_1fr_0.6fr_auto]">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              placeholder="Nombre nuevo"
            />
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              placeholder="codigo_slug"
            />
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              placeholder="Descripción"
            />
            <input
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value.replace(/[^\d-]/g, ""))}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              placeholder="Orden"
            />
            <button
              type="button"
              onClick={create}
              disabled={isPending || !name.trim()}
              className={cn(
                "inline-flex h-11 items-center gap-1 rounded-xl bg-[#4aa59c] px-3 text-sm font-semibold text-white hover:bg-[#4aadf5]",
                (isPending || !name.trim()) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
              )}
            >
              <PlusCircle size={14} />
              Nuevo
            </button>
          </div>
        }
      />

      {error ? <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
    </section>
  );
}

export default function ClientContactDirectoriesManager({
  departments,
  departmentsSource = "db",
  jobTitles,
  jobTitlesSource = "db",
  pbxCategories,
  pbxCategoriesSource = "db",
  correlations,
  focusMode = "all"
}: {
  departments: DirectoryRow[];
  departmentsSource?: "db" | "fallback";
  jobTitles: DirectoryRow[];
  jobTitlesSource?: "db" | "fallback";
  pbxCategories: DirectoryRow[];
  pbxCategoriesSource?: "db" | "fallback";
  correlations: CorrelationRow[];
  focusMode?: "all" | "department" | "jobTitle" | "pbxCategory" | "correlation";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activeDepartmentOptions = useMemo(
    () => departments.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es")),
    [departments]
  );
  const activeJobTitleOptions = useMemo(
    () => jobTitles.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es")),
    [jobTitles]
  );

  const correlationsByDepartment = useMemo(() => {
    return correlations.reduce<Record<string, string[]>>((acc, row) => {
      const departmentId = row.departmentId.trim();
      if (!departmentId) return acc;
      acc[departmentId] = Array.from(new Set(row.jobTitleIds.map((item) => item.trim()).filter(Boolean)));
      return acc;
    }, {});
  }, [correlations]);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(activeDepartmentOptions[0]?.id ?? "");
  const [selectedJobTitleIds, setSelectedJobTitleIds] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedDepartmentId && activeDepartmentOptions[0]?.id) {
      setSelectedDepartmentId(activeDepartmentOptions[0].id);
    }
  }, [activeDepartmentOptions, selectedDepartmentId]);

  useEffect(() => {
    if (!selectedDepartmentId) {
      setSelectedJobTitleIds([]);
      return;
    }
    setSelectedJobTitleIds(correlationsByDepartment[selectedDepartmentId] ?? []);
  }, [correlationsByDepartment, selectedDepartmentId]);

  const matrixRows = useMemo(
    () =>
      activeDepartmentOptions.map((department) => {
        const linkedIds = correlationsByDepartment[department.id] ?? [];
        return {
          departmentId: department.id,
          departmentName: department.name,
          count: linkedIds.length,
          behavior: linkedIds.length > 0 ? "Filtrado" : "Todos"
        };
      }),
    [activeDepartmentOptions, correlationsByDepartment]
  );

  const saveCorrelation = () => {
    if (!selectedDepartmentId) return;
    startTransition(async () => {
      try {
        await actionSaveClientContactDepartmentJobTitles({
          departmentId: selectedDepartmentId,
          jobTitleIds: selectedJobTitleIds
        });
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo guardar la correlación área↔cargo.");
      }
    });
  };

  const clearCorrelation = () => {
    if (!selectedDepartmentId) return;
    startTransition(async () => {
      try {
        await actionSaveClientContactDepartmentJobTitles({
          departmentId: selectedDepartmentId,
          jobTitleIds: []
        });
        setSelectedJobTitleIds([]);
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo limpiar la correlación área↔cargo.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {focusMode !== "correlation" ? (
        <div
          className={cn(
            "grid gap-4",
            focusMode === "all" ? "xl:grid-cols-3" : "xl:grid-cols-1"
          )}
        >
          {focusMode === "all" || focusMode === "department" ? (
            <DirectoryPanel
              mode="department"
              title="A) Áreas / Departamentos"
              subtitle="CRUD tenant-scoped con activación y ordenamiento."
              rows={departments}
              source={departmentsSource}
              onLoadDefaults={actionLoadClientContactDepartmentDefaults}
            />
          ) : null}

          {focusMode === "all" || focusMode === "jobTitle" ? (
            <DirectoryPanel
              mode="jobTitle"
              title="B) Cargos / Puestos"
              subtitle="CRUD tenant-scoped con activación y ordenamiento."
              rows={jobTitles}
              source={jobTitlesSource}
              onLoadDefaults={actionLoadClientContactJobTitleDefaults}
            />
          ) : null}

          {focusMode === "all" || focusMode === "pbxCategory" ? (
            <DirectoryPanel
              mode="pbxCategory"
              title="C) Categorías PBX"
              subtitle="Áreas del PBX usadas en formulario de Empresas (C0)."
              rows={pbxCategories}
              source={pbxCategoriesSource}
              onLoadDefaults={actionLoadClientPbxCategoryDefaults}
            />
          ) : null}
        </div>
      ) : null}

      {focusMode === "all" || focusMode === "correlation" ? (
        <section className="space-y-3 rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Directorios</p>

          <ConfigDataTable
            title="D) Correlación Área ↔ Cargo"
            subtitle="Si un área no tiene correlación activa, en formularios se muestran todos los cargos."
            columns={[
              {
                id: "department",
                header: "Área",
                render: (row: { departmentName: string }) => <span className="font-semibold text-slate-900">{row.departmentName}</span>
              },
              {
                id: "count",
                header: "Cargos permitidos",
                render: (row: { count: number }) => <span className="text-slate-700">{row.count}</span>
              },
              {
                id: "behavior",
                header: "Comportamiento",
                render: (row: { behavior: string }) => <span className="text-slate-600">{row.behavior}</span>
              }
            ]}
            rows={matrixRows}
            onAction={() => undefined}
            enableSearch
            searchPlaceholder="Buscar área..."
            getSearchText={(row) => row.departmentName}
            emptyState="No hay áreas activas para correlacionar."
            headerActions={
              <div className="grid w-full gap-2 lg:grid-cols-[1fr_1.5fr_auto_auto]">
                <SearchableSelect
                  value={selectedDepartmentId}
                  onChange={(nextValue) => setSelectedDepartmentId(nextValue)}
                  options={activeDepartmentOptions.map((item) => ({ id: item.id, label: item.name }))}
                  placeholder="Selecciona área"
                  disabled={isPending || activeDepartmentOptions.length === 0}
                />

                <SearchableMultiSelect
                  value={selectedJobTitleIds}
                  onChange={setSelectedJobTitleIds}
                  options={activeJobTitleOptions.map((item) => ({ id: item.id, label: item.name }))}
                  placeholder="Selecciona cargos permitidos"
                  disabled={isPending || !selectedDepartmentId || activeJobTitleOptions.length === 0}
                />

                <button
                  type="button"
                  onClick={saveCorrelation}
                  disabled={isPending || !selectedDepartmentId}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-xl bg-[#4aa59c] px-4 text-sm font-semibold text-white hover:bg-[#4aadf5]",
                    (isPending || !selectedDepartmentId) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
                  )}
                >
                  <Save size={14} />
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={clearCorrelation}
                  disabled={isPending || !selectedDepartmentId}
                  className={cn(
                    "inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]",
                    (isPending || !selectedDepartmentId) && "cursor-not-allowed opacity-60"
                  )}
                >
                  Limpiar
                </button>
              </div>
            }
          />

          <p className="text-xs text-slate-500">
            Si dejas el listado de cargos vacío para un área, esa área no filtra y mostrará todos los cargos en el formulario Empresa.
          </p>

          {error ? <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        </section>
      ) : null}
    </div>
  );
}
