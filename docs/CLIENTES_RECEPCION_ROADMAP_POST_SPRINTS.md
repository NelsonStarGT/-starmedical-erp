# Roadmap Post-Sprints (S0-S4) - Cierre Clientes v1 + Recepcion

Updated: 2026-02-27
Owner: Tech Lead (Clientes + Recepcion)
Status: Ready for execution

## 1) Objetivo
Cerrar el ciclo operativo real entre Clientes y Recepcion despues de la estabilizacion tecnica (sprints 0-4), con entregas por fases y QA medible.

Objetivos funcionales:
- Correlativos por tipo estables (C/E/I/A) con backfill.
- Formularios por tipo consistentes y listos para operacion.
- Afiliaciones persona <-> organizacion con verificacion periodica.
- Self check-in por link/QR con bandeja de aprobacion en Recepcion.
- Reportes reales y dashboards geo (pais/depto/muni).

## 2) Fases de entrega

## Fase 1 - Clientes v1 (correlativos + formularios + vista comercial)
Duracion estimada: 1-2 semanas

### Alcance
1. Correlativo por tipo (tenant + tipo + transaccional)
- Campo visible: `clientCode`
- Prefijos: PERSON=C, COMPANY=E, INSTITUTION=I, INSURER=A
- Unicidad: `(tenantId, clientCode)`
- Asignacion en transaccion al crear cliente
- Backfill para clientes sin codigo (orden `createdAt ASC`)
- Busqueda por `clientCode` en lista operativa/comercial

2. Revision final de formularios por tipo
- Personas: required + contactos + geo + copy
- Empresas: sucursales opcionales + docs + URL/logo
- Instituciones: regimen institucional principal/secundario
- Aseguradoras: ramos (catalogo administrable) + convenio/operacion basico

3. Vista Comercial en lista de clientes
- Toggle `Operativa | Comercial`
- Filtros: tipo, estado, canal, actividad/ramo, geo, fecha
- Busqueda global: nombre, NIT/ID, telefono, email, `clientCode`

### Entregables
- Migracion/servicio de correlativos + script backfill
- Formularios alineados por tipo
- Vista comercial funcional

### Exit criteria
- Correlativos sin duplicados en pruebas de concurrencia
- Backfill ejecutable y validado
- Busqueda por `clientCode` funcionando
- CI verde

### Checklist QA (Fase 1)
- [ ] Crear 2 clientes simultaneos del mismo tipo y tenant -> codigos unicos
- [ ] Crear cliente por cada tipo -> prefijo correcto (C/E/I/A)
- [ ] Backfill en entorno QA -> ningun duplicado, secuencia consistente
- [ ] Formularios por tipo guardan campos esperados
- [ ] Vista comercial filtra y busca por `clientCode`

### Verificacion manual (Fase 1)
1. Ir a `/admin/clientes/personas/nuevo` y crear persona; validar codigo `C###` en detalle/lista.
2. Repetir en empresas/instituciones/aseguradoras; validar prefijo `E/I/A`.
3. Ejecutar backfill en base de QA con dataset legacy.
4. Abrir `/admin/clientes/lista`, activar vista comercial y buscar por codigo.

---

## Fase 2 - Afiliaciones con verificacion
Duracion estimada: 1 semana

### Alcance
4. Modelo de afiliacion persona <-> organizacion
- Estado: `ACTIVE | INACTIVE | PENDING_VERIFY`
- Campo: `lastVerifiedAt`
- Auditoria de confirmacion/desvinculacion

5. Recordatorio de verificacion
- Micro recordatorio en ficha de persona
- Recordatorio en flujo de check-in
- Regla de vencimiento: si supera X meses sin confirmar -> `PENDING_VERIFY`

### Entregables
- Modelo/servicio de afiliaciones con trazabilidad
- UI de confirmacion rapida y cambio de estado

### Exit criteria
- Afiliaciones confirmables con 1 click
- Cambio a `PENDING_VERIFY` por antiguedad aplicado correctamente
- Eventos auditables
- CI verde

### Checklist QA (Fase 2)
- [ ] Crear afiliacion persona->empresa y confirmar
- [ ] Simular antiguedad > X meses -> cambia a `PENDING_VERIFY`
- [ ] Confirmar afiliacion en check-in y actualizar `lastVerifiedAt`
- [ ] Desvincular afiliacion sin borrar historial

### Verificacion manual (Fase 2)
1. Abrir detalle de persona y crear/vincular afiliacion.
2. Cambiar fecha de verificacion (QA) para simular vencimiento.
3. Entrar a check-in y usar accion "Confirmar afiliaciones".
4. Verificar auditoria de cambios en historial.

---

## Fase 3 - Self Check-in + Recepcion
Duracion estimada: 1-2 semanas

### Alcance
6. Invitacion por link/QR (tenant-scoped, expirable)
- Emision desde Recepcion
- Token firmado + hash persistido
- Expiracion configurable

7. Flujo publico de auto-registro
- Formulario por tipo (v1 minimo)
- Confirmacion final con correlativo provisional
- Estado inicial: `PENDING`

