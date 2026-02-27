# Tenant + Branch Scoping Policy

## Propósito
Definir política única de visibilidad multi-sucursal dentro del mismo tenant para Clientes/Recepción.

## Definiciones
- `tenantId`: derivado de sesión, obligatorio en toda operación tenant-scoped.
- `activeBranchId`: sucursal activa resuelta server-side.
- `allowedBranchIds`: sucursales permitidas para el usuario dentro del tenant.
- `accessMode`:
  - `LOCKED`: no puede cambiar sucursal.
  - `SWITCH`: puede operar múltiples sucursales permitidas.

## Resolución de alcance
Fuente: `lib/branch/effectiveScope.ts` + `lib/security/tenantContext.server.ts`.

Reglas:
1. Se calcula scope efectivo con sesión + cookie de sucursal + accesos de usuario.
2. Si `requestedBranchId` no está en `allowedBranchIds`, se bloquea.
3. `assertBranchAccess(context, branchId)` es la validación estándar en routes/actions.

## Política por dominio

### Clientes (catálogo maestro)
- Scope principal: `tenantId`.
- Branch scoping: no obligatorio para el registro maestro de cliente cuando el modelo no está atado a `branchId`.
- Búsqueda/listado/detalle/export: aislados por tenant.

### Recepción (operación)
- Scope principal: `tenantId` + sucursal permitida.
- Cola/check-in/visitas/service-requests: requieren branch autorizado.
- Usuario sin alcance a la sucursal: `403` (branch no permitido) o `404` (recurso no visible), según endpoint.

## Matriz de visibilidad
| Escenario | Resultado |
|---|---|
| Usuario tenant A, recurso tenant A, branch permitida | Permitido |
| Usuario tenant A, recurso tenant A, branch no permitida | Bloqueado |
| Usuario tenant A, recurso tenant B | Bloqueado (404 en detalle por ID) |
| Query/body con tenantId distinto al de sesión | Ignorado/descartado |

## Logging de bloqueos
Todo bloqueo relevante de aislamiento registra:
- `TENANT_ISOLATION_BLOCKED`
- `route`, `resourceType`, `reason`

## Notas de evolución
- Permisos explícitos tipo `*_VIEW_ALL_BRANCHES` pueden mapearse a `accessMode=SWITCH`.
- Política actual reutiliza infraestructura existente de `allowedBranchIds`/`accessMode`.
