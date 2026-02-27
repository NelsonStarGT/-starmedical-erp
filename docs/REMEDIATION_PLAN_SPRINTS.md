# StarMedical ERP — Plan de Remediacion Sprints 0–4

Updated: 2026-02-27
Owner: Plataforma / Tech Lead
Estado: Plan maestro de ejecucion incremental

## 1) Objetivo
Retirar deuda tecnica sin romper compatibilidad multi-tenant, manteniendo CI verde y release continuo. La estrategia se ejecuta por sprints pequenos, por dominio, con criterios de salida medibles.

## 2) Baseline actual (congelado)
Fuente: [TECH_DEBT_REGISTER](./TECH_DEBT_REGISTER.md)

- `warnDevMissingTable(...)`: 82
- `as unknown as`: 98
- `eslint-disable`: 40
- `TODO`: 47

Regla: no aumentar baseline sin ticket, justificacion y sprint de remocion.

Snapshot operativo preflight (Roadmap Integrado A+B, 2026-02-26):

- `warnDevMissingTable(...)`: 1
- `as unknown as`: 99
- `eslint-disable`: 40
- `TODO`: 41
- `eslint-disable react-hooks` en Clientes/Recepcion: 1

Evidencia:

- [WORKLOG_STAGE0.md](./WORKLOG_STAGE0.md)
- [ROADMAP_INTEGRADO_CLIENTES_V1_SPRINT3.md](./ROADMAP_INTEGRADO_CLIENTES_V1_SPRINT3.md)

## 3) Reglas no negociables
- Mantener multi-tenant seguro (sin fuga de datos entre tenants).
- No introducir fallbacks silenciosos nuevos.
- No duplicar rutas/modulos canonicos.
- Mantener app ejecutable y CI verde en cada sprint.
- Usar deprecacion por fases; evitar cambios big-bang.

## 4) Plan por sprint

## Sprint 0 (1–2 dias): Baseline y gobierno de deuda
### Objetivo
Congelar baseline y formalizar decisiones canonicas para ejecutar sprints 1–4 sin deriva.

### Alcance
- Registro de deuda por categoria y dominio.
- Guardrail de baseline (local/CI).
- Decision canonical de Recepcion.

### Tareas
- `S0.1` Completar `docs/TECH_DEBT_REGISTER.md` con:
  - conteos por categoria,
  - top 10 archivos por categoria,
  - clasificacion por dominio (Clientes/Recepcion/Portales/Ops/Medical),
  - severidad (Alta/Media/Baja).
- `S0.2` Definir baseline bloqueado + script guardrail (falla si sube conteo sin ticket).
- `S0.3` Documentar canonical route: `/admin/reception` y alias temporal `/admin/recepcion`.

### Entregables
- `docs/TECH_DEBT_REGISTER.md`
- Script de baseline guardrail (propuesto: `scripts/check-tech-debt-baseline.sh`)
- Nota canonica en docs de modulo Recepcion

### Exit criteria
- Registro y baseline publicados.
- Guardrail activo en pipeline local/CI.
- Canonical route documentada.

### Checklist QA (manual)
- [ ] Conteos del registro coinciden con `rg` en repo.
- [ ] Guardrail falla al simular aumento de deuda.
- [ ] Documentacion de ruta canonica visible en docs de Recepcion.

---

## Sprint 1 (1 semana): Unificar `recepcion/reception`
### Objetivo
Eliminar duplicidad visible de modulo/rutas sin romper compatibilidad.

### Alcance
- Redirect permanente de legacy route.
- Navegacion consolidada al canonical.
- Limpieza de referencias internas.

### Tareas
- `S1.1` Redirect `308`: `/admin/recepcion/*` -> `/admin/reception/*`.
- `S1.2` Consolidar `moduleNavRegistry` y contextual nav para mostrar un solo modulo "Recepcion".
- `S1.3` Reemplazar enlaces internos legacy por canonical.
- `S1.4` Agregar tests de redirect/rutas y QA manual en docs.

### Entregables
- Redirects productivos.
- Nav contextual consolidada.
- Referencias internas normalizadas.
- Tests de rutas/redirect.

### Exit criteria
- Un solo modulo visible para recepcion.
- 0 links internos legacy (excepto alias tecnico).
- Gate de legacy disponible y ejecutable: `npm run check:legacy:recepcion`.
- CI verde.

### Checklist QA (manual)
- [ ] Abrir `/admin/recepcion/cola` redirige a `/admin/reception/queues`.
- [ ] Tabs/contextual nav apuntan a `/admin/reception/*`.
- [ ] Bookmarks legacy siguen funcionando via redirect.

