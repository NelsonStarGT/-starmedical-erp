import { CategoriaProducto, CategoriaServicio, Proveedor, UnidadMedida, SucursalInventario, Subcategoria, InventoryArea } from "@/lib/types/inventario";

export const inventoryAreasMock: InventoryArea[] = [
  { id: "area1", nombre: "CONSULTA MEDICA", slug: "consulta-medica", order: 0, isExternal: true },
  { id: "area2", nombre: "ULTRASONIDOS", slug: "ultrasonidos", order: 1, isExternal: true },
  { id: "area3", nombre: "LABORATORIOS", slug: "laboratorios", order: 2, isExternal: true },
  { id: "area4", nombre: "FARMACIA", slug: "farmacia", order: 3, isExternal: true },
  { id: "area5", nombre: "SERVICIOS MEDICOS", slug: "servicios-medicos", order: 4, isExternal: true },
  { id: "area6", nombre: "CAPACITACIONES", slug: "capacitaciones", order: 5, isExternal: true },
  { id: "area7", nombre: "EMERGENCIAS", slug: "emergencias", order: 6, isExternal: true },
  { id: "area8", nombre: "PROCEDIMIENTOS", slug: "procedimientos", order: 7, isExternal: true },
  { id: "area9", nombre: "IMAGEN", slug: "imagen", order: 8, isExternal: true },
  { id: "area10", nombre: "SSO / OCUPACIONAL", slug: "sso-ocupacional", order: 9, isExternal: true },
  { id: "area11", nombre: "CURSOS", slug: "cursos", order: 10, isExternal: true }
];

export const categoriasProductoMock: CategoriaProducto[] = [
  { id: "cp1", nombre: "FARMACIA", slug: "farmacia", tipo: "FARMACIA", order: 0 },
  { id: "cp2", nombre: "INSUMOS MÉDICOS", slug: "insumos-medicos", tipo: "INSUMOS", order: 1 },
  { id: "cp3", nombre: "IMAGEN", slug: "imagen", tipo: "IMAGEN", order: 2 },
  { id: "cp4", nombre: "LABORATORIO", slug: "laboratorio", tipo: "LABORATORIO", order: 3 },
  { id: "cp5", nombre: "LIMPIEZA Y BIOSEGURIDAD", slug: "limpieza-bioseguridad", tipo: "LIMPIEZA", order: 4 },
  { id: "cp6", nombre: "OFICINA", slug: "oficina", tipo: "OFICINA", order: 5 }
];

