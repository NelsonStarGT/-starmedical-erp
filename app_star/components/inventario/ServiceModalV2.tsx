// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { MoneyInput } from "@/components/inventario/MoneyInput";
import { ImageUploader } from "@/components/inventario/ImageUploader";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Servicio, hasPermission } from "@/lib/types/inventario";
import { categoriasServicioMock, proveedoresMock, serviceSubcategoriasMock, unidadesMock } from "@/lib/mock/inventario-catalogos";
import { productosMock } from "@/lib/mock/productos";
import { salasMock } from "@/lib/mock/salas";
import { medicosMock } from "@/lib/mock/medicos";
import { cn, toTitleCase } from "@/lib/utils";

function applyRounding(value: number, mode: "NONE" | "Q0.05" | "Q0.10" | "Q1.00") {
  if (mode === "NONE") return value;
  const factor = mode === "Q1.00" ? 1 : mode === "Q0.10" ? 0.1 : 0.05;
  return Math.round(value / factor) * factor;
}
type ServiceModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (servicio: Servicio) => void;
  initialData?: Servicio;
  existingCodes?: string[];
  rol?: string;
};

type ProductoAsociadoDraft = { productoId?: string; cantidad?: number };

const TABS = [
  { id: "datos", label: "Datos del servicio" },
  { id: "productos", label: "Productos usados" },
  { id: "imagen", label: "Imagen" }
];

const INTERNAL_PROVIDER = { value: "prov-interno", label: "StarMedical (interno)" };

