# StarMedical ERP — Repo Cleanup Playbook

## Objetivo
Mantener limpieza estructural + consistencia UI sin romper rutas ni degradar CI.

## 1) Inventario obligatorio
Ejecutar:

```bash
node scripts/qa/repo-inventory.mjs
```

Archivos generados:
- `docs/repo/file-manifest.txt`
- `docs/repo/inventory-unused-files.txt`
- `docs/repo/inventory-duplicate-components.txt`
- `docs/repo/inventory-local-layouts.txt`
- `docs/repo/inventory-runtime-mocks.txt`
- `docs/repo/inventory-brand-hex-violations.txt`
- `docs/repo/repo-inventory-report.md`

## 2) Reglas de intervención
- Refactor quirúrgico e incremental.
- No romper rutas existentes.
- No crear nuevos hex de marca fuera de `#4aa59c #4aadf5 #2e75ba` + backgrounds `#FFFFFF #F8FAFC`.
- Para estados semánticos (success/warn/danger) usar paleta permitida del checker.

## 3) Mocks en runtime
- No introducir nuevos mocks en páginas/route handlers productivos.
- Fallback mock solo bajo flag explícito de desarrollo:
  - `ALLOW_RUNTIME_MOCKS=1`
- En producción, devolver error controlado (no datos mock).

## 4) Limpieza por fases
### Fase A — Diseño base
- Unificar `PageHeader`.
- Homologar tablas a `DataTable`.
- Remover hex sueltos en componentes compartidos.

### Fase B — Módulos críticos
- Inventario/Agenda/CRM: eliminar providers mock en runtime.
- Migrar catálogos de cards repetidas a tablas.
- Consolidar componentes duplicados por hash.

### Fase C — Deuda estructural
- Eliminar archivos sin referencias (validando con owner).
- Reducir layouts locales a casos justificados.
- Documentar excepciones en `docs/repo/repo-inventory-report.md`.

## 5) Quality gate mínimo
```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run qa:ui:tokens
```

## 6) Criterio de cierre por PR
- CI verde.
- Sin nuevos violations de tokens UI.
- Sin nuevas referencias runtime a mocks/stubs.
- Checklist de `docs/ui/STAR_UI_RULES.md` validado.
