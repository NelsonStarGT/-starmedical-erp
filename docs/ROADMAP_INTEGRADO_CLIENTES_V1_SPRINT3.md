# Roadmap Integrado (Camino A + Camino B)

Updated: 2026-02-26  
Owner: Tech Lead (Clientes + Recepcion + Plataforma)  
Estado: Aprobado para ejecucion incremental por etapas

## 1) Objetivo

Ejecutar un cierre operativo real de Clientes v1 (Camino A) y una remediacion tecnica medible en tipado/lint (Camino B, Sprint 3), sin parches fragiles y manteniendo CI verde en todo momento.

Resultado esperado:

- Clientes v1 operativo con correlativos, aseguradoras con ramos, afiliaciones verificables, vista comercial y reportes geo.
- Deuda tecnica reducida con contratos tipados fuertes y suppressions acotadas.
- Evidencia por etapa con QA manual + automatizado.

## 2) Baseline de arranque (Stage 0)

Fuente de evidencia: [WORKLOG_STAGE0.md](./WORKLOG_STAGE0.md)

| Metric | Baseline actual |
| --- | ---: |
| `warnDevMissingTable(` | 1 |
| `as unknown as` | 99 |
| `eslint-disable` | 40 |
| `TODO` alta/high | 0 |
| `eslint-disable react-hooks` en Clientes/Recepcion | 1 |

Gates de arranque:

- `pnpm lint` PASS
- `pnpm typecheck` PASS
- `pnpm test` PASS

## 3) Reglas no negociables

1. No introducir nuevos `as unknown as`.
2. No introducir nuevos `eslint-disable`.
3. No usar bypasses de seguridad multi-tenant.
4. No mezclar features y remediacion en PRs grandes.
5. Cada PR debe pasar `lint + typecheck + test`.
6. Todos los cambios con impacto funcional requieren pruebas y QA manual.

## 4) Estrategia de ramas y PRs

Ramas objetivo (prefijo operativo):

- `codex/feature/clients-v1-operativo`
- `codex/feature/sprint3-typing-lint`

Ramas por etapa (recomendado):

- `codex/feature/a1-client-codes`
- `codex/feature/a2-insurer-lines`
- `codex/feature/a3-affiliations`
- `codex/feature/a4-commercial-view`
- `codex/feature/a5-geo-reports`
- `codex/feature/b-sprint3-typing-lint`

Politica de PR:

- 1 PR por etapa/sub-etapa.
- Incluye: resumen, archivos tocados, QA manual, evidencia de gates, delta de metricas.

## 5) Plan de ejecucion por etapas

## ETAPA 0 - Preflight y baseline

Objetivo:

- Confirmar salud de CI y congelar baseline cuantitativo del programa.

Entregables:

- [WORKLOG_STAGE0.md](./WORKLOG_STAGE0.md)

Exit criteria:

- Gates en verde.
- Baseline registrado.

---

## ETAPA 1 (A1) - Correlativo por tipo + backfill + busqueda global

Objetivo:

- Correlativo por tenant y tipo (`C/E/I/A`) seguro en concurrencia.

Implementacion:

1. Persistencia:
   - Campo `clientCode` con unique `(tenantId, clientCode)`.
   - Tabla de contador por tenant+tipo (`ClientSequenceCounter`).
2. Generacion transaccional:
   - Reserva atomica del correlativo.
   - Guardado de `clientCode` en alta de cliente.
3. Backfill idempotente:
   - Asignar a legacy sin `clientCode`, orden `createdAt`.
4. Integracion:
   - Busqueda por `clientCode` en Clientes y Recepcion.

Pruebas minimas:

- Secuencia sin duplicados.
- Unicidad por tenant.
- Backfill idempotente.

Entregable documental:

- `docs/WORKLOG_STAGE1_CORRELATIVOS.md`

---

## ETAPA 2 (A2) - Aseguradoras con ramos de seguro

Objetivo:

- Sustituir actividad economica generica por modelo de ramos.

Implementacion:

1. Catalogo directorio tenant-scoped:
   - `INSURER_LINE_OF_BUSINESS`.
2. Formulario aseguradora:
   - Ramo principal requerido.
   - Ramos adicionales opcionales.
   - Validacion: principal no duplicado en adicionales.
3. Observabilidad:
   - Si faltan tablas/catalogo, evento visible en ERROR SYSTEMS.

Pruebas minimas:

- Validacion principal/adicionales.
- Carga defaults.
- Form submit con payload consistente.

Entregable documental:

- `docs/WORKLOG_STAGE2_INSURERS_LINES.md`

