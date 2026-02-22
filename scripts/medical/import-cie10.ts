/**
 * TODO(cie10-import): importer masivo desde CSV/JSON estructurado.
 *
 * Recomendado:
 * 1) Normalizar dataset oficial a columnas:
 *    code,title,chapter,chapterRange,level,parentCode,source
 * 2) Validar formato (3/4 caracteres) y deduplicar por code.
 * 3) Upsert por code en Icd10Code y registrar auditoria por lote.
 *
 * Este script se deja como placeholder para no parsear directamente el PDF.
 */

console.info("CIE-10 importer TODO: usar dataset estructurado (CSV/JSON), no parseo directo de PDF.");
process.exit(0);