---

## Sprint 2 (1–2 semanas): Reducir fallbacks DB (82 -> <=20)
### Objetivo
Eliminar fallbacks silenciosos y convertirlos en comportamiento observable/operable.

### Prioridad por dominio
1. Clientes
2. Recepcion
3. Portales/Sesion
4. Ops/Store

### Tareas
- `S2.1` Estandarizar fallback visible:
  - badge `Fallback`,
  - CTA operativa (migrar/cargar iniciales),
  - auditoria/log de ocurrencia.
- `S2.2` Clasificar tablas en:
  - requeridas: error controlado + instruccion,
  - opcionales: fallback permitido pero visible.
- `S2.3` Implementar `schema-health` por dominio (`OK | Missing | Legacy`).
- `S2.4` Centralizar manejo P2021 en helper comun para evitar wrappers duplicados.

### Entregables
- Fallback visible en Clientes y Recepcion.
- Healthcheck de esquema por dominio.
- Reduccion fuerte de `warnDevMissingTable`.

### Exit criteria
- `warnDevMissingTable <= 20` (o reduccion >=60%).
- 0 fallback silencioso en Clientes y Recepcion.
- CI verde.

### Checklist QA (manual)
- [ ] Sin tabla requerida: UI muestra error controlado, no crash.
- [ ] Sin tabla opcional: UI muestra badge/source fallback visible.
- [ ] `schema-health` lista faltantes por dominio correctamente.

---

## Sprint 3 (1–2 semanas): Tipado fuerte y limpieza de lint suppressions
### Objetivo
Reducir riesgo por escapes de tipo y supresiones de hooks en rutas criticas.

### Prioridad
- `app/admin/clientes/actions.ts`
- Clientes/Recepcion UI con `eslint-disable react-hooks`
- Medical solo si impacta operacion actual

### Tareas
- `S3.1` Reemplazar `as unknown as` por:
  - unions discriminadas,
  - `assertNever`/invariants,
  - wrappers tipados (Prisma selects).
- `S3.2` Eliminar `eslint-disable react-hooks` con deps correctas (`useMemo/useCallback`) y funciones puras.
- `S3.3` Agregar tests focalizados en actions/listados donde cambie el contrato tipado.

### Entregables
- Reduccion documentada de type escapes y lint suppressions.
- Cobertura de tests sobre acciones criticas.

### Exit criteria
- `as unknown as <= 40` (>=50% reduccion).
- `eslint-disable <= 20` (>=50% reduccion).
- `0 eslint-disable react-hooks` en Clientes y Recepcion.
- CI verde.

### Checklist QA (manual)
- [ ] Flujos create/update clientes no cambian comportamiento.
- [ ] No warnings de hooks en componentes tocados.
- [ ] Tipos de payload/DTO verificables en compile-time.

---

## Sprint 4 (2–3 semanas): Cierre de TODOs operativos
### Objetivo
Cerrar TODOs de impacto directo en operacion, venta y seguridad.

### Tareas
- `S4.1` Clasificar TODOs: Alta/Media/Baja.
- `S4.2` Cerrar TODOs Alta + subset Media en:
  - Clientes,
  - Recepcion,
  - Facturacion/Finanzas (si productivo),
  - Portales/Sesion.
- `S4.3` Actualizar backlog de pendientes de menor prioridad.

### Entregables
- TODOs Alta cerrados.
- Backlog actualizado con ownership y prioridad.

### Exit criteria
- 0 TODO Alta.
- Documentacion backlog/release actualizada.
- CI verde.

### Checklist QA (manual)
- [ ] TODOs Alta no aparecen en `rg "TODO"` (o migrados a ticket).
- [ ] Flujos core (Clientes/Recepcion) probados end-to-end.
- [ ] Release notes de sprint publicadas.

---

## 5) Operacion de ejecucion (estandar)
- Branch por sprint: `chore/sprintX-<dominio>-<objetivo>`.
- PR pequeno por dominio (evitar mega PR).
- Gates por PR:
  - `pnpm -s typecheck`
  - `pnpm -s eslint .`
  - `pnpm -s test`
- Evidencia por sprint:
  - `docs/QA_SPRINT_X.md`
  - tag respaldo: `backup-YYYY-MM-DD-sprintX`
  - resumen: `docs/RELEASE_NOTES.md`

