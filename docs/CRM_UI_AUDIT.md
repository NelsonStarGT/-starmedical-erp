# CRM UI Audit (Fase 1)

Fecha: 2026-02-22  
Rama: `feat/crm-ui-drawer-v2`

## 1) Estado actual (cómo está construido)

### Stack y estructura
- Frontend: Next.js App Router + React client components en `app/admin/crm/**`.
- UI base: componentes locales (`Card`, `Modal`, `Toast`) en `components/ui/**`.
- Datos: llamadas directas `fetch`/`fetchJson` desde cada pantalla a `app/api/crm/**`.
- Diseño actual: utilidades Tailwind inline por pantalla (no existe sistema de densidad CRM dedicado).

### Layout CRM
- `app/admin/crm/layout.tsx` envuelve todo en `CrmLayoutClient`.
- `app/admin/crm/CrmLayoutClient.tsx` define:
  - selector de tipo pipeline (`b2b` / `b2c`),
  - tabs (`Bandeja`, `Pipeline`, `Worklist`, `Calendario`),
  - acciones superiores (`Nueva oportunidad`, `Configuración`, `Auditoría`).

### Pantallas operativas revisadas
- `app/admin/crm/inbox/InboxClient.tsx`
- `app/admin/crm/pipeline/PipelineClient.tsx`
- `app/admin/crm/list/ListPageClient.tsx`
- `app/admin/crm/deal/[id]/DealClient.tsx`
- `app/admin/crm/calendario/page.tsx`
- `app/admin/crm/settings/page.tsx`

## 2) Hallazgos UX/UI del estado actual

### Espacio vertical y densidad
- Los headers/hero de cada vista usan bloques grandes (`space-y-6`, títulos + subtítulos + notas), reduciendo área útil above-the-fold.
- Botones predominantes `rounded-full` con `px-4/5 py-2` y tablas con celdas `py-3/4`; la densidad es baja para operación intensiva.
- En `Inbox` se usan tarjetas grandes de resumen + cards de contenido, lo que incrementa scroll inicial.

### Duplicidad funcional
- Existe modal gigante "Acciones del deal" en tres vistas:
  - `app/admin/crm/inbox/InboxClient.tsx`
  - `app/admin/crm/pipeline/PipelineClient.tsx`
  - `app/admin/crm/list/ListPageClient.tsx`
- El mismo flujo también aparece en la página de detalle del deal (`/admin/crm/deal/[id]`), generando 3-4 puntos de entrada con lógica parecida.
- `Pipeline` y `Worklist` comparten tabla de deals con acciones similares y poca diferenciación de objetivo operacional.

### Patrones visuales y marca
- Predominan colores oscuros (`bg-slate-900`) para CTAs primarios.
- Encabezados de tabla y chips no siguen una guía de marca CRM consistente (teal/sky/corporate blue).
- El modal actual usa `max-w-2xl`/`max-w-6xl` según contexto y se percibe como "pantalla dentro de pantalla".

## 3) APIs activas detectadas (frontend CRM)

### Bandeja (`InboxClient`)
- `GET /api/crm/deals/inbox?type=...`
- `PATCH /api/crm/deals`
- `POST /api/crm/activities`
- `POST /api/crm/quotes-v2/:id/approve`
- `POST /api/crm/quotes-v2/:id/reject`

### Pipeline (`PipelineClient`)
- `GET /api/crm/deals?pipelineType=...&status=OPEN`
- `GET /api/crm/quotes-v2?dealId=...`
- `GET /api/crm/requests?dealId=...`
- `PATCH /api/crm/deals`
- `POST /api/crm/quotes-v2`
- `GET /api/crm/quotes-v2/:id`
- `POST /api/crm/quotes-v2/:id/approve`
- `POST /api/crm/quotes-v2/:id/reject`
- `POST /api/crm/requests`
- `PATCH /api/crm/requests`
- `POST /api/crm/activities`
- `POST /api/crm/tasks`

### Worklist (`ListPageClient`)
- `GET /api/crm/deals?pipelineType=...&status=OPEN`
- `PATCH /api/crm/deals`
- `POST /api/crm/quotes-v2/:id/approve`
- `POST /api/crm/quotes-v2/:id/reject`