export function ServiceModalV2({ open, onClose, onSave, initialData, existingCodes = [], rol = "Administrador" }: ServiceModalProps) {
  const [tab, setTab] = useState<string>("datos");
  const [form, setForm] = useState<Partial<Servicio> & { productosAsociados?: ProductoAsociadoDraft[] }>({
    productosAsociados: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [marginPct, setMarginPct] = useState<number | undefined>(undefined);
  const [roundingMode, setRoundingMode] = useState<"NONE" | "Q0.05" | "Q0.10" | "Q1.00">("NONE");

  const isAdmin = hasPermission(rol as any, "editar_servicio");

  useEffect(() => {
    if (open) {
      setForm(
        initialData || {
          productosAsociados: [],
          estado: "Activo",
          duracionMin: 30,
          proveedorId: INTERNAL_PROVIDER.value
        }
      );
      setMarginPct(initialData?.marginPct);
      setErrors({});
      setMessage(null);
      setTab("datos");
    }
  }, [open, initialData]);

  useEffect(() => {
    const loadPolicy = async () => {
      try {
        const res = await fetch("/api/inventario/margin-policy");
        const data = await res.json();
        if (res.ok && data.data) {
          if (data.data.marginServicesPct !== undefined && data.data.marginServicesPct !== null) {
            setMarginPct(Number(data.data.marginServicesPct));
          }
          if (data.data.roundingMode) setRoundingMode(data.data.roundingMode);
        }
      } catch {
        // ignore
      }
    };
    if (open) loadPolicy();
  }, [open]);

  const categoriaAreaMap = useMemo(
    () => categoriasServicioMock.reduce<Record<string, string>>((acc, cat) => ({ ...acc, [cat.id]: cat.area }), {}),
    []
  );

  const filteredSubcats = useMemo(
    () => serviceSubcategoriasMock.filter((s) => !form.categoriaId || s.categoriaId === form.categoriaId),
    [form.categoriaId]
  );

  const productoIndex = useMemo(
    () => productosMock.reduce<Record<string, (typeof productosMock)[number]>>((acc, prod) => ({ ...acc, [prod.id]: prod }), {}),
    []
  );
  const unidadMap = useMemo(
    () => unidadesMock.reduce<Record<string, string>>((acc, u) => ({ ...acc, [u.id]: u.abreviatura || u.nombre || u.id }), {}),
    []
  );

  const costoProductos = useMemo(() => {
    return (form.productosAsociados || []).reduce((acc, item) => {
      const prod = item.productoId ? productoIndex[item.productoId] : null;
      const costoUnitario = prod?.costoUnitario || 0;
      return acc + costoUnitario * (item.cantidad || 0);
    }, 0);
  }, [form.productosAsociados, productoIndex]);

  const rolesOptions = useMemo(() => {
    const base = medicosMock.map((m) => m.especialidad || m.nombre).filter(Boolean) as string[];
    const unique = Array.from(new Set(base));
    return unique.map((label) => ({ value: slugify(label), label }));
  }, []);

  const salaOptions = useMemo(
    () => salasMock.map((s) => ({ value: s.id, label: `${s.nombre} · ${s.tipoRecurso}` })),
    []
  );

  const productOptions = useMemo(
    () => productosMock.map((p) => ({ value: p.id, label: `${p.nombre} (${p.codigo})` })),
    []
  );

  const precioBase = form.costoBase ?? form.precioVenta ?? 0;
  const margin = precioBase - costoProductos;
  const suggestedPrice = useMemo(() => {
    const cost = form.costoBase ?? costoProductos ?? 0;
    if (!marginPct || cost <= 0) return 0;
    return applyRounding(cost * (1 + marginPct / 100), roundingMode);
  }, [form.costoBase, costoProductos, marginPct, roundingMode]);

  const applyMargin = () => {
    const cost = form.costoBase ?? costoProductos ?? 0;
    if (!marginPct || cost <= 0) return;
    const price = applyRounding(cost * (1 + marginPct / 100), roundingMode);
    setForm({ ...form, precioVenta: price, costoBase: cost, marginPct });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nombre?.trim()) errs.nombre = "Nombre requerido";
    if (!form.codigoServicio?.trim()) errs.codigoServicio = "Código requerido";
    if (form.codigoServicio && existingCodes.includes(form.codigoServicio) && form.codigoServicio !== initialData?.codigoServicio) {
      errs.codigoServicio = "Código ya existe";
    }
    if (!form.categoriaId) errs.categoriaId = "Categoría requerida";
    if (!form.duracionMin || form.duracionMin <= 0) errs.duracionMin = "Duración inválida";
    if (form.precioVenta === undefined || form.precioVenta < 0) errs.precioVenta = "Precio inválido";
    if (form.costoBase !== undefined && form.costoBase < 0) errs.costoBase = "Precio base inválido";
    (form.productosAsociados || []).forEach((item, idx) => {
      const hasData = item.productoId || item.cantidad;
      if (hasData && (!item.productoId || !item.cantidad || item.cantidad <= 0)) {
        errs[`producto-${idx}`] = "Producto y cantidad requeridos";
      }
    });
    return errs;
  };

  const handleSave = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const productosAsociados = (form.productosAsociados || [])
      .filter((item) => item.productoId && item.cantidad && item.cantidad > 0)
      .map((item) => ({
        productoId: item.productoId || "",
        cantidad: item.cantidad || 0
      }));

    const servicio: Servicio = {
      id: form.id || `srv-${Date.now()}`,
      nombre: form.nombre || "",
      categoriaId: form.categoriaId || "",
      subcategoriaId: form.subcategoriaId || undefined,
      salaPreferidaId: form.salaPreferidaId || undefined,
      rolRequeridoId: form.rolRequeridoId || undefined,
      area: form.area || (form.categoriaId ? categoriaAreaMap[form.categoriaId] : undefined),
      proveedorId: form.proveedorId || INTERNAL_PROVIDER.value,
      codigoServicio: form.codigoServicio || "",
      duracionMin: form.duracionMin || 30,
      precioVenta: form.precioVenta ?? 0,
      costoBase: form.costoBase ?? form.precioVenta ?? 0,
      marginPct,
      puntosDescuento: form.puntosDescuento,
      productosAsociados,
      costoCalculado: costoProductos,
      imageUrl: form.imageUrl,
      estado: form.estado || "Activo"
    };
    onSave(servicio);
    setMessage("Servicio guardado correctamente");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? "Editar servicio" : "Nuevo servicio"}
      subtitle="Inventario · Servicio"
      className="max-w-6xl"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-slate-600">
              Costo productos: <strong>{isAdmin ? `Q${costoProductos.toFixed(2)}` : "—"}</strong>
            </span>
            <span className="text-slate-600">
              Precio base: <strong>Q{precioBase.toFixed(2)}</strong>
            </span>
            {isAdmin && (
              <span className={cn("text-slate-600", margin < 0 && "text-rose-700 font-semibold")}>
                Margen estimado: <strong>Q{margin.toFixed(2)}</strong>
              </span>
            )}
            <span className="text-slate-600">
              Duración: <strong>{form.duracionMin ?? 0} min</strong>
            </span>
            {form.salaPreferidaId && (
              <span className="text-slate-600">
                Sala: <strong>{salaOptions.find((s) => s.value === form.salaPreferidaId)?.label || form.salaPreferidaId}</strong>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white">
              Cancelar
            </button>
            <button onClick={handleSave} className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft">
              Guardar
            </button>
          </div>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-semibold transition",
              tab === t.id ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message && <div className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}

      {tab === "datos" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-800">Datos del servicio</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field
                label="Nombre"
                required
                error={errors.nombre}
                value={form.nombre || ""}
                onChange={(v) => setForm({ ...form, nombre: v })}
                placeholder="Nombre del servicio"
              />
              <Field
                label="Código servicio"
                required
                error={errors.codigoServicio}
                value={form.codigoServicio || ""}
                onChange={(v) => setForm({ ...form, codigoServicio: v })}
                placeholder="Ej: SRV-001"
                helper="Usado para importaciones y facturación."
              />
              <SelectField
                label="Categoría"
                required
                error={errors.categoriaId}
                value={form.categoriaId || ""}
                onChange={(v) => {
                  const cat = categoriasServicioMock.find((c) => c.id === v);
                  setForm({ ...form, categoriaId: v, subcategoriaId: "", area: cat?.area });
                }}
                options={categoriasServicioMock.map((c) => ({ value: c.id, label: c.nombre }))}
              />
              <SelectField
                label="Subcategoría"
                value={form.subcategoriaId || ""}
                onChange={(v) => setForm({ ...form, subcategoriaId: v })}
                options={[{ value: "", label: "Sin subcategoría" }, ...filteredSubcats.map((s) => ({ value: s.id, label: s.nombre }))]}
              />
              <SelectField
                label="Proveedor interno"
                value={form.proveedorId || INTERNAL_PROVIDER.value}
                onChange={(v) => setForm({ ...form, proveedorId: v })}
                options={[
                  INTERNAL_PROVIDER,
                  ...proveedoresMock.map((p) => ({ value: p.id, label: p.nombre }))
                ]}
              />
              <NumberField
                label="Duración (min)"
                required
                error={errors.duracionMin}
                value={form.duracionMin}
                onChange={(v) => setForm({ ...form, duracionMin: v })}
                placeholder="30"
              />
              <MoneyInput
                label="Precio de venta (Q)"
                value={form.precioVenta}
                onChange={(v) => setForm({ ...form, precioVenta: v })}
              />
              <MoneyInput
                label="Precio base (Q)"
                value={form.costoBase}
                onChange={(v) => setForm({ ...form, costoBase: v })}
              />
              <NumberField
                label="Margen sugerido (%)"
                value={marginPct}
                onChange={(v) => setMarginPct(v ?? undefined)}
                placeholder="45"
              />
              <div className="flex items-end gap-2 md:col-span-2">
                <div className="text-xs text-slate-500">
                  Precio sugerido: <span className="font-semibold text-slate-700">Q{suggestedPrice.toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  disabled={!marginPct || (form.costoBase ?? costoProductos) <= 0}
                  onClick={applyMargin}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Aplicar margen
                </button>
              </div>
              <NumberField
                label="Puntos descuento (opcional)"
                value={form.puntosDescuento}
                onChange={(v) => setForm({ ...form, puntosDescuento: v })}
                placeholder="0"
              />
              <div className="md:col-span-2 flex justify-end">
                <a
                  href="/admin/inventario/configuracion#price-calculator"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-brand-primary underline"
                >
                  Abrir calculadora de precio
                </a>
              </div>
              <SelectField
                label="Estado"
                value={form.estado || "Activo"}
                onChange={(v) => setForm({ ...form, estado: v as "Activo" | "Inactivo" })}
                options={[
                  { value: "Activo", label: "Activo" },
                  { value: "Inactivo", label: "Inactivo" }
                ]}
              />
              {form.area && <p className="text-xs text-slate-500 md:col-span-2">Área: {form.area}</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-800">Preferencias de agenda</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <SearchableSelect
                  label="Sala / Recurso preferido"
                  options={salaOptions}
                  value={form.salaPreferidaId || ""}
                  onChange={(val) => setForm({ ...form, salaPreferidaId: typeof val === "string" ? val : "" })}
                  placeholder="Selecciona sala"
                  includeAllOption={false}
                />
                <p className="text-[11px] text-slate-500">Define dónde se ejecuta el servicio en la agenda.</p>
              </div>
              <div className="flex flex-col gap-1">
                <SearchableSelect
                  label="Rol / Especialista requerido"
                  options={rolesOptions}
                  value={form.rolRequeridoId || ""}
                  onChange={(val) => setForm({ ...form, rolRequeridoId: typeof val === "string" ? val : "" })}
                  placeholder="Selecciona rol"
                  includeAllOption={false}
                />
                <p className="text-[11px] text-slate-500">Define quién puede realizar este servicio.</p>
              </div>
              <div className="flex items-center rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Usa estas preferencias para futuras integraciones con la agenda y asignación automática de recursos.
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "productos" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Productos usados</p>
              <p className="text-xs text-slate-500">Define implementos para calcular costo real.</p>
            </div>
            <button
              onClick={() => setForm({ ...form, productosAsociados: [...(form.productosAsociados || []), { productoId: "", cantidad: 0 }] })}
              className="text-sm font-semibold text-brand-primary hover:underline"
            >
              + Agregar producto
            </button>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="px-2 py-2">Producto</th>
                  <th className="px-2 py-2">Cantidad</th>
                  <th className="px-2 py-2">Unidad</th>
                  <th className="px-2 py-2">Stock</th>
                  {isAdmin && <th className="px-2 py-2">Costo unitario</th>}
                  {isAdmin && <th className="px-2 py-2">Subtotal costo</th>}
                  <th className="px-2 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(form.productosAsociados || []).length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 5} className="px-2 py-3">
                      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        Este servicio no tiene implementos asociados; el costo será Q0.00
                      </p>
                    </td>
                  </tr>
                )}
                {(form.productosAsociados || []).map((item, idx) => (
                  <ProductRow
                    key={idx}
                    value={item}
                    showCosts={isAdmin}
                    error={errors[`producto-${idx}`]}
                    productOptions={productOptions}
                    unidadMap={unidadMap}
                    productoIndex={productoIndex}
                    onChange={(next) => {
                      const clone = ([...(form.productosAsociados || [])] as ProductoAsociadoDraft[]);
                      clone[idx] = { ...next };
                      setForm({ ...form, productosAsociados: clone });
                    }}
                    onRemove={() => setForm({ ...form, productosAsociados: (form.productosAsociados || []).filter((_, i) => i !== idx) })}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">La unidad y el costo provienen del producto seleccionado.</p>
            <p className="text-sm text-slate-700">
              Total costo productos: <strong>{isAdmin ? `Q${costoProductos.toFixed(2)}` : "Solo admins"}</strong>
            </p>
          </div>
        </div>
      )}

      {tab === "imagen" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">Imagen del servicio</p>
            <p className="text-xs text-slate-500">Usa una imagen cuadrada para mejores resultados. Máx 20MB.</p>
            <ImageUploader value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />
          </div>
          {form.imageUrl && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-600 mb-2">Previsualización</p>
              <div className="relative h-48 w-full overflow-hidden rounded-xl bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imageUrl} alt="preview" className="h-full w-full object-cover" />
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function ProductRow({
  value,
  onChange,
  onRemove,
  productOptions,
  unidadMap,
  productoIndex,
  showCosts,
  error
}: {
  value: ProductoAsociadoDraft;
  onChange: (next: ProductoAsociadoDraft) => void;
  onRemove: () => void;
  productOptions: { value: string; label: string }[];
  unidadMap: Record<string, string>;
  productoIndex: Record<string, (typeof productosMock)[number]>;
  showCosts: boolean;
  error?: string;
}) {
  const producto = value.productoId ? productoIndex[value.productoId] : null;
  const unit = producto ? unidadMap[producto.unidadMedida] || producto.unidadMedida : "—";
  const stock = producto?.stockPorSucursal?.[0]?.stock ?? producto?.stockActual;
  const costoUnitario = producto?.costoUnitario ?? 0;
  const qty = value.cantidad || 0;
  const subtotal = costoUnitario * qty;

  return (
    <tr className="border-b border-slate-100 align-top">
      <td className="px-2 py-2">
        <SearchableSelect
          options={productOptions}
          value={value.productoId || ""}
          onChange={(next) => onChange({ ...value, productoId: typeof next === "string" ? next : "" })}
          placeholder="Buscar por nombre o código"
          includeAllOption={false}
          className="min-w-[220px]"
        />
        {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          min="0"
          value={value.cantidad ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange({ ...value, cantidad: undefined });
              return;
            }
            const parsed = Number(raw);
            if (!Number.isNaN(parsed)) onChange({ ...value, cantidad: parsed });
          }}
          className="w-24 rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
          placeholder="0"
        />
      </td>
      <td className="px-2 py-2 text-sm text-slate-700">{unit || "—"}</td>
      <td className="px-2 py-2 text-sm text-slate-700">{stock !== undefined && stock !== null ? stock : "—"}</td>
      {showCosts && <td className="px-2 py-2 text-sm text-slate-700">Q{costoUnitario.toFixed(2)}</td>}
      {showCosts && <td className="px-2 py-2 text-sm text-slate-700">Q{subtotal.toFixed(2)}</td>}
      <td className="px-2 py-2 text-right">
        <button onClick={onRemove} className="text-xs text-red-500 hover:underline">
          Quitar
        </button>
      </td>
    </tr>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  helper
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helper?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      <span className="text-[12px] font-semibold text-slate-500">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
          error && "border-red-400"
        )}
      />
      {helper && <span className="text-[11px] text-slate-500">{helper}</span>}
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  required,
  error
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      <span className="text-[12px] font-semibold text-slate-500">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        type="number"
        min="0"
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(undefined);
          } else {
            const parsed = Number(raw);
            if (!Number.isNaN(parsed)) onChange(parsed);
          }
        }}
        placeholder={placeholder}
        className={cn(
          "rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
          error && "border-red-400"
        )}
      />
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  error
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      <span className="text-[12px] font-semibold text-slate-500">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "rounded-xl border border-[#E5E5E7] bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
          error && "border-red-400"
        )}
      >
        <option value="">Selecciona</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </label>
  );
}

function slugify(text: string) {
  return toTitleCase(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
// @ts-nocheck
