export const ECONOMIC_ACTIVITIES = [
  { id: "agricultura_granos", label: "Agricultura y cultivo de granos" },
  { id: "ganaderia_produccion_pecuaria", label: "Ganadería y producción pecuaria" },
  { id: "pesca_acuicultura", label: "Pesca y acuicultura" },
  { id: "silvicultura_forestal", label: "Silvicultura y explotación forestal" },
  { id: "mineria_metalica", label: "Minería metálica (oro, cobre, hierro, etc.)" },
  { id: "mineria_no_metalica", label: "Minería no metálica (caliza, yeso, arena, etc.)" },
  { id: "petroleo_gas_extraccion", label: "Extracción de petróleo y gas" },
  { id: "refinacion_combustibles", label: "Refinación de petróleo y combustibles" },
  { id: "energia_generacion", label: "Generación de energía eléctrica" },
  { id: "energia_distribucion", label: "Transmisión y distribución eléctrica" },
  { id: "energias_renovables", label: "Energías renovables (solar, eólica, hidro)" },
  { id: "agua_tratamiento", label: "Suministro y tratamiento de agua" },
  { id: "residuos_reciclaje", label: "Gestión de residuos y reciclaje" },
  { id: "construccion_obra_civil", label: "Construcción y obra civil" },
  { id: "desarrollo_inmobiliario", label: "Desarrollo inmobiliario" },
  { id: "materiales_construccion", label: "Materiales de construcción (cemento, acero, vidrio)" },
  { id: "manufactura_alimentos", label: "Manufactura de alimentos" },
  { id: "bebidas_no_alcoholicas", label: "Bebidas (no alcohólicas)" },
  { id: "bebidas_alcoholicas", label: "Bebidas alcohólicas" },
  { id: "carnes_lacteos_procesamiento", label: "Procesamiento de carne y lácteos" },
  { id: "panaderia_pasteleria_industrial", label: "Panadería y pastelería industrial" },
  { id: "textiles_hilatura", label: "Textiles e hilatura" },
  { id: "confeccion_indumentaria", label: "Confección / industria del vestido" },
  { id: "calzado_marroquineria", label: "Calzado y marroquinería" },
  { id: "papel_carton", label: "Papel y cartón" },
  { id: "impresion_artes_graficas", label: "Impresión y artes gráficas" },
  { id: "quimicos_industriales", label: "Químicos industriales" },
  { id: "plasticos_polimeros", label: "Plásticos y polímeros" },
  { id: "farmaceutica", label: "Farmacéutica" },
  { id: "dispositivos_medicos", label: "Dispositivos médicos" },
  { id: "cosmetica_higiene", label: "Cosmética e higiene personal" },
  { id: "automotriz_autopartes", label: "Automotriz (ensamble y autopartes)" },
  { id: "maquinaria_equipo_industrial", label: "Maquinaria y equipo industrial" },
  { id: "electronica_componentes", label: "Electrónica y componentes" },
  { id: "software_ti", label: "Tecnología de la información (software)" },
  { id: "nube_datacenters", label: "Servicios en la nube / data centers" },
  { id: "telecom_internet", label: "Telecomunicaciones e internet" },
  { id: "ciberseguridad", label: "Ciberseguridad" },
  { id: "comercio_mayorista", label: "Comercio mayorista (distribución)" },
  { id: "comercio_minorista", label: "Comercio minorista (retail)" },
  { id: "ecommerce_marketplaces", label: "E-commerce / marketplaces" },
  { id: "logistica_almacenamiento", label: "Logística y almacenamiento" },
  { id: "transporte_terrestre", label: "Transporte terrestre (carga y pasajeros)" },
  { id: "transporte_maritimo_puertos", label: "Transporte marítimo y portuario" },
  { id: "transporte_aereo_aeropuertos", label: "Transporte aéreo y aeroportuario" },
  { id: "banca_servicios_financieros", label: "Banca y servicios financieros" },
  { id: "seguros", label: "Seguros" },
  { id: "servicios_profesionales", label: "Servicios profesionales (legal, contable, consultoría)" },
  { id: "salud_servicios_medicos", label: "Salud y servicios médicos" },
  { id: "educacion_formacion", label: "Educación y formación" },
  { id: "otro", label: "Otro (especificar)" }
] as const;

export type EconomicActivityId = (typeof ECONOMIC_ACTIVITIES)[number]["id"];

export const ECONOMIC_ACTIVITY_OTHER_ID: EconomicActivityId = "otro";

const ECONOMIC_ACTIVITY_ID_SET = new Set<string>(ECONOMIC_ACTIVITIES.map((item) => item.id));
const ECONOMIC_ACTIVITY_BY_ID_INTERNAL = new Map<string, { id: EconomicActivityId; label: string }>(
  ECONOMIC_ACTIVITIES.map((item) => [item.id, { id: item.id, label: item.label }])
);
const ECONOMIC_ACTIVITY_BY_LABEL_TOKEN = new Map<string, EconomicActivityId>(
  ECONOMIC_ACTIVITIES.map((item) => [normalizeToken(item.label), item.id])
);

export const ECONOMIC_ACTIVITY_BY_ID = ECONOMIC_ACTIVITY_BY_ID_INTERNAL as ReadonlyMap<string, { id: EconomicActivityId; label: string }>;

function normalizeToken(value?: string | null) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isEconomicActivityId(value?: string | null): value is EconomicActivityId {
  if (!value) return false;
  return ECONOMIC_ACTIVITY_ID_SET.has(value);
}

export function resolveEconomicActivitySelection(value?: string | null): {
  id: EconomicActivityId | null;
  legacyText: string | null;
} {
  const trimmed = value?.trim();
  if (!trimmed) return { id: null, legacyText: null };

  if (isEconomicActivityId(trimmed)) {
    return { id: trimmed, legacyText: null };
  }

  const byLabel = ECONOMIC_ACTIVITY_BY_LABEL_TOKEN.get(normalizeToken(trimmed)) ?? null;
  if (byLabel) {
    return { id: byLabel, legacyText: null };
  }

  return { id: ECONOMIC_ACTIVITY_OTHER_ID, legacyText: trimmed };
}

export function requiresEconomicActivityOtherNote(activityId?: string | null) {
  return activityId === ECONOMIC_ACTIVITY_OTHER_ID;
}
