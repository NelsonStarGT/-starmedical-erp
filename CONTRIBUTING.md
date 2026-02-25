# Contributing

## Flujo base
1. Crear rama de trabajo.
2. Mantener cambios quirúrgicos y reversibles.
3. Ejecutar quality gates antes de abrir PR.

## Quality gates
```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run qa:ui:tokens
```

## UI rules obligatorio
Toda contribución con cambios visuales debe cumplir:
- `docs/ui/STAR_UI_RULES.md`
- `docs/ui/STAR_UI_STRUCTURE.md`

Reglas clave:
- Tokens de marca exactos: `#4aa59c`, `#4aadf5`, `#2e75ba`.
- Backgrounds oficiales: `#FFFFFF`, `#F8FAFC`.
- No nuevos hex fuera del sistema visual (salvo semánticos success/warn/danger permitidos).
- `PageHeader` obligatorio en páginas de módulo.
- Catálogos/listados deben priorizar tablas sobre cards repetitivas.
- No introducir mocks/stubs en rutas productivas.
