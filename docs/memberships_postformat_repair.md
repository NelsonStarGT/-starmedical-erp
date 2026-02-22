# Memberships Post-format Repair

_As-of: 2026-02-22_

## Alcance
Cierre de reparación post-formateo del módulo de Membresías (Admin + API canónica/legacy) y hardening del componente global de tabs contextuales.

## Qué se arregló

### 1) Reparación de schema drift de Membresías
- Se alineó `prisma/schema.prisma` con la implementación v2 del módulo:
  - `MembershipPlanSegment`.
  - `MembershipPlanCategory`.
  - `MembershipPublicSubscriptionRequest`.
  - Campos en `MembershipPlan`: `segment`, `categoryId`, `imageUrl`.
  - Campo en `MembershipContract`: `lastInvoiceId`.
- Se corrigieron defaults de IDs en modelos críticos:
  - `MembershipContract.id @default(cuid())`
  - `MembershipPayment.id @default(cuid())`
  - `MembershipPlan.id @default(cuid())`

### 2) Legacy wrappers sin drift
- Se dejó `/api/membresias/*` alineado con canónico `/api/memberships/*` en los alias críticos:
  - `/api/membresias/clientes` -> reexport canónico.
  - `/api/membresias/contratos/[id]/pago` -> reexport canónico.

### 3) Cobranza fuera de Membresías (link helper)
- Se centralizó la construcción de links de facturación:
  - `lib/memberships/links.ts` -> `buildMembershipInvoiceLink(...)`.
- Se reemplazaron hardcodes en UI y servicio para reducir drift de rutas.

### 4) Paridad de pruebas legacy/canónico
- Se ampliaron pruebas en `tests/memberships.api-parity.test.ts` para incluir:
  - paridad de `clientes`.
  - paridad del alias `pago` vs endpoint canónico de `payment`.

## Qué se dejó igual (ya estaba OK)
- Estructura UI del módulo admin de Membresías (tabs fijos y sub-tabs de contratos).
- Dashboard sin KPI de saldo pendiente y con KPIs por categoría.
- Configuración con catálogo de categorías.
- Plan editor con segmento/categoría/imageUrl.
- Endpoint público de subscribe con token/HMAC + idempotency.

## Fix ModuleTopTabs

### Root cause
`ModuleTopTabs` asumía que todos los índices de `visibleIndices` seguían siendo válidos tras cambios dinámicos de `items`. En transiciones de orden/contexto, podía quedar un índice stale y `items[idx]` era `undefined`, causando:

`TypeError: Cannot read properties of undefined (reading 'disabled')`

### Fix aplicado
En `components/navigation/ModuleTopTabs.tsx`:
- Se agregó saneamiento de índices (`isValidIndex`).
- Se usa `safeVisibleIndices` (filtrados) para render y cálculo de overflow.
- Se añadieron guards defensivos (`if (!item) return null`) en render de tabs y menú "Más".

## Estado Prisma deploy

### Estado actual
- `npx prisma migrate status`: esquema al día, 52 migraciones detectadas.
- `npx prisma migrate deploy`: sin migraciones pendientes.

### Incidente observado previamente
Durante la reparación se observó un fallo intermitente de `migrate deploy` con `Schema engine error` en entorno local.

### Plan seguro recomendado (sin drift global)
1. Ejecutar `prisma migrate deploy` en CI/CD con DB de deploy estable y conectividad garantizada.
2. Mantener el control de drift en tarea separada cuando haya diferencias globales fuera de Membresías.
3. Evitar crear migraciones nuevas cuando `migrate dev` proponga cambios destructivos cross-módulo no relacionados al alcance.

## TODOs abiertos
- Cupos/asientos B2B en contratos de empresas (placeholder activo).
- Uploader de imagen de plan (actualmente URL-only).
- Integración de draft de facturación totalmente automática cuando la infraestructura de finanzas esté consolidada.
