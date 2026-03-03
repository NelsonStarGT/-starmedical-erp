import { productosMock } from "@/lib/mock/productos";
import { serviciosMock } from "@/lib/mock/servicios";
import { combosMock } from "@/lib/mock/combos";
import { movimientosMock } from "@/lib/mock/movimientos";
import { sucursalesInvMock } from "@/lib/mock/inventario-catalogos";
import { Producto, Servicio, Combo, Movimiento } from "@/lib/types/inventario";

export type TimeRange = "hoy" | "7d" | "30d" | "90d";

const rangeDays: Record<TimeRange, number> = {
  hoy: 1,
  "7d": 7,
  "30d": 30,
  "90d": 90
};

export type InventoryKpiSources = {
  productos?: Producto[];
  servicios?: Servicio[];
  combos?: Combo[];
  movimientos?: Movimiento[];
  sucursales?: Array<{ id: string; nombre: string }>;
};

const defaultSources: Required<InventoryKpiSources> = {
  productos: productosMock as Producto[],
  servicios: serviciosMock as Servicio[],
  combos: combosMock as Combo[],
  movimientos: movimientosMock as Movimiento[],
  sucursales: sucursalesInvMock.map((sucursal) => ({ id: sucursal.id, nombre: sucursal.nombre }))
};

const now = new Date();

function isWithinRange(fecha: string, range: TimeRange) {
  const days = rangeDays[range];
  const d = new Date(fecha);
  const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff < days;
}

function resolveSources(sources?: InventoryKpiSources): Required<InventoryKpiSources> {
  if (!sources) return defaultSources;
  return {
    productos: sources.productos || [],
    servicios: sources.servicios || [],
    combos: sources.combos || [],
    movimientos: sources.movimientos || [],
    sucursales: sources.sucursales || []
  };
}

function isActiveStatus(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase() !== "inactivo";
}

export function getSummaryKPIs(range: TimeRange, sources?: InventoryKpiSources) {
  const { productos, servicios, combos } = resolveSources(sources);
  const productosActivos = productos.filter((p) => isActiveStatus(p.estado));
  const serviciosActivos = servicios.filter((s) => isActiveStatus(s.estado));
  const combosActivos = combos.filter((c) => isActiveStatus(c.estado));
  const valorInventario = productosActivos.reduce((acc, p) => acc + p.stockActual * (p.costoUnitario || 0), 0);
  const lowStock = productosActivos.filter((p) => p.stockActual <= p.stockMinimo);
  const expiring = productosActivos.filter((p) => p.fechaExpiracion && diasAHoy(p.fechaExpiracion) <= 30);

  return {
    productosActivos: productosActivos.length,
    serviciosActivos: serviciosActivos.length,
    combosActivos: combosActivos.length,
    valorInventario,
    lowStock,
    expiring
  };
}

export function getProductKPIs(range: TimeRange, sources?: InventoryKpiSources) {
  const { productos, movimientos } = resolveSources(sources);
  const salidas = movimientos.filter((m) => m.tipo === "Salida" && isWithinRange(m.fecha, range));
  const movimientosPorProducto = aggregateByProducto(salidas);
  const topMov = topList(movimientosPorProducto, 5, productos, (p, total) => ({
    title: p.nombre,
    subtitle: p.codigo,
    value: `${total} salidas`
  }));

  const lowStock = productos.filter((p) => p.stockActual <= p.stockMinimo);
  const topValor = topList(
    productos.map((p) => ({ id: p.id, total: p.stockActual * (p.costoUnitario || 0) })),
    5,
    productos,
    (p, total) => ({ title: p.nombre, subtitle: p.codigo, value: `Q${total.toFixed(2)}` })
  );

  const exp30 = productos.filter((p) => p.fechaExpiracion && diasAHoy(p.fechaExpiracion) <= 30);
  const exp60 = productos.filter((p) => p.fechaExpiracion && diasAHoy(p.fechaExpiracion) > 30 && diasAHoy(p.fechaExpiracion) <= 60);
  const exp90 = productos.filter((p) => p.fechaExpiracion && diasAHoy(p.fechaExpiracion) > 60 && diasAHoy(p.fechaExpiracion) <= 90);

  const margins = productos.map((p) => {
    const { margin, percent } = calcMargin(p.baseSalePrice ?? p.precioVenta ?? 0, p.avgCost ?? p.costoUnitario ?? 0);
    return { id: p.id, margin, percent, code: p.codigo };
  });
  const topMargen = marginRanking(margins, productos, "desc");
  const lowMargen = marginRanking(margins, productos, "asc");

  return { topMov, lowStock, topValor, exp30, exp60, exp90, topMargen, lowMargen };
}

export function getServiceKPIs(range: TimeRange, sources?: InventoryKpiSources) {
  const { servicios } = resolveSources(sources);
  // Mock ventas usando multiplicador de precio como proxy
  const serviceSales = servicios.map((s, idx) => ({
    id: s.id,
    total: (idx + 1) * 3
  }));
  const topVentas = topList(serviceSales, 5, servicios, (s, total) => ({
    title: s.nombre,
    subtitle: s.codigoServicio || "",
    value: `${total} ventas`
  }));

  const costoOperativo = servicios.map((s) => ({
    id: s.id,
    total: s.costoCalculado
  }));
  const topCosto = topList(costoOperativo, 5, servicios, (s, total) => ({
    title: s.nombre,
    value: `Q${total.toFixed(2)}`,
    hint: "Costo productos"
  }));

  const margen = servicios.map((s) => {
    const { margin, percent } = calcMargin(s.costoBase ?? s.precioVenta ?? 0, s.costoCalculado ?? 0);
    return { id: s.id, margin, percent, code: s.codigoServicio };
  });
  const margenAlto = marginRanking(margen, servicios, "desc");
  const margenBajo = marginRanking(margen, servicios, "asc");

  return { topVentas, topCosto, margenAlto, margenBajo };
}