export const subcategoriasMock: Subcategoria[] = [
  // Farmacia
  { id: "scp1", categoriaId: "cp1", nombre: "Analgésicos", slug: "analgesicos", order: 0 },
  { id: "scp2", categoriaId: "cp1", nombre: "Antiinflamatorios", slug: "antiinflamatorios", order: 1 },
  { id: "scp3", categoriaId: "cp1", nombre: "Antibióticos", slug: "antibioticos", order: 2 },
  { id: "scp4", categoriaId: "cp1", nombre: "Antihistamínicos", slug: "antihistaminicos", order: 3 },
  { id: "scp5", categoriaId: "cp1", nombre: "Antipiréticos", slug: "antipireticos", order: 4 },
  { id: "scp6", categoriaId: "cp1", nombre: "Antidiabéticos", slug: "antidiabeticos", order: 5 },
  { id: "scp7", categoriaId: "cp1", nombre: "Antihipertensivos", slug: "antihipertensivos", order: 6 },
  { id: "scp8", categoriaId: "cp1", nombre: "Antivirales", slug: "antivirales", order: 7 },
  { id: "scp9", categoriaId: "cp1", nombre: "Corticoides", slug: "corticoides", order: 8 },
  { id: "scp10", categoriaId: "cp1", nombre: "Vitaminas y suplementos", slug: "vitaminas-suplementos", order: 9 },
  { id: "scp11", categoriaId: "cp1", nombre: "Medicamentos pediátricos", slug: "medicamentos-pediatricos", order: 10 },
  { id: "scp12", categoriaId: "cp1", nombre: "Soluciones inyectables", slug: "soluciones-inyectables", order: 11 },
  { id: "scp13", categoriaId: "cp1", nombre: "Sueros y electrolitos", slug: "sueros-electrolitos", order: 12 },
  // Insumos
  { id: "scp20", categoriaId: "cp2", nombre: "Jeringas", slug: "jeringas", order: 0 },
  { id: "scp21", categoriaId: "cp2", nombre: "Agujas", slug: "agujas", order: 1 },
  { id: "scp22", categoriaId: "cp2", nombre: "Algodón y gasas", slug: "algodon-gasas", order: 2 },
  { id: "scp23", categoriaId: "cp2", nombre: "Apósitos y vendajes", slug: "apositos-vendajes", order: 3 },
  { id: "scp24", categoriaId: "cp2", nombre: "Guantes", slug: "guantes", order: 4 },
  { id: "scp25", categoriaId: "cp2", nombre: "Mascarillas", slug: "mascarillas", order: 5 },
  { id: "scp26", categoriaId: "cp2", nombre: "Lubricantes", slug: "lubricantes", order: 6 },
  { id: "scp27", categoriaId: "cp2", nombre: "Alcohol / antisépticos", slug: "alcohol-antisepticos", order: 7 },
  { id: "scp28", categoriaId: "cp2", nombre: "Kits de curación", slug: "kits-curacion", order: 8 },
  { id: "scp29", categoriaId: "cp2", nombre: "Cánulas y sondas", slug: "canulas-sondas", order: 9 },
  // Imagen
  { id: "scp30", categoriaId: "cp3", nombre: "Placas Rayos X", slug: "placas-rayos-x", order: 0 },
  { id: "scp31", categoriaId: "cp3", nombre: "Gel ultrasonido", slug: "gel-ultrasonido", order: 1 },
  { id: "scp32", categoriaId: "cp3", nombre: "Protectores de plomo", slug: "protectores-plomo", order: 2 },
  { id: "scp33", categoriaId: "cp3", nombre: "Accesorios de equipo RX/USG", slug: "accesorios-equipo", order: 3 },
  { id: "scp34", categoriaId: "cp3", nombre: "Kits de limpieza de equipo", slug: "kits-limpieza-equipo", order: 4 },
  // Laboratorio
  { id: "scp40", categoriaId: "cp4", nombre: "Tubos al vacío", slug: "tubos-vacio", order: 0 },
  { id: "scp41", categoriaId: "cp4", nombre: "Agujas mariposa", slug: "agujas-mariposa", order: 1 },
  { id: "scp42", categoriaId: "cp4", nombre: "Reactivos hematología", slug: "reactivos-hematologia", order: 2 },
  { id: "scp43", categoriaId: "cp4", nombre: "Reactivos química sanguínea", slug: "reactivos-quimica", order: 3 },
  { id: "scp44", categoriaId: "cp4", nombre: "Reactivos orina", slug: "reactivos-orina", order: 4 },
  { id: "scp45", categoriaId: "cp4", nombre: "Controles y calibradores", slug: "controles-calibradores", order: 5 },
  { id: "scp46", categoriaId: "cp4", nombre: "Portaobjetos y cubreobjetos", slug: "portaobjetos-cubreobjetos", order: 6 },
  { id: "scp47", categoriaId: "cp4", nombre: "Material microbiología", slug: "material-microbiologia", order: 7 },
  // Limpieza y bioseguridad
  { id: "scp50", categoriaId: "cp5", nombre: "Desinfectantes", slug: "desinfectantes", order: 0 },
  { id: "scp51", categoriaId: "cp5", nombre: "Jabón quirúrgico", slug: "jabon-quirurgico", order: 1 },
  { id: "scp52", categoriaId: "cp5", nombre: "Toallas desinfectantes", slug: "toallas-desinfectantes", order: 2 },
  { id: "scp53", categoriaId: "cp5", nombre: "Bolsas rojas y negras", slug: "bolsas-rojas-negras", order: 3 },
  { id: "scp54", categoriaId: "cp5", nombre: "Uniformes / EPP", slug: "uniformes-epp", order: 4 },
  { id: "scp55", categoriaId: "cp5", nombre: "Mascarillas N95", slug: "mascarillas-n95", order: 5 },
  { id: "scp56", categoriaId: "cp5", nombre: "Overoles y protección", slug: "overoles-proteccion", order: 6 },
  // Oficina
  { id: "scp60", categoriaId: "cp6", nombre: "Papelería", slug: "papeleria", order: 0 },
  { id: "scp61", categoriaId: "cp6", nombre: "Tintas y toners", slug: "tintas-toners", order: 1 },
  { id: "scp62", categoriaId: "cp6", nombre: "Material de impresión", slug: "material-impresion", order: 2 },
  { id: "scp63", categoriaId: "cp6", nombre: "Tarjetas / stickers / brazaletes", slug: "tarjetas-stickers-brazaletes", order: 3 }
];

