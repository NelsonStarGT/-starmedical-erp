# PR-02 Query Scope Audit (Inventario)

Fecha: 2026-03-04

## Objetivo
Detectar llamadas `findMany()` en rutas de inventario que no apliquen scope real (`tenantId` + `deletedAt: null`), aceptando también el helper `inventoryWhere(scope, ...)`.

## Comandos usados

```bash
rg -n '\.findMany\(' app/api/inventario app/api/inventory
```

```bash
rg -n '\.findMany\(' app/api/inventario app/api/inventory | while IFS=: read -r file line _; do
  end=$((line+40))
  snippet=$(sed -n "${line},${end}p" "$file")
  echo "$snippet" | rg -q 'where\s*:\s*inventoryWhere\(|tenantId\s*[:=]' || echo "${file}:${line}"
done
```

## Resultado
- Hallazgos heurísticos iniciales: 15.
- Revisión manual de los 15 hallazgos: **0 brechas reales**.
- Estado final: **0 queries `findMany()` sin scope tenant/deletedAt** en `app/api/inventario/*` y `app/api/inventory/*`.

## Excepciones justificadas
- No hubo excepciones funcionales.
- Los 15 hallazgos fueron falsos positivos por limitación del grep heurístico (variables intermedias o filtros construidos fuera del bloque de 40 líneas inspeccionado).