export function getComboKPIs(range: TimeRange, sources?: InventoryKpiSources) {
  const { combos } = resolveSources(sources);
  const comboSales = combos.map((c, idx) => ({ id: c.id, total: (idx + 1) * 2 }));
  const topVentas = topList(comboSales, 5, combos, (c, total) => ({
    title: c.nombre,
    value: `${total} ventas`
  }));
  const margen = combos.map((c) => {
    const { margin, percent } = calcMargin(c.precioFinal ?? 0, c.costoCalculado ?? 0);
    return { id: c.id, margin, percent };
  });
  const topMargen = marginRanking(margen, combos, "desc");
  const lowMargen = marginRanking(margen, combos, "asc");
  const consumo = combos.map((c) => ({
    id: c.id,
    total: c.productosAsociados.reduce((acc, p) => acc + (p.cantidad || 0), 0)
  }));
  const topConsumo = topList(consumo, 5, combos, (c, total) => ({
    title: c.nombre,
    value: `${total} uds`
  }));
  return { topVentas, topMargen, lowMargen, topConsumo };
}

export function getOperativeKPIs(range: TimeRange, sources?: InventoryKpiSources) {
  const { movimientos, productos, sucursales } = resolveSources(sources);
  const salidas = movimientos.filter((m) => m.tipo === "Salida" && isWithinRange(m.fecha, range));
  const consumoCosto = salidas.reduce((acc, m) => {
    const prod = productos.find((p) => p.id === m.productoId);
    return acc + Math.abs(m.cantidad) * (prod?.costoUnitario || 0);
  }, 0);

  const stockPromedio = productos.reduce((acc, p) => acc + p.stockActual, 0) / Math.max(1, productos.length);
  const consumoPromedio = salidas.reduce((acc, m) => acc + Math.abs(m.cantidad), 0) / Math.max(1, productos.length);
  const rotacion = consumoPromedio > stockPromedio ? "Alta" : consumoPromedio > stockPromedio * 0.25 ? "Media" : "Baja";

  const valueByBranchId = new Map<string, number>();
  for (const product of productos) {
    if (Array.isArray(product.stockPorSucursal) && product.stockPorSucursal.length > 0) {
      for (const stock of product.stockPorSucursal) {
        const current = valueByBranchId.get(stock.branchId) || 0;
        valueByBranchId.set(stock.branchId, current + Number(stock.stock || 0) * Number(product.costoUnitario || 0));
      }
      continue;
    }
    const key = product.sucursalId || "sin-sucursal";
    const current = valueByBranchId.get(key) || 0;
    valueByBranchId.set(key, current + Number(product.stockActual || 0) * Number(product.costoUnitario || 0));
  }

  const branchEntries = sucursales.length
    ? sucursales.map((sucursal) => ({ id: sucursal.id, name: sucursal.nombre }))
    : Array.from(valueByBranchId.keys()).map((branchId) => ({ id: branchId, name: branchId || "Sin sucursal" }));

  const porSucursal = branchEntries.map((entry) => ({
    title: entry.name,
    value: `Q${(valueByBranchId.get(entry.id) || 0).toFixed(2)}`
  }));

  return { consumoCosto, rotacion, porSucursal };
}

// Helpers
function aggregateByProducto(movs: Movimiento[]) {
  const map: Record<string, number> = {};
  movs.forEach((m) => {
    map[m.productoId] = (map[m.productoId] || 0) + Math.abs(m.cantidad);
  });
  return Object.entries(map).map(([id, total]) => ({ id, total }));
}

function diasAHoy(fecha: string) {
  const d = new Date(fecha);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function topList<T extends { id: string; total: number }, E>(
  list: T[],
  limit: number,
  source: Array<E & { id: string; nombre: string; codigo?: string; codigoServicio?: string; precioFinal?: number; costoCalculado?: number; precioVenta?: number }>,
  mapper: (entity: any, total: number) => { title: string; subtitle?: string; value: string; hint?: string }
) {
  const ordered = [...list].sort((a, b) => b.total - a.total).slice(0, limit);
  return ordered
    .map((entry) => {
      const item = source.find((s) => s.id === entry.id);
      if (!item) return null;
      return mapper(item, entry.total);
    })
    .filter(Boolean) as Array<{ title: string; subtitle?: string; value: string; hint?: string }>;
}

function calcMargin(base: number, cost: number) {
  const margin = base - cost;
  const percent = base > 0 ? (margin / base) * 100 : 0;
  return { margin, percent };
}

function marginRanking(
  list: Array<{ id: string; margin: number; percent: number; code?: string }>,
  source: Array<{ id: string; nombre: string; codigo?: string; codigoServicio?: string; precioFinal?: number }>,
  order: "asc" | "desc",
  limit = 5
) {
  const ordered = [...list].sort((a, b) => (order === "desc" ? b.margin - a.margin : a.margin - b.margin)).slice(0, limit);
  return ordered
    .map((entry) => {
      const item = source.find((s) => s.id === entry.id);
      if (!item) return null;
      const subtitle = (item as any).codigo || (item as any).codigoServicio || entry.code || "";
      const hint = entry.margin < 0 ? "Margen negativo" : undefined;
      return {
        title: (item as any).nombre,
        subtitle,
        value: `Q${entry.margin.toFixed(2)} (${entry.percent.toFixed(1)}%)`,
        hint
      };
    })
    .filter(Boolean) as Array<{ title: string; subtitle?: string; value: string; hint?: string }>;
}
