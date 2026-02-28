# Runbook — Reportes Clientes v2

## 1) Objetivo del módulo
Entregar métricas y listados de clientes confiables por tenant, con filtros reproducibles y exportes operables por rol.

## 2) Reglas de acceso (RBAC)

### Capacidades
- `CLIENTS_REPORTS_VIEW`: acceso a pantalla y APIs de reportes.
- `CLIENTS_REPORTS_EXPORT`: habilita intención de exportar.
- `CLIENTS_REPORTS_EXPORT_FULL`: permite datos completos.
- `CLIENTS_REPORTS_EXPORT_MASKED`: permite export enmascarado.

### Resolución de alcance de export
- `full`: puede exportar completo o enmascarado.
- `masked`: solo enmascarado (forzado).
- `none`: sin acceso a export.

## 3) Filtros y consistencia

### Filtro país
- Fuente de verdad: cookie `CLIENTS_COUNTRY_FILTER` (barra superior del módulo).
- En Reportes no existe selector de país interno.

### Filtros principales
- `q`, `type`, `from`, `to`, `sourceId`, `detailId`, `referredOnly`.
- `to` es inclusivo (fin de día local).
- `referredOnly` impacta list/count/summary/geo desde la query base (no post-proceso).

## 4) Interpretación de métricas
- **Total en rango**: cantidad de clientes creados en rango con filtros activos.
- **Con documento/teléfono/email/birthDate**: porcentajes sobre total en rango.
- **Top canales**: agregación por fuente de adquisición.
- **Geo por país/admin1/admin2**: buckets geográficos usando ubicación activa (prioriza principal/reciente).
- **Referidos**: resumen de enlaces de referidos cuando el modelo está disponible.

## 5) Exportación

### Modal de export
Permite:
- Formato: `XLSX` o `CSV`.
- Grupos/columnas dinámicas.
- Modo PII enmascarado según rol.

### Guardrails
- Máximo filas por export: `50,000`.
- Si excede límite: error 422 con instrucción de acotar filtros/rango.

### Campos PII enmascarables
- Documento/NIT
- Teléfono
- Email

## 6) Mapa interactivo
- Burbujas por país en mapa mundial.
- Click en país para drill-down de admin1/admin2.
- Usa endpoint `GET /api/clientes/reportes/geo` con `countryId` en query para el detalle.

## 7) Troubleshooting rápido

### Veo 403 en reportes
- Verificar `CLIENTS_REPORTS_VIEW` en permisos efectivos del usuario.

### Export deshabilitado
- Verificar combinación de:
  - `CLIENTS_REPORTS_EXPORT`
  - `CLIENTS_REPORTS_EXPORT_FULL` o `CLIENTS_REPORTS_EXPORT_MASKED`

### Export incompleto
- Revisar si dataset supera 50k y endpoint devolvió 422.
- Ajustar rango/segmentación.

### Mapa sin burbujas
- Revisar si los países del resultado tienen `countryIso2` resoluble.
- Entradas manuales sin `geoCountryId` aparecen en tabla, no en bubble map.

## 8) Checklist QA (10 min)
1. Entrar con usuario autorizado y validar que reportes carga sin selector país interno.
2. Cambiar filtro país global (barra superior) y confirmar impacto en resultados.
3. Activar `Solo referidos` y validar conteo/paginación congruente.
4. Exportar XLSX con >100 filas y validar que no se trunca en 100.
5. Probar export masked y confirmar enmascarado de documento/tel/email.
6. Hacer click en país del mapa y validar actualización de admin1/admin2.
7. Probar usuario sin VIEW y confirmar 403.
8. Probar usuario con VIEW pero sin EXPORT y confirmar export bloqueado.
