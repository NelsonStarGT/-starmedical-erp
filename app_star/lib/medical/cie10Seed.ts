export type Cie10SeedInput = {
  code: string;
  title: string;
  chapter: string | null;
  chapterRange: string | null;
  level: 3 | 4;
  parentCode: string | null;
  source: "WHO_OPS_PDF" | "LOCAL";
};

const CHAPTER_BY_PREFIX: Record<string, { chapter: string; chapterRange: string }> = {
  A: { chapter: "I", chapterRange: "A00-B99" },
  B: { chapter: "I", chapterRange: "A00-B99" },
  C: { chapter: "II", chapterRange: "C00-D48" },
  D: { chapter: "II", chapterRange: "C00-D48" },
  E: { chapter: "IV", chapterRange: "E00-E90" },
  F: { chapter: "V", chapterRange: "F00-F99" },
  G: { chapter: "VI", chapterRange: "G00-G99" },
  H: { chapter: "VIII", chapterRange: "H60-H95" },
  I: { chapter: "IX", chapterRange: "I00-I99" },
  J: { chapter: "X", chapterRange: "J00-J99" },
  K: { chapter: "XI", chapterRange: "K00-K93" },
  L: { chapter: "XII", chapterRange: "L00-L99" },
  M: { chapter: "XIII", chapterRange: "M00-M99" },
  N: { chapter: "XIV", chapterRange: "N00-N99" },
  O: { chapter: "XV", chapterRange: "O00-O99" },
  P: { chapter: "XVI", chapterRange: "P00-P96" },
  Q: { chapter: "XVII", chapterRange: "Q00-Q99" },
  R: { chapter: "XVIII", chapterRange: "R00-R99" },
  S: { chapter: "XIX", chapterRange: "S00-T98" },
  T: { chapter: "XIX", chapterRange: "S00-T98" },
  U: { chapter: "XXII", chapterRange: "U00-U99" },
  Z: { chapter: "XXI", chapterRange: "Z00-Z99" }
};

