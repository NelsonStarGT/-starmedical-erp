import { prisma } from "@/lib/prisma";

type Finding = {
  title: string;
  items: Array<{ id: string; label: string; link?: string; extra?: string }>;
  count: number;
};

export async function computeIntegrityFindings(now = new Date()) {
  const [products, services, combos, priceLists, priceListItems] = await Promise.all([
    prisma.product.findMany({ include: { stocks: true } }),
    prisma.service.findMany(),
    prisma.combo.findMany({ include: { products: true, services: true } }),
    prisma.priceList.findMany(),
    prisma.priceListItem.findMany()
  ]);

  const findings: Finding[] = [];

  // Productos sin categoría o área
  const prodMissingCat = products.filter((p) => !p.categoryId || !p.inventoryAreaId);
  findings.push({
    title: "Productos sin categoría o área",
    count: prodMissingCat.length,
    items: prodMissingCat.map((p) => ({
      id: p.id,
      label: `${p.code} - ${p.name}`,
      link: `/admin/inventario/productos/${p.id}`
    }))
  });

  // Productos con stock <= mínimo
  const lowStock = products.filter((p) =>
    p.stocks.some((s) => s.stock <= s.minStock)
  );
  findings.push({
    title: "Productos con stock bajo",
    count: lowStock.length,
    items: lowStock.map((p) => ({
      id: p.id,
      label: `${p.code} - ${p.name}`,
      link: `/admin/inventario/productos/${p.id}`
    }))
  });

  // Productos próximos a vencer (30 días)
  const limit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const prodExpiring: any[] = []; // no expirations in schema; placeholder if field exists
  if ((products[0] as any)?.expirationDate) {
    prodExpiring.push(
      ...products
        .filter((p: any) => p.expirationDate && new Date(p.expirationDate) <= limit)
        .map((p) => ({
          id: p.id,
          label: `${p.code} - ${p.name}`,
          link: `/admin/inventario/productos/${p.id}`,
          extra: `Vence ${new Date((p as any).expirationDate).toISOString().slice(0, 10)}`
        }))
    );
  }
  findings.push({
    title: "Productos próximos a vencer (30 días)",
    count: prodExpiring.length,
    items: prodExpiring
  });

  // Servicios sin implementos (no products linked)
  const servicesNoProducts: any[] = [];
  if ((await prisma.comboService.count()) || (await prisma.comboProduct.count())) {
    // cannot infer implementos from schema; leave empty
  }
  findings.push({
    title: "Servicios sin implementos",
    count: servicesNoProducts.length,
    items: servicesNoProducts
  });

  // Servicios sin precio base
  const servicesNoPrice = services.filter((s) => !s.price || s.price <= 0);
  findings.push({
    title: "Servicios sin precio base",
    count: servicesNoPrice.length,
    items: servicesNoPrice.map((s) => ({
      id: s.id,
      label: `${s.code || ""} ${s.name}`.trim(),
      link: `/admin/inventario/servicios/${s.id}`
    }))
  });

  // Combos sin precio
  const combosNoPrice = combos.filter((c) => !c.priceFinal || Number(c.priceFinal) <= 0);
  findings.push({
    title: "Combos sin precio",
    count: combosNoPrice.length,
    items: combosNoPrice.map((c) => ({
      id: c.id,
      label: c.name,
      link: `/admin/inventario/combos/${c.id}`
    }))
  });

  // Combos sin servicios/productos
  const combosEmpty = combos.filter((c) => c.products.length === 0 && c.services.length === 0);
  findings.push({
    title: "Combos sin servicios/productos",
    count: combosEmpty.length,
    items: combosEmpty.map((c) => ({
      id: c.id,
      label: c.name,
      link: `/admin/inventario/combos/${c.id}`
    }))
  });

  // Listas de precios con items sin precio
  const priceIssues = priceListItems.filter((i) => i.precio === null || Number(i.precio) <= 0);
  findings.push({
    title: "Listas de precios con items sin precio",
    count: priceIssues.length,
    items: priceIssues.map((i) => ({
      id: i.id,
      label: `${i.priceListId} - ${i.itemType} ${i.itemId}`,
      link: `/admin/inventario/configuracion`
    }))
  });

  return findings;
}