export const categoriasServicioMock: CategoriaServicio[] = [
  { id: "cs1", nombre: "CONSULTA MÉDICA", slug: "consulta-medica", area: "CONSULTA", order: 0 },
  { id: "cs2", nombre: "ULTRASONIDOS", slug: "ultrasonidos", area: "ULTRASONIDO", order: 1 },
  { id: "cs3", nombre: "RAYOS X", slug: "rayos-x", area: "RAYOS_X", order: 2 },
  { id: "cs4", nombre: "LABORATORIO CLÍNICO", slug: "laboratorio-clinico", area: "LABORATORIO", order: 3 },
  { id: "cs5", nombre: "PROCEDIMIENTOS MÉDICOS", slug: "procedimientos-medicos", area: "PROCEDIMIENTOS", order: 4 },
  { id: "cs6", nombre: "SALUD Y SEGURIDAD OCUPACIONAL", slug: "sso", area: "SSO", order: 5 },
  { id: "cs7", nombre: "ENFERMERÍA", slug: "enfermeria", area: "ENFERMERIA", order: 6 },
  { id: "cs8", nombre: "OTROS SERVICIOS", slug: "otros-servicios", area: "OTROS", order: 7 }
];

export const serviceSubcategoriasMock: Subcategoria[] = [
  // Consulta médica
  "General",
  "Pediatría",
  "Ginecología",
  "Obstetricia",
  "Medicina interna",
  "Traumatología",
  "Dermatología",
  "Nutrición",
  "Geriatría"
].map((name, idx) => ({ id: `scs1-${idx}`, categoriaId: "cs1", nombre: name, slug: slugify(name), order: idx }))
  .concat(
    [
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
    ].map((name, idx) => ({ id: `scs2-${idx}`, categoriaId: "cs2", nombre: name, slug: slugify(name), order: idx }))
  )
  .concat(
    ["Tórax", "Abdomen", "Extremidades", "Columna cervical", "Columna lumbar", "Pelvis", "Otros RX simples"].map((name, idx) => ({
      id: `scs3-${idx}`,
      categoriaId: "cs3",
      nombre: name,
      slug: slugify(name),
      order: idx
    }))
  )
  .concat(
    ["Hematología", "Química sanguínea", "Inmunología / hormonas", "Uroanálisis", "Coproanálisis", "Pruebas rápidas"].map((name, idx) => ({
      id: `scs4-${idx}`,
      categoriaId: "cs4",
      nombre: name,
      slug: slugify(name),
      order: idx
    }))
  )
  .concat(
    ["Curaciones", "Suturas", "Retiro de puntos", "Nebulizaciones", "Inyecciones", "ECG (electrocardiograma)"].map((name, idx) => ({
      id: `scs5-${idx}`,
      categoriaId: "cs5",
      nombre: name,
      slug: slugify(name),
      order: idx
    }))
  )
  .concat(
    [
      "Evaluación preocupacional",
      "Evaluación anual / periódica",
      "Evaluación de retorno",
      "Audiometría",
      "Espirometría",
      "Prueba de visión",
      "Certificados médicos laborales",
      "Jornadas y brigadas empresariales"
    ].map((name, idx) => ({
      id: `scs6-${idx}`,
      categoriaId: "cs6",
      nombre: name,
      slug: slugify(name),
      order: idx
    }))
  )
  .concat(
    ["Toma de signos vitales", "Toma de glucosa", "Controles de embarazo", "Canalización"].map((name, idx) => ({
      id: `scs7-${idx}`,
      categoriaId: "cs7",
      nombre: name,
      slug: slugify(name),
      order: idx
    }))
  )
  .concat(
    ["Atención en casa", "Telemedicina", "Traslado de muestras", "Capacitaciones"].map((name, idx) => ({
      id: `scs8-${idx}`,
      categoriaId: "cs8",
      nombre: name,
      slug: slugify(name),
      order: idx
    }))
  );

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export const proveedoresMock: Proveedor[] = [
  { id: "prov1", nombre: "Distribuidora Médica", contacto: "502-5555-0001" },
  { id: "prov2", nombre: "Proveedor Imagen", contacto: "502-5555-0002" }
];

export const unidadesMock: UnidadMedida[] = [
  { id: "u1", nombre: "Unidad", abreviatura: "u" },
  { id: "u2", nombre: "Caja", abreviatura: "caja" },
  { id: "u3", nombre: "Frasco", abreviatura: "fr" }
];

export const sucursalesInvMock: SucursalInventario[] = [
  { id: "s1", nombre: "Palín" },
  { id: "s2", nombre: "Escuintla" }
];