const CIE10_BASE_ITEMS: Array<{ code: string; title: string }> = [
  { code: "A09", title: "Diarrea y gastroenteritis de presunto origen infeccioso" },
  { code: "A15.9", title: "Tuberculosis respiratoria, no especificada" },
  { code: "A41.9", title: "Septicemia, no especificada" },
  { code: "B20", title: "Enfermedad por VIH" },
  { code: "B34.9", title: "Infeccion viral, no especificada" },
  { code: "C34.9", title: "Neoplasia maligna de bronquio o pulmon, no especificada" },
  { code: "D64.9", title: "Anemia, no especificada" },
  { code: "E03.9", title: "Hipotiroidismo, no especificado" },
  { code: "E10.9", title: "Diabetes mellitus tipo 1 sin complicaciones" },
  { code: "E11.9", title: "Diabetes mellitus tipo 2 sin complicaciones" },
  { code: "E66.9", title: "Obesidad, no especificada" },
  { code: "E78.5", title: "Hiperlipidemia, no especificada" },
  { code: "F32.9", title: "Episodio depresivo, no especificado" },
  { code: "F41.1", title: "Trastorno de ansiedad generalizada" },
  { code: "F43.2", title: "Trastornos de adaptacion" },
  { code: "G43.9", title: "Migrana, no especificada" },
  { code: "G44.2", title: "Cefalea tensional" },
  { code: "G47.0", title: "Insomnio" },
  { code: "H10.9", title: "Conjuntivitis, no especificada" },
  { code: "H66.9", title: "Otitis media, no especificada" },
  { code: "I10", title: "Hipertension esencial (primaria)" },
  { code: "I20.9", title: "Angina de pecho, no especificada" },
  { code: "I25.9", title: "Cardiopatia isquemica cronica, no especificada" },
  { code: "I48.9", title: "Fibrilacion y aleteo auricular, no especificados" },
  { code: "I50.9", title: "Insuficiencia cardiaca, no especificada" },
  { code: "J00", title: "Rinofaringitis aguda (resfriado comun)" },
  { code: "J02.9", title: "Faringitis aguda, no especificada" },
  { code: "J03.9", title: "Amigdalitis aguda, no especificada" },
  { code: "J06.9", title: "Infeccion aguda de vias respiratorias superiores, no especificada" },
  { code: "J18.9", title: "Neumonia, no especificada" },
  { code: "J20.9", title: "Bronquitis aguda, no especificada" },
  { code: "J30.9", title: "Rinitis alergica, no especificada" },
  { code: "J44.9", title: "Enfermedad pulmonar obstructiva cronica, no especificada" },
  { code: "J45.9", title: "Asma, no especificada" },
  { code: "K21.9", title: "Reflujo gastroesofagico sin esofagitis" },
  { code: "K29.7", title: "Gastritis, no especificada" },
  { code: "K35.8", title: "Apendicitis aguda, otra y no especificada" },
  { code: "K52.9", title: "Gastroenteritis y colitis no infecciosas, no especificadas" },
  { code: "K59.0", title: "Estreñimiento" },
  { code: "K80.2", title: "Calculo de vesicula biliar sin colecistitis" },
  { code: "K81.9", title: "Colecistitis, no especificada" },
  { code: "K92.1", title: "Melena" },
  { code: "L20.9", title: "Dermatitis atopica, no especificada" },
  { code: "L30.9", title: "Dermatitis, no especificada" },
  { code: "M17.9", title: "Gonartrosis, no especificada" },
  { code: "M25.5", title: "Dolor articular" },
  { code: "M54.2", title: "Cervicalgia" },
  { code: "M54.5", title: "Lumbalgia" },
  { code: "M79.1", title: "Mialgia" },
  { code: "N18.9", title: "Enfermedad renal cronica, no especificada" },
  { code: "N30.0", title: "Cistitis aguda" },
  { code: "N39.0", title: "Infeccion de vias urinarias, sitio no especificado" },
  { code: "N92.6", title: "Menstruacion irregular, no especificada" },
  { code: "O80", title: "Parto unico espontaneo" },
  { code: "O99.8", title: "Otras enfermedades y afecciones especificadas que complican el embarazo" },
  { code: "P07.3", title: "Otros recien nacidos pretermino" },
  { code: "Q90.9", title: "Sindrome de Down, no especificado" },
  { code: "R05", title: "Tos" },
  { code: "R07.9", title: "Dolor toracico, no especificado" },
  { code: "R10.4", title: "Otros dolores abdominales y los no especificados" },
  { code: "R11", title: "Nausea y vomito" },
  { code: "R42", title: "Mareo y desvanecimiento" },
  { code: "R50.9", title: "Fiebre, no especificada" },
  { code: "R51", title: "Cefalea" },
  { code: "R53", title: "Malestar y fatiga" },
  { code: "R55", title: "Sincope y colapso" },
  { code: "S06.0", title: "Conmocion cerebral" },
  { code: "S09.9", title: "Traumatismo de la cabeza, no especificado" },
  { code: "T78.4", title: "Alergia, no especificada" },
  { code: "U07.1", title: "COVID-19, virus identificado" },
  { code: "Z00.0", title: "Examen medico general" },
  { code: "Z00.1", title: "Examen de salud de rutina del niño" },
  { code: "Z01.8", title: "Otros examenes especiales especificados" },
  { code: "Z23", title: "Necesidad de inmunizacion" },
  { code: "Z34.9", title: "Supervision de embarazo normal, no especificado" },
  { code: "Z71.9", title: "Asesoramiento, no especificado" },
  { code: "Z76.0", title: "Emision de receta repetida" },
  { code: "Z79.4", title: "Uso prolongado de insulina" },
  { code: "Z86.3", title: "Antecedentes personales de enfermedades endocrinas, nutricionales y metabolicas" },
  { code: "Z87.0", title: "Antecedentes personales de enfermedades del aparato respiratorio" },
  { code: "Z91.1", title: "Incumplimiento del tratamiento medico" },
  { code: "Z98.8", title: "Otros estados posquirurgicos especificados" }
];

function parseLevel(code: string): 3 | 4 {
  return code.includes(".") ? 4 : 3;
}

function parseParentCode(code: string): string | null {
  return code.includes(".") ? code.slice(0, 3) : null;
}

function chapterForCode(code: string) {
  const prefix = code.charAt(0).toUpperCase();
  return CHAPTER_BY_PREFIX[prefix] || { chapter: "NA", chapterRange: "NA" };
}

export const CIE10_LOCAL_SEED: Cie10SeedInput[] = CIE10_BASE_ITEMS.map((item) => {
  const code = item.code.toUpperCase();
  const chapter = chapterForCode(code);
  return {
    code,
    title: item.title,
    chapter: chapter.chapter,
    chapterRange: chapter.chapterRange,
    level: parseLevel(code),
    parentCode: parseParentCode(code),
    source: "LOCAL"
  };
});
