"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { MoneyInput } from "@/components/inventario/MoneyInput";
import { ImageUploader } from "@/components/inventario/ImageUploader";
import { Producto } from "@/lib/types/inventario";
import { ProductKardex } from "@/components/inventario/ProductKardex";
import { QuickInventoryActions } from "@/components/inventario/QuickInventoryActions";
import {
  categoriasProductoMock,
  inventoryAreasMock,
  proveedoresMock,
  subcategoriasMock,
  unidadesMock
} from "@/lib/mock/inventario-catalogos";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/types/inventario";

type ProductModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (producto: Producto) => void;
  initialData?: Producto;
  existingCodes?: string[];
  rol?: string;
};

const TABS = [
  { id: "id", label: "Identificación" },
  { id: "stock", label: "Existencias y costos" },
  { id: "image", label: "Imagen" },
  { id: "audit", label: "Kárdex" }
];

export function ProductModalV2({ open, onClose, onSave, initialData, existingCodes = [], rol = "Administrador" }: ProductModalProps) {
  const [tab, setTab] = useState<string>("id");
  const [form, setForm] = useState<Partial<Producto>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const isAdmin = hasPermission(rol as any, "editar_producto");

  useEffect(() => {
    if (open) {
      setForm(
        initialData || {
          estado: "Activo"
        }
      );
      setErrors({});
      setMessage(null);
      setTab("id");
    }
  }, [open, initialData]);

  const filteredSubcats = useMemo(
    () => subcategoriasMock.filter((s) => !form.categoriaId || s.categoriaId === form.categoriaId),
    [form.categoriaId]
  );

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nombre) errs.nombre = "Nombre requerido";
    if (!form.codigo) errs.codigo = "Código requerido";
    if (form.codigo && existingCodes.includes(form.codigo) && form.codigo !== initialData?.codigo) errs.codigo = "Código ya existe";
    if (!form.categoriaId) errs.categoriaId = "Categoría requerida";
    if (!form.areaId) errs.areaId = "Área requerida";
    if (form.stockMinimo === undefined || form.stockMinimo < 0) errs.stockMinimo = "Stock mínimo inválido";
    if (!initialData && (form.stockActual === undefined || form.stockActual < 0)) errs.stockActual = "Stock inicial requerido";
    if (form.costoUnitario !== undefined && form.costoUnitario < 0) errs.costoUnitario = "Costo inválido";
    if (form.precioVenta === undefined || form.precioVenta < 0) errs.precioVenta = "Precio inválido";
    return errs;
  };

  const handleSave = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const producto: Producto = {
      id: form.id || `p-${Date.now()}`,
      nombre: form.nombre || "",
      codigo: form.codigo || "",
      categoriaId: form.categoriaId || "",
      subcategoriaId: form.subcategoriaId || undefined,
      areaId: form.areaId || "",
      unidadMedida: form.unidadMedida || unidadesMock[0]?.id || "",
      costoUnitario: form.costoUnitario ?? 0,
      precioVenta: form.precioVenta ?? 0,
      baseSalePrice: form.baseSalePrice ?? form.precioVenta ?? 0,
      avgCost: form.avgCost ?? form.costoUnitario ?? 0,
      presentacion: form.presentacion,
      stockActual: form.stockActual ?? 0,
      stockMinimo: form.stockMinimo ?? 0,
      cantidadAlerta: form.cantidadAlerta,
      proveedorId: form.proveedorId || "",
      sucursalId: form.sucursalId || "s1",
      puntosDescuento: form.puntosDescuento,
      fechaExpiracion: form.fechaExpiracion,
      imageUrl: form.imageUrl,
      estado: form.estado || "Activo"
    };
    onSave(producto);
    setMessage("Producto guardado correctamente");
  };

  const margin = (form.baseSalePrice ?? form.precioVenta ?? 0) - (form.avgCost ?? form.costoUnitario ?? 0);
  const lowStock = (form.stockActual ?? 0) <= (form.stockMinimo ?? 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? "Editar producto" : "Nuevo producto"}
      subtitle="Inventario · Producto"
      className="max-w-5xl"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className={cn("flex items-center gap-1", lowStock ? "text-amber-700 font-semibold" : "text-slate-600")}>
              Stock: <strong>{form.stockActual ?? "—"}</strong>
              {lowStock && <Badge variant="warning">Stock bajo</Badge>}
            </span>
            <span className="text-slate-600">Mínimo: <strong>{form.stockMinimo ?? "—"}</strong></span>
            {isAdmin && (
              <span className={cn("flex items-center gap-1", margin < 0 ? "text-rose-700 font-semibold" : "text-slate-600")}>
                Margen: <strong>Q{margin.toFixed(2)}</strong>
                {margin < 0 && <Badge variant="warning">Margen negativo</Badge>}
              </span>
            )}
            <span className="text-xs text-slate-500">El stock y costo se auditan por movimientos.</span>
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

      {tab === "id" && (
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-semibold text-slate-800">Datos generales</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                label="Nombre"
                required
                error={errors.nombre}
                value={form.nombre || ""}
                onChange={(v) => setForm({ ...form, nombre: v })}
                placeholder="Nombre del producto"
              />
              <Field
                label="Código / SKU"
                required
                error={errors.codigo}
                value={form.codigo || ""}
                onChange={(v) => setForm({ ...form, codigo: v })}
                placeholder="Ej: MED-001"
                helper="Usado para importaciones, movimientos y facturación."
              />
              <SelectField
                label="Categoría"
                required
                error={errors.categoriaId}
                value={form.categoriaId || ""}
                onChange={(v) => setForm({ ...form, categoriaId: v, subcategoriaId: "" })}
                options={categoriasProductoMock.map((c) => ({ value: c.id, label: c.nombre }))}
              />
              <SelectField
                label="Subcategoría"
                value={form.subcategoriaId || ""}
                onChange={(v) => setForm({ ...form, subcategoriaId: v })}
                options={[{ value: "", label: "Sin subcategoría" }, ...filteredSubcats.map((s) => ({ value: s.id, label: s.nombre }))]}
              />
              <SelectField
                label="Área de inventario"
                required
                error={errors.areaId}
                value={form.areaId || ""}
                onChange={(v) => setForm({ ...form, areaId: v })}
                helper="Define dónde se consume (Consulta, Farmacia, Lab, Imagen)."
                options={inventoryAreasMock.map((a) => ({ value: a.id, label: a.nombre }))}
              />
              <SelectField
                label="Proveedor"
                value={form.proveedorId || ""}
                onChange={(v) => setForm({ ...form, proveedorId: v })}
                options={[{ value: "", label: "Opcional" }, ...proveedoresMock.map((p) => ({ value: p.id, label: p.nombre }))]}
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
              <Field
                label="Presentación"
                value={form.presentacion || ""}
                onChange={(v) => setForm({ ...form, presentacion: v })}
                placeholder="Tableta, caja, frasco..."
              />
            </div>
          </div>
        </div>
      )}

      {tab === "stock" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <p className="text-sm font-semibold text-slate-800">Inventario físico</p>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <NumberField
                label="Stock inicial"
                required={!initialData}
                helper="Solo al crear"
                value={form.stockActual}
                onChange={(v) => setForm({ ...form, stockActual: v })}
                disabled={!!initialData}
              />
              <NumberField
                label="Stock mínimo"
                required
                error={errors.stockMinimo}
                value={form.stockMinimo}
                onChange={(v) => setForm({ ...form, stockMinimo: v ?? 0 })}
              />
              <SelectField
                label="Unidad de medida"
                value={form.unidadMedida || ""}
                onChange={(v) => setForm({ ...form, unidadMedida: v })}
                options={unidadesMock.map((u) => ({ value: u.id, label: `${u.nombre} (${u.abreviatura})` }))}
              />
              <Field
                label="Presentación"
                value={form.presentacion || ""}
                onChange={(v) => setForm({ ...form, presentacion: v })}
                placeholder="Tableta, caja, frasco..."
              />
              <div>
                <label className="text-[12px] font-semibold text-slate-500">Fecha de expiración</label>
                <input
                  type="date"
                  value={form.fechaExpiracion || ""}
                  onChange={(e) => setForm({ ...form, fechaExpiracion: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm text-slate-700 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
                />
              </div>
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">El stock solo se actualiza mediante movimientos.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <p className="text-sm font-semibold text-slate-800">Costos y precios</p>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {isAdmin && (
                <MoneyInput
                  label="Costo promedio (Q)"
                  value={form.avgCost ?? form.costoUnitario}
                  onChange={(v) => setForm({ ...form, avgCost: v })}
                  disabled
                />
              )}
              <MoneyInput
                label="Precio base (Q)"
                value={form.baseSalePrice ?? form.precioVenta}
                onChange={(v) => setForm({ ...form, baseSalePrice: v })}
                disabled={!isAdmin}
              />
              <NumberField
                label="Puntos descuento"
                value={form.puntosDescuento}
                onChange={(v) => setForm({ ...form, puntosDescuento: v })}
              />
              <div className="flex justify-end">
                <a
                  href="/admin/inventario/configuracion#price-calculator"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-brand-primary underline"
                >
                  Abrir calculadora de precio
                </a>
              </div>
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">El stock y el costo se auditan mediante movimientos.</p>
            </div>
          </div>
        </div>
      )}

      {tab === "image" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800">Imagen del producto</p>
            <p className="text-xs text-slate-500">Usa una imagen cuadrada para mejores resultados.</p>
            <ImageUploader value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />
            {form.imageUrl && (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imageUrl} alt="preview" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
                <button
                  onClick={() => setForm({ ...form, imageUrl: undefined })}
                  className="text-xs text-rose-600 underline"
                  title="Quitar imagen"
                >
                  Quitar imagen
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="space-y-4">
          {!form.id && <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">Guarda el producto para habilitar auditoría y kárdex.</div>}
          {form.id && (
            <>
              {form.stockPorSucursal && form.stockPorSucursal.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">
                  <div className="mb-2 text-xs font-semibold text-slate-500">Stock por sucursal</div>
                  <div className="space-y-1">
                    {form.stockPorSucursal.map((s) => (
                      <div key={s.branchId} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1">
                        <span>{s.branchId}</span>
                        <span className="font-semibold">
                          {s.stock} <span className="text-xs text-slate-500">(min {s.minStock})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <QuickInventoryActions productId={form.id} role={rol} onCompleted={() => { setMessage("Acción registrada"); }} />
              <ProductKardex productId={form.id} />
            </>
          )}
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
  error,
  helper,
  disabled
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helper?: string;
  disabled?: boolean;
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
        disabled={disabled}
        className={cn(
          "rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
          error && "border-red-400",
          disabled && "bg-slate-50 text-slate-500"
        )}
      />
      {helper && <span className="text-[11px] text-slate-500">{helper}</span>}
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
  error,
  helper
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
  helper?: string;
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
          "rounded-xl border border-[#E5E5E7] px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15",
          error && "border-red-400"
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {helper && <span className="text-[11px] text-slate-500">{helper}</span>}
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </label>
  );
}

function Badge({ children, variant = "neutral" }: { children: React.ReactNode; variant?: "neutral" | "warning" }) {
  const map: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-700",
    warning: "bg-amber-100 text-amber-700"
  };
  return <span className={cn("rounded-full px-2 py-[2px] text-[11px] font-semibold", map[variant])}>{children}</span>;
}
