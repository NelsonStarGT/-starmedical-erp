# Plan Fase 3 – Consolidación de rutas y duplicidades

## 1. Automations
- Situación: `/automations` (motor general) y `/ops/whatsapp/automations` (WhatsApp).
- Decisión: mantener **canónica** `/ops/whatsapp/automations` dentro de Comunicaciones. `/automations` se reserva para automatizaciones de sistema si/ cuando se activen.
- Acción aplicada: Sidebar muestra subitem “Automatizaciones” bajo “Comunicaciones > WhatsApp” (no se añadió entrada global para evitar ruido).
- Pendiente: si se habilita el motor general, crear sección “Sistema” y mover `/automations` allí (o redirigir a panel dedicado).

## 2. APIs de Membresías
- Situación: duplicado `/api/memberships/*` (en) y `/api/membresias/*` (es).
- Decisión: **canónico** `/api/memberships/*`. Legacy `/api/membresias/*` se mantiene como alias.
- Acción aplicada:
  - UI ya consume `/api/memberships/*` (sin cambios).
  - Endpoints legacy anotados con `@deprecated` en archivos `app/api/membresias/**/route.ts` para avisar a devs.
- Pendiente: futuro cleanup podría convertir todos los legacy a simples re-export o eliminar tras migración completa y coordinación con integraciones externas.

## 3. Marcaje
- Situación: rutas públicas (`/marcaje`, `/marcaje/tokens`, `/punch/[token]`) y config admin (`/admin/configuracion/marcaje`).
- Recomendación: mantener “Marcaje” en sección Administración (staff). Exponer “Tokens” solo como ruta secundaria (no top-level) si se agrega subnavegación interna; no mover rutas aún.
- Pendiente: si se agrega subitem, usar children en nav para `/marcaje/tokens`.

## 4. Redirects / Rutas canónicas ya aplicadas
- Health checks: `/admin/health` → `/diagnostics/health-checks` (canónica en diagnóstico).
- WhatsApp legacy: `/whatsapp` y `/whatsapp/*` → `/ops/whatsapp/*`.

## Checklist de cierre
- [x] Sidebar usa nav.ts como fuente única.
- [x] Health checks bajo `/diagnostics/health-checks` (redirect desde admin).
- [x] WhatsApp legacy redirige a `/ops/whatsapp/*`.
- [x] Nav muestra subitem “Automatizaciones” en Comunicaciones.
- [x] APIs legacy de membresías marcadas `@deprecated`.
- [ ] Decidir exposición futura de `/automations` (motor general) y posible sección “Sistema”.
