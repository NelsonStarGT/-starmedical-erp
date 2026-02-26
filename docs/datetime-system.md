# Date/Time System (Tenant)

## Fuente de verdad
- Configuración por tenant: `TenantDateTimeConfig`
  - `dateFormat`: `DMY | MDY | YMD`
  - `timeFormat`: `H12 | H24`
  - `timezone`: IANA (ej. `America/Guatemala`)
  - `weekStartsOn`: `MON | SUN`
- Servicio central: `lib/datetime/config.ts`
- API de lectura para módulos: `GET /api/datetime/config`
- API administrativa de edición: `GET/PUT /api/admin/config/datetime`

## Componentes UI estándar
- `components/ui/DateField.tsx`
- `components/ui/DateRangeField.tsx`
- `components/ui/TimeField.tsx`
- `components/ui/DateTimeField.tsx`

## Regla de implementación (enforcements)
- No usar `input type="date"` ni `input type="datetime-local"` en nuevos desarrollos ERP.
- Usar los componentes de `components/ui` para consistencia de formato, parseo y timezone.

## Migración inicial
- Recepción (citas): formulario de alta de cita y fecha de nacimiento rápida.
- Diagnóstico (módulo médico): filtros con rango de fechas.
- Médico: agenda por fecha y worklist operativa por rango.

## Pendiente
- Sustituir `input type="date"` legacy restantes por componentes estándar en módulos no migrados.
