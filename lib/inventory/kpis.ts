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

const now = new Date();

function isWithinRange(fecha: string, range: TimeRange) {
  const days = rangeDays[range];
  const d = new Date(fecha);
  const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff < days;
}

export function getSummaryKPIs(range: TimeRange) {
  const productosActivos = productosMock.filter((p) => p.estado === "Activo");
  const serviciosActivos = serviciosMock.filter((s) => s.estado === "Activo");
  const combosActivos = combosMock.filter((c) => c.estado === "Activo");
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

export function getProductKPIs(range: TimeRange) {
  const salidas = movimientosMock.filter((m) => m.tipo === "Salida" && isWithinRange(m.fecha, range));
  const movimientosPorProducto = aggregateByProducto(salidas);
  const topMov = topList(movimientosPorProducto, 5, productosMock, (p, total) => ({
    title: p.nombre,
    subtitle: p.codigo,
    value: `${total} salidas`
  }));

  const lowStock = productosMock.filter((p) => p.stockActual <= p.stockMinimo);
  const topValor = topList(
    productosMock.map((p) => ({ id: p.id, total: p.stockActual * (p.costoUnitario || 0) })),
    5,
    productosMock,
    (p, total) => ({ title: p.nombre, subtitle: p.codigo, value: `Q${total.toFixed(2)}` })
  );

  const exp30 = productosMock.filter((p) => p.fechaExpiracion && diasAHoy(p.fechaExpiracion) <= 30);
  const exp60 = productosMock.filter((p) => p.fechaExpiracion && diasAHoy(p.fechaExpiracion) > 30 && diasAHoy(p.fechaExpiracion) <= 60);
  const exp90 = productosMock.filter((p) => p.fechaExpiracion && diasAHoy(p.fechaExpiracion) > 60 && diasAHoy(p.fechaExpiracion) <= 90);

  const margins = productosMock.map((p) => {
    const { margin, percent } = calcMargin(p.baseSalePrice ?? p.precioVenta ?? 0, p.avgCost ?? p.costoUnitario ?? 0);
    return { id: p.id, margin, percent, code: p.codigo };
  });
  const topMargen = marginRanking(margins, productosMock, "desc");
  const lowMargen = marginRanking(margins, productosMock, "asc");

  return { topMov, lowStock, topValor, exp30, exp60, exp90, topMargen, lowMargen };
}

export function getServiceKPIs(range: TimeRange) {
  // Mock ventas usando multiplicador de precio como proxy
  const serviceSales = serviciosMock.map((s, idx) => ({
    id: s.id,
    total: (idx + 1) * 3
  }));
  const topVentas = topList(serviceSales, 5, serviciosMock, (s, total) => ({
    title: s.nombre,
    subtitle: s.codigoServicio || "",
    value: `${total} ventas`
  }));

  const costoOperativo = serviciosMock.map((s) => ({
    id: s.id,
    total: s.costoCalculado
  }));
  const topCosto = topList(costoOperativo, 5, serviciosMock, (s, total) => ({
    title: s.nombre,
    value: `Q${total.toFixed(2)}`,
    hint: "Costo productos"
  }));

  const margen = serviciosMock.map((s) => {
    const { margin, percent } = calcMargin(s.costoBase ?? s.precioVenta ?? 0, s.costoCalculado ?? 0);
    return { id: s.id, margin, percent, code: s.codigoServicio };
  });
  const margenAlto = marginRanking(margen, serviciosMock, "desc");
  const margenBajo = marginRanking(margen, serviciosMock, "asc");

  return { topVentas, topCosto, margenAlto, margenBajo };
}

export function getComboKPIs(range: TimeRange) {
  const comboSales = combosMock.map((c, idx) => ({ id: c.id, total: (idx + 1) * 2 }));
  const topVentas = topList(comboSales, 5, combosMock, (c, total) => ({
    title: c.nombre,
    value: `${total} ventas`
  }));
  const margen = combosMock.map((c) => {
    const { margin, percent } = calcMargin(c.precioFinal ?? 0, c.costoCalculado ?? 0);
    return { id: c.id, margin, percent };
  });
  const topMargen = marginRanking(margen, combosMock, "desc");
  const lowMargen = marginRanking(margen, combosMock, "asc");
  const consumo = combosMock.map((c) => ({
    id: c.id,
    total: c.productosAsociados.reduce((acc, p) => acc + (p.cantidad || 0), 0)
  }));
  const topConsumo = topList(consumo, 5, combosMock, (c, total) => ({
    title: c.nombre,
    value: `${total} uds`
  }));
  return { topVentas, topMargen, lowMargen, topConsumo };
}

export function getOperativeKPIs(range: TimeRange) {
  const salidas = movimientosMock.filter((m) => m.tipo === "Salida" && isWithinRange(m.fecha, range));
  const consumoCosto = salidas.reduce((acc, m) => {
    const prod = productosMock.find((p) => p.id === m.productoId);
    return acc + Math.abs(m.cantidad) * (prod?.costoUnitario || 0);
  }, 0);

  const stockPromedio = productosMock.reduce((acc, p) => acc + p.stockActual, 0) / Math.max(1, productosMock.length);
  const consumoPromedio = salidas.reduce((acc, m) => acc + Math.abs(m.cantidad), 0) / Math.max(1, productosMock.length);
  const rotacion = consumoPromedio > stockPromedio ? "Alta" : consumoPromedio > stockPromedio * 0.25 ? "Media" : "Baja";

  const porSucursal = sucursalesInvMock.map((suc) => {
    const valor = productosMock
      .filter((p) => p.sucursalId === suc.id)
      .reduce((acc, p) => acc + p.stockActual * (p.costoUnitario || 0), 0);
    return { title: suc.nombre, value: `Q${valor.toFixed(2)}` };
  });

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
