import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const inventoryAreas = [
  { name: "CONSULTA MEDICA", slug: "consulta-medica" },
  { name: "ULTRASONIDOS", slug: "ultrasonidos" },
  { name: "LABORATORIOS", slug: "laboratorios" },
  { name: "FARMACIA", slug: "farmacia" },
  { name: "SERVICIOS MEDICOS", slug: "servicios-medicos" },
  { name: "CAPACITACIONES", slug: "capacitaciones" },
  { name: "EMERGENCIAS", slug: "emergencias" },
  { name: "PROCEDIMIENTOS", slug: "procedimientos" },
  { name: "IMAGEN", slug: "imagen" },
  { name: "SSO / OCUPACIONAL", slug: "sso-ocupacional" },
  { name: "CURSOS", slug: "cursos" }
].map((area, idx) => ({ ...area, order: idx, isExternal: true }));

const productCategories = [
  {
    name: "FARMACIA",
    slug: "farmacia",
    type: "FARMACIA",
    order: 0,
    subs: [
      "Analgésicos",
      "Antiinflamatorios",
      "Antibióticos",
      "Antihistamínicos",
      "Antipiréticos",
      "Antidiabéticos",
      "Antihipertensivos",
      "Antivirales",
      "Corticoides",
      "Vitaminas y suplementos",
      "Medicamentos pediátricos",
      "Soluciones inyectables",
      "Sueros y electrolitos"
    ]
  },
  {
    name: "INSUMOS MÉDICOS",
    slug: "insumos-medicos",
    type: "INSUMOS",
    order: 1,
    subs: [
      "Jeringas",
      "Agujas",
      "Algodón y gasas",
      "Apósitos y vendajes",
      "Guantes",
      "Mascarillas",
      "Lubricantes",
      "Alcohol / antisépticos",
      "Kits de curación",
      "Cánulas y sondas"
    ]
  },
  {
    name: "IMAGEN",
    slug: "imagen",
    type: "IMAGEN",
    order: 2,
    subs: [
      "Placas Rayos X",
      "Gel ultrasonido",
      "Protectores de plomo",
      "Accesorios de equipo RX/USG",
      "Kits de limpieza de equipo"
    ]
  },
  {
    name: "LABORATORIO",
    slug: "laboratorio",
    type: "LABORATORIO",
    order: 3,
    subs: [
      "Tubos al vacío",
      "Agujas mariposa",
      "Reactivos hematología",
      "Reactivos química sanguínea",
      "Reactivos orina",
      "Controles y calibradores",
      "Portaobjetos y cubreobjetos",
      "Material microbiología"
    ]
  },
  {
    name: "LIMPIEZA Y BIOSEGURIDAD",
    slug: "limpieza-bioseguridad",
    type: "LIMPIEZA",
    order: 4,
    subs: [
      "Desinfectantes",
      "Jabón quirúrgico",
      "Toallas desinfectantes",
      "Bolsas rojas y negras",
      "Uniformes / EPP",
      "Mascarillas N95",
      "Overoles y protección"
    ]
  },
  {
    name: "OFICINA",
    slug: "oficina",
    type: "OFICINA",
    order: 5,
    subs: ["Papelería", "Tintas y toners", "Material de impresión", "Tarjetas / stickers / brazaletes"]
  }
];

const serviceCategories = [
  {
    name: "CONSULTA MÉDICA",
    slug: "consulta-medica",
    area: "CONSULTA",
    order: 0,
    subs: ["General", "Pediatría", "Ginecología", "Obstetricia", "Medicina interna", "Traumatología", "Dermatología", "Nutrición", "Geriatría"]
  },
  {
    name: "ULTRASONIDOS",
    slug: "ultrasonidos",
    area: "ULTRASONIDO",
    order: 1,
    subs: [
      "Obstétrico 1er trimestre",
      "Obstétrico 2do/3er trimestre",
      "Obstétrico 3D/4D",
      "Ginecológico pélvico",
      "Ginecológico transvaginal",
      "Abdominal",
      "Renal",
      "Hepático / vesícula",
      "Tiroideo",
      "Mamario",
      "Partes blandas"
    ]
  },
  {
    name: "RAYOS X",
    slug: "rayos-x",
    area: "RAYOS_X",
    order: 2,
    subs: ["Tórax", "Abdomen", "Extremidades", "Columna cervical", "Columna lumbar", "Pelvis", "Otros RX simples"]
  },
  {
    name: "LABORATORIO CLÍNICO",
    slug: "laboratorio-clinico",
    area: "LABORATORIO",
    order: 3,
    subs: ["Hematología", "Química sanguínea", "Inmunología / hormonas", "Uroanálisis", "Coproanálisis", "Pruebas rápidas"]
  },
  {
    name: "PROCEDIMIENTOS MÉDICOS",
    slug: "procedimientos-medicos",
    area: "PROCEDIMIENTOS",
    order: 4,
    subs: ["Curaciones", "Suturas", "Retiro de puntos", "Nebulizaciones", "Inyecciones", "ECG (electrocardiograma)"]
  },
  {
    name: "SALUD Y SEGURIDAD OCUPACIONAL",
    slug: "sso",
    area: "SSO",
    order: 5,
    subs: [
      "Evaluación preocupacional",
      "Evaluación anual / periódica",
      "Evaluación de retorno",
      "Audiometría",
      "Espirometría",
      "Prueba de visión",
      "Certificados médicos laborales",
      "Jornadas y brigadas empresariales"
    ]
  },
  {
    name: "ENFERMERÍA",
    slug: "enfermeria",
    area: "ENFERMERIA",
    order: 6,
    subs: ["Toma de signos vitales", "Toma de glucosa", "Controles de embarazo", "Canalización"]
  },
  {
    name: "OTROS SERVICIOS",
    slug: "otros-servicios",
    area: "OTROS",
    order: 7,
    subs: ["Atención en casa", "Telemedicina", "Traslado de muestras", "Capacitaciones"]
  }
];

async function main() {
  for (const area of inventoryAreas) {
    await prisma.inventoryArea.upsert({
      where: { slug: area.slug },
      update: { name: area.name, order: area.order, isExternal: area.isExternal },
      create: { ...area }
    });
  }

  for (const cat of productCategories) {
    const created = await prisma.productCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, type: cat.type, order: cat.order ?? 0 },
      create: { name: cat.name, slug: cat.slug, type: cat.type, order: cat.order ?? 0 }
    });
    for (const [idx, sub] of cat.subs.entries()) {
      await prisma.productSubcategory.upsert({
        where: { slug: slugify(sub) },
        update: { name: sub, order: idx, categoryId: created.id },
        create: { name: sub, slug: slugify(sub), order: idx, categoryId: created.id }
      });
    }
  }

  for (const cat of serviceCategories) {
    const created = await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, area: cat.area, order: cat.order ?? 0 },
      create: { name: cat.name, slug: cat.slug, area: cat.area, order: cat.order ?? 0 }
    });
    for (const [idx, sub] of cat.subs.entries()) {
      await prisma.serviceSubcategory.upsert({
        where: { slug: slugify(sub) },
        update: { name: sub, order: idx, categoryId: created.id },
        create: { name: sub, slug: slugify(sub), order: idx, categoryId: created.id }
      });
    }
  }
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
