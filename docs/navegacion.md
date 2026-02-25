# Navegación ERP (Sidebar + Topbar contextual)

## Alcance

La navegación unificada aplica para todo `/admin/**` vía:

- `app/admin/layout.tsx`
- `components/layout/AdminShellServer.tsx`
- `components/layout/AdminShellClient.tsx`

## Nivel 1: Sidebar global

Componente: `components/layout/Sidebar.tsx`

Características:

- Misma barra lateral para todos los módulos de `/admin/**`.
- Colapsable (`expanded/collapsed`).
- Persistencia por usuario en `localStorage`:
  - key: `star-erp-sidebar-collapsed`
- Soporta policy por tenant:
  - `defaultSidebarCollapsed`
  - `forceSidebarCollapsed`
- Accesible:
  - `aria-label`
  - `aria-pressed`
  - soporte de teclado (`Enter`/`Space`)
- Íconos de `lucide-react`.

## Nivel 2: Topbar horizontal contextual

Componente: `components/layout/ContextualTopbar.tsx`

Características:

- Subnavegación contextual por módulo actual.
- Overflow responsive con menú `⋯ Más` (en `ModuleTopTabs`).
- Reordenable por usuario (izquierda/derecha).
- Persistencia por usuario en `localStorage`:
  - key: `star-erp-topbar-order:<moduleId>`
- Puede aplicar orden base por tenant si la policy está habilitada:
  - `moduleOrderingEnabled`
  - `moduleOrder`

## Política tenant de navegación

API:

- `GET /api/admin/config/navigation`
- `PUT /api/admin/config/navigation`

UI:

- `/admin/configuracion/navegacion`
- Componente: `NavigationPolicyPanel`

Validaciones y rate-limit incluidas en backend.
