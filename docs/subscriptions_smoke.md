# Smoke Test — Suscripciones E2E

Este smoke valida el flujo mínimo:

1. Inventario listados base (`productos/servicios/combos`)
2. Búsqueda unificada de inventario (`/api/inventory/search`)
3. Creación de plan B2C por API (`/api/subscriptions/memberships/plans`)
4. Afiliación manual (`/api/subscriptions/memberships/enroll`) con draft de facturación

## Archivo

- `/Users/nelsonsebastianlopez/Documents/STARMEDICAL/app_star/scripts/smoke/subscriptions-e2e.ts`

## Requisitos

- App corriendo localmente (`npm run dev`) o entorno con `BASE_URL` accesible.
- Permisos para memberships write en el contexto de autenticación.

## Comandos

### 1) Ejecución básica

```bash
BASE_URL=http://localhost:3000 npx tsx scripts/smoke/subscriptions-e2e.ts
```

### 2) Si tu entorno requiere sesión real

```bash
BASE_URL=http://localhost:3000 \
SMOKE_COOKIE="star-erp-session=<token>" \
npx tsx scripts/smoke/subscriptions-e2e.ts
```

### 3) Si usas fallback dev por rol (`CRM_DEV_ROLE_HEADER=true` en servidor)

```bash
BASE_URL=http://localhost:3000 \
SMOKE_ROLE=Administrador \
npx tsx scripts/smoke/subscriptions-e2e.ts
```

### 4) Forzar IDs (cuando no se pueden resolver automáticamente)

```bash
BASE_URL=http://localhost:3000 \
SMOKE_PLAN_ID=<planId> \
SMOKE_PATIENT_ID=<clientProfileId_PERSON> \
npx tsx scripts/smoke/subscriptions-e2e.ts
```

## Variables soportadas

- `BASE_URL` (default `http://localhost:3000`)
- `SMOKE_TIMEOUT_MS` (default `15000`)
- `SMOKE_ROLE` (default `Administrador`)
- `SMOKE_COOKIE` (cookie de sesión completa)
- `SMOKE_PLAN_ID` (opcional, reutiliza plan existente)
- `SMOKE_PATIENT_ID` (opcional, reutiliza paciente existente)

## Resultado esperado

- `PASS` en:
  - `/api/inventory/search` (ALL + por tipo)
  - creación de plan (o `WARN` con guía manual si no aplica)
  - enroll manual con status `201`
  - `contractId` y `draftInvoiceUrl` presentes

## Comportamiento en modo parcial

Si no se puede crear plan por API o no se puede resolver `patientId` automáticamente, el script:

- no rompe los checks de inventario/search
- imprime sección `[MANUAL STEPS]` con acciones concretas
- permite reintento con `SMOKE_PLAN_ID` y/o `SMOKE_PATIENT_ID`

## Notas

- Este smoke **no modifica schema/migraciones**.
- Sí crea data funcional vía APIs (plan y afiliación) cuando el entorno lo permite.
