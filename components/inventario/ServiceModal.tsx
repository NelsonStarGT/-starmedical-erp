"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { MoneyInput } from "@/components/inventario/MoneyInput";
import { ImageUploader } from "@/components/inventario/ImageUploader";
import { ProductPickerRow } from "@/components/inventario/ProductPickerRow";
import { Servicio } from "@/lib/types/inventario";
import { categoriasServicioMock, proveedoresMock, serviceSubcategoriasMock } from "@/lib/mock/inventario-catalogos";
import { productosMock } from "@/lib/mock/productos";
import { hasPermission } from "@/lib/types/inventario";
import { cn } from "@/lib/utils";

type ServiceModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (servicio: Servicio) => void;
  initialData?: Servicio;
  existingCodes?: string[];
  rol?: string;
};

const TABS = [
  { id: "datos", label: "Datos del servicio" },
  { id: "productos", label: "Productos usados" },
  { id: "imagen", label: "Imagen" }
];

export function ServiceModal({ open, onClose, onSave, initialData, existingCodes = [], rol = "Administrador" }: ServiceModalProps) {
  const [tab, setTab] = useState<string>("datos");
  const [form, setForm] = useState<Partial<Servicio> & { productosAsociados?: Array<{ productoId?: string; cantidad?: number }> }>({
    productosAsociados: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const isAdmin = hasPermission(rol as any, "editar_servicio");

  useEffect(() => {
    if (open) {
      setForm(
        initialData || {
          productosAsociados: [],
          estado: "Activo",
          duracionMin: 30
        }
      );
      setErrors({});
      setMessage(null);
      setTab("datos");
    }
  }, [open, initialData]);

  const filteredSubcats = useMemo(
    () => serviceSubcategoriasMock.filter((s) => !form.categoriaId || s.categoriaId === form.categoriaId),
    [form.categoriaId]
  );

  const costoProductos = useMemo(() => {
    return (form.productosAsociados || []).reduce((acc, item) => {
      const prod = productosMock.find((p) => p.id === item.productoId);
      return acc + (prod?.costoUnitario || 0) * (item.cantidad || 0);
    }, 0);
  }, [form.productosAsociados]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nombre) errs.nombre = "Nombre requerido";
    if (!form.codigoServicio) errs.codigoServicio = "Código requerido";
    if (form.codigoServicio && existingCodes.includes(form.codigoServicio) && form.codigoServicio !== initialData?.codigoServicio) errs.codigoServicio = "Código ya existe";
    if (!form.categoriaId) errs.categoriaId = "Categoría requerida";
    if (!form.duracionMin || form.duracionMin <= 0) errs.duracionMin = "Duración inválida";
    if (form.precioVenta === undefined || form.precioVenta < 0) errs.precioVenta = "Precio inválido";
    (form.productosAsociados || []).forEach((item, idx) => {
      if (!item.productoId || !item.cantidad || item.cantidad <= 0) {
        errs[`producto-${idx}`] = "Producto y cantidad requeridos";
      }
    });
    return errs;
  };

  const handleSave = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const productosAsociados = (form.productosAsociados || []).map((item) => ({
      productoId: item.productoId || "",
      cantidad: item.cantidad || 0
    }));

    const servicio: Servicio = {
      id: form.id || `srv-${Date.now()}`,
      nombre: form.nombre || "",
      categoriaId: form.categoriaId || "",
      subcategoriaId: form.subcategoriaId,
      proveedorId: form.proveedorId || "prov-interno",
      codigoServicio: form.codigoServicio || "",
      duracionMin: form.duracionMin || 30,
      precioVenta: form.precioVenta ?? 0,
      costoBase: form.costoBase,
      puntosDescuento: form.puntosDescuento,
      productosAsociados,
      costoCalculado: costoProductos,
      imageUrl: form.imageUrl,
      estado: form.estado || "Activo",
      area: form.area
    };
    onSave(servicio);
    setMessage("Servicio guardado correctamente");
  };

  const margin = (form.precioVenta ?? 0) - costoProductos;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? "Editar servicio" : "Nuevo servicio"}
      subtitle="Inventario · Servicio"
      className="max-w-5xl"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-slate-600">Costo productos: <strong>Q{costoProductos.toFixed(2)}</strong></span>
            <span className="text-slate-600">Precio venta: <strong>Q{(form.precioVenta ?? 0).toFixed(2)}</strong></span>
            <span className="text-slate-600">Margen estimado: <strong>Q{margin.toFixed(2)}</strong></span>
            <span className="text-slate-600">Duración: <strong>{form.duracionMin ?? 0} min</strong></span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            helper="Este código se usará para importaciones y facturación."
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
            value={form.proveedorId || "prov-interno"}
            onChange={(v) => setForm({ ...form, proveedorId: v })}
            options={[
              { value: "prov-interno", label: "Proveedor interno" },
              ...proveedoresMock.map((p) => ({ value: p.id, label: p.nombre }))
            ]}
          />
          <NumberField
            label="Duración (min)"
            required
            error={errors.duracionMin}
            value={form.duracionMin}
            onChange={(v) => setForm({ ...form, duracionMin: v })}
            placeholder="min"
          />
          <MoneyInput
            label="Precio de venta (Q)"
            value={form.precioVenta}
            onChange={(v) => setForm({ ...form, precioVenta: v })}
          />
          <SelectField
            label="Estado"
            value={form.estado || "Activo"}
            onChange={(v) => setForm({ ...form, estado: v as "Activo" | "Inactivo" })}
            options={[
              { value: "Activo", label: "Activo" },
              { value: "Inactivo", label: "Inactivo" }
            ]}
          />
          {form.area && <p className="text-xs text-slate-500">Área: {form.area}</p>}
        </div>
      )}

      {tab === "productos" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Productos usados</p>
            <button
              onClick={() => setForm({ ...form, productosAsociados: [...(form.productosAsociados || []), { productoId: "", cantidad: 0 }] })}
              className="text-sm font-semibold text-brand-primary hover:underline"
            >
              + Agregar producto
            </button>
          </div>
          <p className="text-xs text-slate-500">Define implementos para calcular costo real.</p>
          {(form.productosAsociados || []).map((item, idx) => (
            <div key={idx} className="space-y-1">
              <ProductPickerRow
                value={item}
                onChange={(next) => {
                  const clone = ([...(form.productosAsociados || [])] as Array<{ productoId?: string; cantidad?: number }>);
                  clone[idx] = { ...next };
                  setForm({ ...form, productosAsociados: clone } as any);
                }}
                onRemove={() => setForm({ ...form, productosAsociados: (form.productosAsociados || []).filter((_, i) => i !== idx) })}
                showCost={isAdmin}
              />
              {errors[`producto-${idx}`] && <p className="text-[11px] text-red-600">{errors[`producto-${idx}`]}</p>}
            </div>
          ))}
          {(form.productosAsociados || []).length === 0 && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Este servicio no tiene implementos asociados; el costo será Q0.00
            </p>
          )}
          <div className="flex justify-end">
            <p className="text-sm text-slate-700">
              Total costo productos: <strong>Q{costoProductos.toFixed(2)}</strong>
            </p>
          </div>
        </div>
      )}

      {tab === "imagen" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800">Imagen del servicio</p>
            <p className="text-xs text-slate-500">Usa una imagen cuadrada para mejores resultados.</p>
            <ImageUploader value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />
          </div>
        </div>
      )}
    </Modal>
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
