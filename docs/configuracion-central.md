# Configuración Central (StarMedical ERP)

## Orden de la pantalla `/admin/configuracion`

La pantalla raíz está organizada en 3 bloques:

1. `Inicio`
2. `Operación`
3. `Avanzado`

Se mantiene compatibilidad con rutas existentes (`/admin/configuracion/*`) y no se renombra ninguna URL.

## 1) Inicio (Setup Wizard)

Componente: `CentralConfigSetupWizardPanel`

Checklist de 6 pasos:

1. Smoke de Configuración Central.
2. Tenant/Empresa base.
3. Sucursales activas.
4. Horarios vigentes sin solape.
5. SAT/FEL por sucursal.
6. Seguridad/Comunicaciones.

Cada paso tiene CTA `Ir a corregir` que mueve al bloque correspondiente (`Operación` o sección `Avanzado`).

## 2) Operación (Health & Consistency)

Componentes:

- `CentralConfigOperationPanel`
- `CentralConfigSmokePanel`

Objetivo:

- Validar estado operativo de sede activa.
- Confirmar horario vigente.
- Verificar estado SAT y tema.
- Ejecutar smoke técnico (`/api/admin/config/smoke`).

## 3) Avanzado

Selector de secciones con render por contexto:

- Tenant / Empresa
- Sucursales y horarios
- Tema
- Navegación
- Patentes
- Facturación
- Servicios
- Seguridad
- Comunicaciones

Cada sección conserva su ruta dedicada para operación directa:

- `/admin/configuracion/tema`
- `/admin/configuracion/navegacion`
- `/admin/configuracion/patentes`
- `/admin/configuracion/facturacion`
- `/admin/configuracion/servicios`
- `/admin/configuracion/seguridad`
- `/admin/configuracion/operaciones`

## Contrato de errores usado en config central

Para endpoints de `/api/admin/config/**`:

- `403` => `{ ok:false, code:"FORBIDDEN", error:"..." }`
- `422` => `{ ok:false, code:"VALIDATION_ERROR", error:"...", issues:[...] }`
- `409` => `{ ok:false, code:"CONFLICT", error:"...", conflict:{...} }`
- `503` => `{ ok:false, code:"DB_NOT_READY", error:"..." }`

Helper común: `lib/config-central/http.ts`.
