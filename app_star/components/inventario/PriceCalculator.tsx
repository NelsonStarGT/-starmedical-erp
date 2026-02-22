"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { MoneyInput } from "@/components/inventario/MoneyInput";
import { Combo, Producto, Servicio, hasPermission } from "@/lib/types/inventario";
import { productosMock } from "@/lib/mock/productos";
import { serviciosMock } from "@/lib/mock/servicios";
import { combosMock } from "@/lib/mock/combos";
import { cn } from "@/lib/utils";

type ItemType = "PRODUCTO" | "SERVICIO" | "COMBO";

type PriceList = { id: string; name: string; type?: string; estado?: string };
type PriceItem = { priceListId: string; itemType: ItemType; itemId: string; precio?: number };

type PriceCalculatorProps = {
  rol?: string;
  productos?: Producto[];
  servicios?: Servicio[];
  combos?: Combo[];
  priceLists?: PriceList[];
  priceItems?: PriceItem[];
  defaultIVA?: number;
};

type DiscountMode = "PORCENTAJE" | "MONTO";
type RoundingMode = "none" | "quetzal" | "0.05";

export function PriceCalculator({
  rol = "Administrador",
  productos = productosMock,
  servicios = serviciosMock,
  combos = combosMock,
  priceLists = [
    { id: "pl-particular", name: "Particular" },
    { id: "pl-aseguradora", name: "Aseguradora" },
    { id: "pl-convenio", name: "Convenio" }
  ],
  priceItems = [],
  defaultIVA = 12
}: PriceCalculatorProps) {
  const [itemType, setItemType] = useState<ItemType>("PRODUCTO");
  const [itemId, setItemId] = useState<string>("");
  const [priceListId, setPriceListId] = useState<string>(priceLists[0]?.id || "");
  const [ivaIncluido, setIvaIncluido] = useState(false);
  const [ivaPercent, setIvaPercent] = useState(defaultIVA);
  const [discountMode, setDiscountMode] = useState<DiscountMode>("PORCENTAJE");
  const [discountValue, setDiscountValue] = useState<number | undefined>(undefined);
  const [recargoMode, setRecargoMode] = useState<DiscountMode>("MONTO");
  const [recargoValue, setRecargoValue] = useState<number | undefined>(undefined);
  const [rounding, setRounding] = useState<RoundingMode>("none");

  const canSeeCosts = hasPermission(rol as any, "ver_costos");

  const itemOptions = useMemo(() => {
    const productOpts = productos.map((p) => ({ value: p.id, label: `${p.nombre} (${p.codigo})` }));
    const serviceOpts = servicios.map((s) => ({ value: s.id, label: `${s.nombre} (${s.codigoServicio || s.id})` }));
    const comboOpts = combos.map((c) => ({ value: c.id, label: c.nombre }));
    return {
      PRODUCTO: productOpts,
      SERVICIO: serviceOpts,
      COMBO: comboOpts
    };
  }, [productos, servicios, combos]);

  const priceListOptions = useMemo(() => priceLists.map((pl) => ({ value: pl.id, label: pl.name })), [priceLists]);

  useEffect(() => {
    const first = itemOptions[itemType][0]?.value;
    if (first && !itemId) {
      setItemId(first);
    }
  }, [itemOptions, itemType, itemId]);

  const selectedItem = useMemo(() => {
    if (itemType === "PRODUCTO") return productos.find((p) => p.id === itemId);
    if (itemType === "SERVICIO") return servicios.find((s) => s.id === itemId);
    return combos.find((c) => c.id === itemId);
  }, [itemType, itemId, productos, servicios, combos]);

  const priceListPrice = useMemo(
    () => priceItems.find((pi) => pi.itemType === itemType && pi.itemId === itemId && pi.priceListId === priceListId)?.precio,
    [itemType, itemId, priceItems, priceListId]
  );

  const basePrice = useMemo(() => {
    if (priceListPrice !== undefined && priceListPrice !== null) return priceListPrice;
    if (!selectedItem) return 0;
    if (itemType === "PRODUCTO") {
      const p = selectedItem as Producto;
      return p.baseSalePrice ?? p.precioVenta ?? 0;
    }
    if (itemType === "SERVICIO") {
      const s = selectedItem as Servicio;
      return s.costoBase ?? s.precioVenta ?? 0;
    }
    const c = selectedItem as Combo;
    return c.precioFinal ?? 0;
  }, [priceListPrice, selectedItem, itemType]);

  const costoBase = useMemo(() => {
    if (!selectedItem) return 0;
    if (itemType === "PRODUCTO") {
      const p = selectedItem as Producto;
      return p.avgCost ?? p.costoUnitario ?? 0;
    }
    if (itemType === "SERVICIO") {
      const s = selectedItem as Servicio;
      return s.costoCalculado ?? 0;
    }
    const c = selectedItem as Combo;
    return c.costoCalculado ?? 0;
  }, [itemType, selectedItem]);

  const discountApplied = discountMode === "PORCENTAJE"
    ? (basePrice || 0) * ((discountValue || 0) / 100)
    : discountValue || 0;

  const subtotalBeforeRecargo = Math.max(0, basePrice - discountApplied);

  const recargoApplied = recargoMode === "PORCENTAJE"
    ? subtotalBeforeRecargo * ((recargoValue || 0) / 100)
    : recargoValue || 0;

  const subtotal = Math.max(0, subtotalBeforeRecargo + recargoApplied);

  const ivaFactor = (ivaPercent || 0) / 100;
  const totalAntesRedondeo = ivaIncluido ? subtotal : subtotal + subtotal * ivaFactor;
  const total = applyRounding(totalAntesRedondeo, rounding);
  const ivaAmount = ivaIncluido ? total - total / (1 + ivaFactor) : total - subtotal;
  const netoSinIVA = total - ivaAmount;
  const margenEstimado = netoSinIVA - costoBase;
  const margenPct = netoSinIVA > 0 ? (margenEstimado / netoSinIVA) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["PRODUCTO", "SERVICIO", "COMBO"] as ItemType[]).map((type) => (
          <button
            key={type}
            onClick={() => { setItemType(type); setItemId(""); }}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-semibold transition",
              itemType === type ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            {type === "PRODUCTO" ? "Producto" : type === "SERVICIO" ? "Servicio" : "Combo"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SearchableSelect
          label="Ítem"
          options={itemOptions[itemType]}
          value={itemId}
          onChange={(val) => setItemId(typeof val === "string" ? val : "")}
          placeholder="Selecciona ítem"
          includeAllOption={false}
        />
        <SearchableSelect
          label="Lista de precios"
          options={priceListOptions}
          value={priceListId}
          onChange={(val) => setPriceListId(typeof val === "string" ? val : "")}
          placeholder="Selecciona lista"
          includeAllOption={false}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MoneyInput label="Precio base" value={basePrice} onChange={() => {}} disabled />
        <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
          <label className="text-[12px] font-semibold text-slate-500">Descuento</label>
          <div className="flex gap-2">
            <select
              value={discountMode}
              onChange={(e) => setDiscountMode(e.target.value as DiscountMode)}
              className="rounded-xl border border-slate-200 px-2 py-1 text-xs"
            >
              <option value="PORCENTAJE">% Porcentaje</option>
              <option value="MONTO">Monto</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discountValue ?? ""}
              onChange={(e) => setDiscountValue(e.target.value === "" ? undefined : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="0"
            />
          </div>
          <p className="text-[11px] text-slate-500">Aplica antes de IVA.</p>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
          <label className="text-[12px] font-semibold text-slate-500">Recargo (opcional)</label>
          <div className="flex gap-2">
            <select
              value={recargoMode}
              onChange={(e) => setRecargoMode(e.target.value as DiscountMode)}
              className="rounded-xl border border-slate-200 px-2 py-1 text-xs"
            >
              <option value="MONTO">Monto</option>
              <option value="PORCENTAJE">% Porcentaje</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={recargoValue ?? ""}
              onChange={(e) => setRecargoValue(e.target.value === "" ? undefined : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="0"
            />
          </div>
          <p className="text-[11px] text-slate-500">Se suma después del descuento.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
          <label className="text-[12px] font-semibold text-slate-500">IVA</label>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={ivaIncluido} onChange={(e) => setIvaIncluido(e.target.checked)} />
              IVA incluido
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={ivaPercent}
              onChange={(e) => setIvaPercent(Number(e.target.value) || 0)}
              className="w-20 rounded-xl border border-slate-200 px-2 py-1 text-sm"
            />
            <span className="text-xs text-slate-500">%</span>
          </div>
          <p className="text-[11px] text-slate-500">IVA estimado, no es cálculo fiscal definitivo.</p>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
          <label className="text-[12px] font-semibold text-slate-500">Redondeo</label>
          <select
            value={rounding}
            onChange={(e) => setRounding(e.target.value as RoundingMode)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="none">Sin redondeo</option>
            <option value="quetzal">Al quetzal</option>
            <option value="0.05">A 0.05</option>
          </select>
          <p className="text-[11px] text-slate-500">Aplica al total final.</p>
        </div>

        <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-xs font-semibold text-slate-600">Resumen rápido</p>
          <p className="text-xs text-slate-500">Base: Q{basePrice.toFixed(2)}</p>
          <p className="text-xs text-slate-500">Desc.: Q{discountApplied.toFixed(2)}</p>
          <p className="text-xs text-slate-500">Recargo: Q{recargoApplied.toFixed(2)}</p>
          <p className="text-xs text-slate-500">Subtotal: Q{subtotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-800 mb-2">Resultados</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Metric label="Subtotal" value={`Q${subtotal.toFixed(2)}`} />
          <Metric label="IVA estimado" value={`Q${ivaAmount.toFixed(2)}`} />
          <Metric label="Total final a cobrar" value={`Q${total.toFixed(2)}`} highlight />
          {canSeeCosts && (
            <>
              <Metric label="Costo base" value={`Q${costoBase.toFixed(2)}`} />
              <Metric label="Margen estimado" value={`Q${margenEstimado.toFixed(2)} (${margenPct.toFixed(1)}%)`} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-slate-50 px-3 py-2", highlight && "border-brand-primary/50 bg-brand-primary/5")}>
      <p className="text-[12px] font-semibold text-slate-600">{label}</p>
      <p className="text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function applyRounding(value: number, mode: RoundingMode) {
  if (mode === "quetzal") return Math.round(value);
  if (mode === "0.05") return Math.round(value / 0.05) * 0.05;
  return value;
}