8. Bandeja Recepcion
- Lista de pendientes
- Aprobar/rechazar
- Aprobar crea cliente real usando motor actual de creacion

9. Integracion con cola v1
- Al aprobar, opcion de crear visita placeholder

### Entregables
- Generacion de link/QR
- Ruta publica de auto-registro
- Bandeja de aprobacion en Recepcion

### Exit criteria
- Flujo E2E: link -> pending -> aprobacion -> cliente creado
- Aislamiento tenant correcto
- Sin fuga de datos cross-tenant
- CI verde

### Checklist QA (Fase 3)
- [ ] Generar invitacion y abrir link sin login
- [ ] Completar formulario y obtener confirmacion con correlativo
- [ ] Ver pendiente en bandeja de Recepcion
- [ ] Aprobar registro y validar cliente activo creado
- [ ] Rechazar registro y validar motivo

### Verificacion manual (Fase 3)
1. Desde Recepcion, generar link con expiracion.
2. Abrir URL publica en navegador privado.
3. Completar registro y guardar comprobante.
4. Volver a Recepcion, aprobar y abrir cliente creado.
5. Validar opcion de encolar visita placeholder.

---

## Fase 4 - Reportes y dashboards geo
Duracion estimada: 1 semana

### Alcance
10. Reportes v1
- Segmentacion por tipo de cliente
- Canal de adquisicion
- Geo: pais/depto/muni
- Ramos de aseguradora

11. Dashboard v1
- KPIs principales
- Tabla geo por cobertura/conversion
- Vista comparativa por periodo

12. QA + docs
- Guia funcional de reportes
- Checklist de validacion de datos

### Entregables
- Reportes filtrables con datos reales
- Dashboard geo operativo
- Documentacion de uso y QA

### Exit criteria
- KPIs y reportes con consistencia de datos
- Filtros geo funcionales
- CI verde

### Checklist QA (Fase 4)
- [ ] Reporte por tipo coincide con total de clientes activos
- [ ] Filtro geo (pais/depto/muni) devuelve conteos correctos
- [ ] Filtro ramos aseguradora funciona en reporte comercial
- [ ] Dashboard muestra KPIs consistentes con reportes

### Verificacion manual (Fase 4)
1. Ejecutar reporte por tipo y comparar con consultas base.
2. Aplicar filtros geo en cascada y validar resultados.
3. Revisar dashboard por periodo y contraste con reporte tabular.
4. Validar export (si aplica) y paginacion.

## 3) Archivos/modulos involucrados (plan de trabajo)

Nota: lista orientativa; puede ajustarse segun implementacion final.

## Fase 1
- `prisma/schema.prisma`
- `prisma/migrations/*client_code*`
- `scripts/backfill-client-codes.ts`
- `lib/clients/clientCode.ts`
- `lib/clients/list.service.ts`
- `lib/clients/commercialList.service.ts`
- `app/admin/clientes/lista/page.tsx`
- Formularios de clientes en `components/clients/*CreateForm*.tsx`

## Fase 2
- `prisma/schema.prisma` (afiliaciones)
- `lib/clients/affiliations/*.ts`
- `components/clients/*detail*.tsx`
- `components/reception/*check-in*.tsx`

## Fase 3
- `prisma/schema.prisma` (invites/self-registrations)
- `lib/reception/clientSelfRegistration*.ts`
- `app/r/registro/[token]/page.tsx`
- `app/admin/reception/registros/*`
- `app/admin/reception/actions.ts`

## Fase 4
- `lib/clients/reports/*.ts`
- `app/admin/clientes/reportes/*`
- `components/clients/reports/*.tsx`

## 4) Riesgos y mitigacion
- Riesgo: colisiones de correlativos en alta concurrencia
  - Mitigacion: transaccion + indice unico + test de concurrencia
- Riesgo: degradacion de UX por formularios largos
  - Mitigacion: preflight por secciones + validaciones por bloque
- Riesgo: fraude/spam en self check-in
  - Mitigacion: token expirable + rate limit + auditoria
- Riesgo: inconsistencia de reportes geo
  - Mitigacion: fuentes unificadas + pruebas de reconciliacion

## 5) KPI de exito post-sprints
- % clientes con `clientCode`: 100%
- Duplicados de `clientCode` por tenant: 0
- Tiempo promedio de aprobacion de self check-in: <= 10 min (objetivo operativo)
- % afiliaciones vencidas sin verificar (>X meses): tendencia a la baja sprint a sprint
- Cobertura de reportes geo (clientes con geo util): >= 95%

## 6) Dependencias previas
- Sprints 0-4 cerrados con CI verde
- Catalogos y directorios en Configuracion de Clientes operativos
- Migraciones aplicadas en entorno QA/Stage

## 7) Definicion de terminado (global)
- Correlativos productivos + backfill completado
- Formularios por tipo cerrados y consistentes
- Afiliaciones verificables con auditoria
- Self check-in E2E operativo
- Reportes y dashboard geo funcionales con datos reales

