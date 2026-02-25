# RBAC de Configuración: Operaciones y Processing

## Capacidades centrales

StarMedical ERP usa un helper central para capacidades de configuración:

- `CONFIG_OPS_VIEW`: permite ver `/admin/configuracion/operaciones`.
- `CONFIG_PROCESSING_VIEW`: permite ver `/admin/configuracion/procesamiento` y endpoints de lectura de processing.
- `CONFIG_PROCESSING_WRITE`: permite mutaciones (`retry`, `cancel`, updates de config processing).

Mapa actual por rol:

- `CONFIG_OPS_VIEW`: `SUPER_ADMIN`, `OPS`
- `CONFIG_PROCESSING_VIEW`: `SUPER_ADMIN`, `OPS`, `TENANT_ADMIN`
- `CONFIG_PROCESSING_WRITE`: `SUPER_ADMIN`, `OPS`

Compatibilidad legacy:

- Processing también acepta permisos explícitos `CONFIG_SERVICES_READ`/`CONFIG_SERVICES_WRITE` para no romper tenants con RBAC anterior.

## Visibilidad de tabs en UI

`/admin/configuracion` aplica estas reglas:

- Si no hay `CONFIG_OPS_VIEW`, la pestaña **Operaciones** se muestra bloqueada con candado y tooltip: `Requiere SUPER_ADMIN u OPS`.
- Si no hay `CONFIG_PROCESSING_VIEW`, la pestaña **Procesamiento** se muestra bloqueada.
- El menú contextual y sidebar también filtran estos accesos para evitar rutas no autorizadas desde navegación principal.

## Protección backend (server-side)

Rutas protegidas por capacidad en servidor:

- `/api/admin/config/ops/*` (vía reglas centralizadas en RBAC de operaciones)
- `/api/admin/config/services/processing/*`
- `/api/admin/processing/*`

Esto evita depender de controles solo en frontend.

## Desarrollo: otorgar rol OPS/SUPER_ADMIN

Comando:

```bash
npm run dev:grant-role -- --email usuario@dominio.com --role OPS
npm run dev:grant-role -- --email usuario@dominio.com --role SUPER_ADMIN
```

Notas:

- El script crea el rol si no existe y luego asigna la relación `UserRole`.
- No elimina otros roles previos del usuario.
- Si el email no existe en `User`, falla con mensaje claro.