---

## ETAPA 3 (A3) - Afiliaciones persona <-> organizacion con micro-recordatorio

Objetivo:

- Gestionar vigencia y verificacion de afiliaciones para operacion de check-in.

Implementacion:

1. Modelo `ClientAffiliation`:
   - `tenantId`, `personId`, `orgId`, `orgType`,
   - `status: ACTIVE | INACTIVE | PENDING_VERIFY`,
   - `lastVerifiedAt`, `notes`.
2. Regla temporal:
   - Si supera X meses sin verificar -> `PENDING_VERIFY`.
3. UI:
   - Panel en perfil de persona (`Confirmar`, `Desvincular`).
   - Banner en check-in de Recepcion.

Pruebas minimas:

- Transiciones de estado.
- Regla de vencimiento por tiempo.
- Integracion check-in.

Entregable documental:

- `docs/WORKLOG_STAGE3_AFFILIATIONS.md`

---

## ETAPA 4 (A4) - Vista Comercial (CRM-lite)

Objetivo:

- Vista filtrable para operacion comercial previa a reportes.

Implementacion:

1. Reusar `ClientListEngine/list.service.ts`.
2. Toggle `Operativa | Comercial`.
3. Campos:
   - `clientCode`, tipo, NIT, canal, actividad/ramo, geo, contacto, estado, ultima actividad.
4. Filtros:
   - tipo, estado, canal, geo, fecha, texto.

Pruebas minimas:

- Filtros compuestos.
- Busqueda por `clientCode`.
- Paginacion y orden estable.

Entregable documental:

- `docs/WORKLOG_STAGE4_COMMERCIAL_VIEW.md`

---

## ETAPA 5 (A5) - Reportes Geo reales (base dashboard)

Objetivo:

- Reportes confiables por geo/canal/ramo con datos reales tenant-scoped.

Implementacion:

1. Capa de reportes:
   - altas por periodo,
   - distribucion pais/depto/muni,
   - canal adquisicion,
   - aseguradoras por ramo.
2. Normalizacion:
   - catalog IDs separados de texto libre (`Manual entry`).
3. Export minimo:
   - CSV y JSON.

Pruebas minimas:

- Reconciliacion conteos.
- Filtros geo.
- Export con columnas esperadas.

Entregable documental:

- `docs/WORKLOG_STAGE5_GEO_REPORTS.md`

---

## ETAPA 6 (Camino B / Sprint 3) - Tipado fuerte + limpieza lint

Objetivo:

- Reducir deuda tecnica sin hacks ni regressions.

Metas de salida:

- `as unknown as`: `99 -> <= 40`
- `eslint-disable`: `40 -> <= 20`
- `eslint-disable react-hooks` en Clientes/Recepcion: `1 -> 0`

Prioridad tecnica:

1. `app/admin/clientes/actions.ts`
2. `lib/clients/*`
3. `app/admin/reception/*` y `components/reception/*`
4. `lib/portales/*` y `lib/ops/*` de impacto operativo

Tecnica de remediacion:

- Unions discriminadas + invariantes tipadas.
- Prisma selects tipados.
- Correccion de deps de hooks sin suppressions.
- Tests de contrato donde cambie tipado.

Entregable documental:

- `docs/WORKLOG_STAGE6_SPRINT3_TYPING_LINT.md`

## 6) Gates obligatorios por etapa

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Si algun gate falla:

1. No se mergea.
2. Se corrige en la misma etapa.
3. Se registra causa raiz en el worklog de etapa.

## 7) Reporte final obligatorio

Archivo:

- `docs/WORK_REPORT_FINAL.md`

Debe incluir:

1. Cambios implementados por etapa (A1-A5 y B).
2. Decisiones tecnicas clave.
3. Lista de PRs/commits.
4. QA manual + automatizado ejecutado.
5. Metricas antes/despues:
   - `warnDevMissingTable`
   - `as unknown as`
   - `eslint-disable`
   - `TODO alta`
   - fallback silencioso
6. Riesgos residuales y backlog recomendado.

Actualizaciones asociadas:

- `docs/REMEDIATION_PLAN_SPRINTS.md`
- `docs/TECH_DEBT_REGISTER.md`

## 8) Definicion de Done

1. Clientes v1 operativo completo (correlativos, ramos, afiliaciones, vista comercial, reportes geo).
2. Metas Sprint 3 cumplidas (`<=40`, `<=20`, `react-hooks=0` en Clientes/Recepcion).
3. CI verde continuo.
4. Documentacion de etapa y reporte final entregados.

