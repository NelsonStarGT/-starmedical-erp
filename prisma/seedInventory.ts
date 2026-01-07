/**
 * Seed fictitious inventory data for testing quotes.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function ensureCategory(name: string, type: string = "PRODUCTO") {
  const id = `${name.toLowerCase().replace(/\s+/g, "-")}`;
  const slug = id;
  await prisma.productCategory.upsert({
    where: { slug },
    update: { name },
    create: { id, name, slug, type, order: 0, status: "Activo" }
  });
  const cat = await prisma.productCategory.findFirst({ where: { slug } });
  return cat!.id;
}

async function ensureServiceCategory(name: string, area: string = "GENERAL") {
  const id = `${name.toLowerCase().replace(/\s+/g, "-")}`;
  const slug = id;
  await prisma.serviceCategory.upsert({
    where: { slug },
    update: { name },
    create: { id, name, slug, area, order: 0, status: "Activo" }
  });
  const cat = await prisma.serviceCategory.findFirst({ where: { slug } });
  return cat!.id;
}

async function seedProducts() {
  const medicalCat = await ensureCategory("Botiquines");
  const extCat = await ensureCategory("Extintores");
  const equipCat = await ensureCategory("Equipo Medico");

  const products = [
    { name: "Botiquin basico", code: "BOT-001", price: 450, categoryId: medicalCat },
    { name: "Botiquin industrial", code: "BOT-002", price: 950, categoryId: medicalCat },
    { name: "Extintor PQS 10lb", code: "EXT-010", price: 380, categoryId: extCat },
    { name: "Extintor CO2 15lb", code: "EXT-015", price: 620, categoryId: extCat },
    { name: "Monitor de signos vitales", code: "EQ-100", price: 5200, categoryId: equipCat },
    { name: "Desfibrilador AED", code: "EQ-200", price: 11200, categoryId: equipCat }
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { code: p.code },
      update: { name: p.name, price: p.price, baseSalePrice: p.price },
      create: {
        name: p.name,
        code: p.code,
        price: p.price,
        baseSalePrice: p.price,
        categoryId: p.categoryId,
        status: "Activo"
      }
    });
  }
}

async function seedServices() {
  const medCat = await ensureServiceCategory("Servicios medicos");
  const labCat = await ensureServiceCategory("Laboratorio");
  const imgCat = await ensureServiceCategory("Imagenes");

  const services = [
    { name: "Consulta medica general", code: "SRV-CON", price: 250, categoryId: medCat },
    { name: "Visita empresarial SSO", code: "SRV-SSO", price: 950, categoryId: medCat },
    { name: "Perfil lipido", code: "LAB-LIP", price: 180, categoryId: labCat },
    { name: "Hemograma completo", code: "LAB-HEM", price: 120, categoryId: labCat },
    { name: "Rayos X torax", code: "IMG-XR", price: 280, categoryId: imgCat },
    { name: "Ultrasonido abdominal", code: "IMG-US", price: 420, categoryId: imgCat }
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { code: s.code || undefined },
      update: { name: s.name, price: s.price },
      create: {
        name: s.name,
        code: s.code,
        price: s.price,
        categoryId: s.categoryId,
        status: "Activo"
      }
    });
  }
}

async function seedCombos() {
  const combo = await prisma.combo.upsert({
    where: { id: "combo-chequeo-basico" },
    update: { name: "Chequeo basico empresa", priceFinal: 650 },
    create: {
      id: "combo-chequeo-basico",
      name: "Chequeo basico empresa",
      priceFinal: 650,
      costProductsTotal: 0,
      costCalculated: 0,
      status: "Activo"
    }
  });

  const service = await prisma.service.findFirst({ where: { code: "LAB-LIP" } });
  if (service) {
    await prisma.comboService.upsert({
      where: { comboId_serviceId: { comboId: combo.id, serviceId: service.id } },
      update: {},
      create: { comboId: combo.id, serviceId: service.id }
    });
  }
}

async function main() {
  await seedProducts();
  await seedServices();
  await seedCombos();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