## 6) Riesgos y mitigaciones
| Riesgo | Impacto | Probabilidad | Mitigacion |
| --- | --- | --- | --- |
| Remocion de fallback rompe tenant legacy | Alto | Media | Clasificar tabla requerida/opcional + feature flags + rollout gradual |
| Cambios de rutas rompen bookmarks externos | Medio | Baja | Redirect 308 permanente + pruebas de alias |
| Refactor de tipos cambia contratos silenciosamente | Alto | Media | Tests de snapshot/contrato + compile checks estrictos |
| Deuda reaparece durante features urgentes | Medio | Alta | Guardrail baseline + politica de ticket obligatorio |
| Scope creep en Sprint 4 | Medio | Media | Cortar por severidad; TODO Media/Baja a backlog formal |

## 7) Medicion de exito (antes/despues)

## KPIs tecnicos
- `warnDevMissingTable`: 82 -> <=20
- `as unknown as`: 98 -> <=40
- `eslint-disable`: 40 -> <=20
- `TODO`: 47 -> 0 Alta (resto con ticket)

## KPIs operativos
- Fallback silencioso en Clientes/Recepcion: 0
- Rutas internas legacy `/admin/recepcion`: 0 (excepto alias tecnico)
- CI pass rate por sprint: 100%
- Regresiones criticas post-release: 0

## KPIs de calidad de entrega
- % PRs con checklist QA y evidencia: 100%
- % deuda nueva sin ticket: 0%
- Tiempo promedio de rollback: <=15 min (si aplica)

## Metodo de medicion
- Script de conteo automatizado por categoria (comparado contra baseline).
- Reporte por sprint en release notes: delta absoluto y porcentual.
- Registro de incidentes/regresiones en periodo de estabilizacion.

## 8) Tickets sugeridos (uno por sprint y por dominio)

## Sprint 0
- `S0-PLAT-001` Guardrail baseline deuda tecnica en CI/local.
- `S0-CLI-001` Clasificacion de deuda Clientes en registro maestro.
- `S0-REC-001` Decision canonical Recepcion documentada y publicada.
- `S0-PORT-001` Inventario deuda Portales/Sesion en TECH_DEBT_REGISTER.
- `S0-OPS-001` Inventario deuda Ops/Store en TECH_DEBT_REGISTER.
- `S0-MED-001` Inventario deuda Medical con severidad y ownership.

## Sprint 1
- `S1-PLAT-001` Redirect 308 y politica de alias legacy.
- `S1-REC-001` Consolidacion nav/contextual a `/admin/reception`.
- `S1-CLI-001` Limpieza enlaces cruzados Clientes -> Recepcion.
- `S1-PORT-001` Limpieza enlaces Portales -> Recepcion canonical.
- `S1-OPS-001` Verificacion observabilidad de redirects en entornos.
- `S1-MED-001` Validar referencias legacy hacia recepcion desde Medical.

## Sprint 2
- `S2-PLAT-001` Helper central P2021/fallback visible + auditoria.
- `S2-CLI-001` Remediar fallbacks silenciosos en Clientes.
- `S2-REC-001` Remediar fallbacks silenciosos en Recepcion.
- `S2-PORT-001` Remediar fallbacks de Portales/Sesion.
- `S2-OPS-001` Remediar fallbacks en Ops/Store + schema-health.
- `S2-MED-001` Revisar fallbacks Medical de alto riesgo.

## Sprint 3
- `S3-PLAT-001` Politica tipado fuerte + utilidades assertivas compartidas.
- `S3-CLI-001` Reducir type escapes en `app/admin/clientes/actions.ts`.
- `S3-REC-001` Eliminar `eslint-disable react-hooks` en Recepcion.
- `S3-PORT-001` Reducir casts peligrosos en Portales.
- `S3-OPS-001` Reducir casts peligrosos en Ops.
- `S3-MED-001` Reducir casts en Medical de impacto operativo.

## Sprint 4
- `S4-PLAT-001` Pipeline de clasificacion TODO Alta/Media/Baja.
- `S4-CLI-001` Cierre TODOs Alta en Clientes.
- `S4-REC-001` Cierre TODOs Alta en Recepcion.
- `S4-PORT-001` Cierre TODOs Alta en Portales/Sesion.
- `S4-OPS-001` Cierre TODOs Alta en Ops/Store.
- `S4-MED-001` Cierre TODOs Alta en Medical operativo.

## 9) Definicion de terminado global (Sprint 0–4)
- Baseline y guardrails activos.
- Recepcion canonical unificada.
- Fallback silencioso eliminado en dominios criticos.
- Reduccion significativa de escapes de tipo/suppressions.
- TODOs de severidad Alta cerrados.
- Documentacion y QA por sprint completados.