### Deal detail (`DealClient`)
- `GET /api/crm/deals/:id`
- `PATCH /api/crm/deals`
- `POST /api/crm/activities`
- `GET /api/crm/quotes-v2?dealId=...`
- `POST /api/crm/quotes-v2/upload`
- `POST /api/crm/quotes-v2/:id/request-approval`
- `POST /api/crm/quotes-v2/:id/approve`
- `POST /api/crm/quotes-v2/:id/reject`
- `POST /api/crm/quotes-v2/:id/send`
- `GET /api/crm/quotes-v2/:id/deliveries`
- `PATCH /api/crm/contacts`

## 4) Cotizaciones PDF externas (estado actual)

### Lo que ya existe
- Carga PDF en `DealClient` para B2B/B2C (`/api/crm/quotes-v2/upload`).
- Persistencia actual usa `persistQuotePdf` (`lib/quotes/storage.ts`) + `FileAsset` + URL protegida `/api/files/:id`.
- Descarga/preview protegida por RBAC y ownership en `app/api/files/[id]/route.ts`.

### Riesgo detectado
- Existen rutas legacy de generación PDF que todavía escriben en `public/uploads/quotes` (`/api/crm/quotes/*/generate-pdf` y `/api/crm/quotes-v2/*/generate-pdf`).
- Convivencia de flujo seguro y flujo legacy crea inconsistencia operativa/técnica.

## 5) Validaciones de etapa actuales

### Implementadas en UI
- `GANADO` requiere admin + cotización aprobada.
- `PERDIDO` requiere motivo.
- `COTIZACION` requiere existencia de cotización.
- `NEGOCIACION` requiere cotización aprobada.

### Brechas frente al objetivo PRO
- No se valida explícitamente "Comunicado requiere >=1 actividad".
- No se valida explícitamente "En comunicación requiere próxima acción" con contrato UX consistente entre vistas.
- No se exige señal operativa configurable para `GANADO` (cita/orden/contrato según B2C/B2B).

## 6) Redundancias concretas

1. "Acciones del deal" en 3 pantallas (modal grande duplicado).
2. Acciones de cotización y cierre distribuidas entre tabla, modal y detalle.
3. Patrones de controles repetidos sin componente compartido (estilos y tamaños divergentes).
4. `Pipeline` y `Worklist` con propósito cercano y baja diferenciación UX.

## 7) Plan de unificación (para Fase 2)

### Componente único
- Crear `components/crm/CrmDealDrawer.tsx` como patrón principal de interacción.
- Reemplazar modal grande en Inbox/Pipeline/Worklist por Drawer lateral (mobile: bottom sheet).

### Densidad CRM local (sin afectar ERP global)
- Definir tokens locales de densidad en layout CRM (CSS vars):
  - `--crm-row-h`
  - `--crm-control-h`
  - `--crm-gap`
  - `--crm-card-pad`
- Aplicarlos solo dentro de `app/admin/crm/**`.

### Marca y coherencia visual
- Migrar CTAs principales a:
  - Primary `#4aa59c`
  - Hover/acento `#4aadf5`
  - Encabezados/tablas `#2e75ba`
  - Fondos `#FFFFFF` y `#F8FAFC`

### Navegación funcional
- Mantener rutas actuales.
- `Pipeline`: añadir toggle Tabla/Kanban y abrir Drawer desde fila/tarjeta.
- `Inbox`: conservar foco en priorización (riesgo/acciones hoy) con bloques compactos.
- `Worklist`: posicionarla como lista avanzada compacta (supervisión).

## 8) Alcance ejecutable inmediato (Fase 2 en esta rama)

- `CrmDealDrawer` reutilizable en `components/crm/**`.
- Reemplazo de modal "Acciones del deal" por Drawer en:
  - `app/admin/crm/inbox/InboxClient.tsx`
  - `app/admin/crm/pipeline/PipelineClient.tsx`
  - `app/admin/crm/list/ListPageClient.tsx`
- Compact mode CRM local y reducción de hero/spacing en:
  - `app/admin/crm/CrmLayoutClient.tsx`
  - vistas CRM operativas anteriores.
- Toggle Tabla/Kanban en `PipelineClient`.
