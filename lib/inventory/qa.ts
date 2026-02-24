import { prisma } from "@/lib/prisma";
import { exportExcelViaProcessingService } from "@/lib/processing-service/excel";

export type QAItem = { id: string; label: string; link?: string; extra?: string };
export type QAFinding = { key: string; title: string; severity: "OK" | "WARN" | "ERROR"; items: QAItem[] };

export async function runInventoryQA(now = new Date()): Promise<{
  findings: QAFinding[];
  status: "OK" | "WARN" | "ERROR";
}> {
  const [products, services, combos, priceListItems, schedules] = await Promise.all([
    prisma.product.findMany({ include: { stocks: true } }),
    prisma.service.findMany(),
    prisma.combo.findMany({ include: { products: true, services: true } }),
    prisma.priceListItem.findMany(),
    prisma.inventoryEmailSchedule.findMany()
  ]);

  const findings: QAFinding[] = [];

  const addFinding = (key: string, title: string, severity: "WARN" | "ERROR", items: QAItem[]) => {
    findings.push({ key, title, severity: items.length > 0 ? severity : "OK", items });
  };

  addFinding(
    "prod-category-area",
    "Productos sin categoría o área",
    "ERROR",
    products
      .filter((p) => !p.categoryId || !p.inventoryAreaId)
      .map((p) => ({ id: p.id, label: `${p.code} - ${p.name}`, link: `/admin/inventario/productos/${p.id}` }))
  );

  addFinding(
    "prod-negative",
    "Productos con stock negativo",
    "ERROR",
    products
      .filter((p) => p.stocks.some((s) => s.stock < 0))
      .map((p) => ({ id: p.id, label: `${p.code} - ${p.name}`, link: `/admin/inventario/productos/${p.id}` }))
  );

  addFinding(
    "prod-lowstock",
    "Productos con stock bajo",
    "WARN",
    products
      .filter((p) => p.stocks.some((s) => s.stock <= s.minStock))
      .map((p) => ({ id: p.id, label: `${p.code} - ${p.name}`, link: `/admin/inventario/productos/${p.id}` }))
  );

  const limit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiring: QAItem[] = [];
  products.forEach((p: any) => {
    if (p.expirationDate) {
      const exp = new Date(p.expirationDate);
      if (exp <= limit) expiring.push({ id: p.id, label: `${p.code} - ${p.name}`, extra: `Vence ${exp.toISOString().slice(0, 10)}` });
    }
  });
  addFinding("prod-expiring", "Productos próximos a vencer (30 días)", "WARN", expiring);

  addFinding(
    "services-no-price",
    "Servicios sin precio base",
    "WARN",
    services.filter((s) => !s.price || s.price <= 0).map((s) => ({ id: s.id, label: `${s.code || ""} ${s.name}`.trim(), link: `/admin/inventario/servicios/${s.id}` }))
  );

  addFinding(
    "services-no-implements",
    "Servicios sin implementos (costo 0)",
    "WARN",
    services.filter((s: any) => !s.costCalculated && !s.price).map((s: any) => ({ id: s.id, label: `${s.code || ""} ${s.name}`.trim(), link: `/admin/inventario/servicios/${s.id}` }))
  );

  addFinding(
    "combo-no-price",
    "Combos sin precio base",
    "WARN",
    combos.filter((c: any) => !c.priceFinal || Number(c.priceFinal) <= 0).map((c) => ({ id: c.id, label: c.name, link: `/admin/inventario/combos/${c.id}` }))
  );

  addFinding(
    "combo-empty",
    "Combos sin servicios ni productos",
    "ERROR",
    combos.filter((c) => c.products.length === 0 && c.services.length === 0).map((c) => ({ id: c.id, label: c.name, link: `/admin/inventario/combos/${c.id}` }))
  );

  addFinding(
    "price-items",
    "Items de listas de precios sin precio",
    "WARN",
    priceListItems.filter((i: any) => i.precio === null || Number(i.precio) <= 0 || i.price === null).map((i) => ({
      id: i.id,
      label: `${i.priceListId} - ${i.itemType} ${i.itemId}`,
      link: `/admin/inventario/configuracion`
    }))
  );

  addFinding(
    "email-schedules",
    "Reglas de correo inválidas",
    "ERROR",
    schedules
      .filter((r: any) => {
        if (!r.email) return true;
        if (r.scheduleType === "ONE_TIME" && (!r.oneTimeDate || !r.oneTimeTime)) return true;
        if (r.scheduleType === "MONTHLY" && r.useLastDay === false && !r.monthlyDay) return true;
        if (r.scheduleType === "BIWEEKLY" && r.biweeklyMode === "EVERY_15_DAYS" && !r.startDate) return true;
        return false;
      })
      .map((r) => ({ id: r.id, label: `${r.email} · ${r.reportType}`, link: `/admin/inventario/configuracion` }))
  );

  const overall = findings.some((f) => f.severity === "ERROR") ? "ERROR" : findings.some((f) => f.severity === "WARN") ? "WARN" : "OK";
  return { findings, status: overall };
}

export async function qaToWorkbook(findings: QAFinding[]) {
  const headers = ["Chequeo", "Severidad", "ID", "Descripción", "Extra", "Link"];
  const rows: Array<Array<string>> = [];
  findings.forEach((finding) => {
    if (finding.items.length === 0) {
      rows.push([finding.title, finding.severity, "-", "Sin hallazgos", "", ""]);
      return;
    }
    finding.items.forEach((item) => {
      rows.push([finding.title, finding.severity, item.id, item.label, item.extra || "", item.link || ""]);
    });
  });

  const { buffer } = await exportExcelViaProcessingService({
    context: {
      tenantId: process.env.DEFAULT_TENANT_ID || "global",
      actorId: "inventory-qa"
    },
    fileName: "qa-inventario.xlsx",
    sheets: [{ name: "QA", headers, rows }],
    limits: {
      maxFileMb: 8,
      maxRows: 20_000,
      maxCols: 80,
      timeoutMs: 20_000
    }
  });

  return buffer;
}
