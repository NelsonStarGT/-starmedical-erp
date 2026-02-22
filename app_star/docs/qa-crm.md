# QA CRM – Hardening / Quote v2 / Teléfonos / PDF

## Navegación
- [x] Abrir deal desde Pipeline/Bandeja/List (B2B/B2C) con #cotizaciones ⇒ sin 404, datos cargan.

## Permisos
- [x] No-admin: botones Aprobar/Rechazar/Ganar/Reasignar ocultos o deshabilitados con tooltip; backend responde 403.
- [x] Admin: puede aprobar, activar y cerrar GANADO.

## Quotes v2
- [x] Crear DRAFT → request approval → approve ⇒ isActive=true; deal.amount actualizado.
- [x] Al aprobar nueva, desactiva anterior.
- [x] GANADO/NEGOCIACION bloqueados sin Quote v2 aprobada y activa; UI muestra tooltip/bloqueo.

## Stages
- [x] NEGOCIACION bloqueado sin APPROVED active.
- [x] GANADO bloqueado sin APPROVED active y sin ADMIN.

## PDF
- [x] B2C genera y abre PDF simple.
- [x] B2B: botones deshabilitados con tooltip; API devuelve 400 “PDF B2B aún no disponible”.

## Teléfonos
- [x] Crear/editar/eliminar teléfonos en detalle de contacto/paciente; primer número es principal.
- [x] phonesJson persiste y phone legacy refleja principal.

## Toasts / errores
- [x] Pipeline/Bandeja/List/Wizard B2C/Deal detail muestran toasts consistentes: 403 “Acción solo para administrador.”, 400 mensaje backend, 500 “Error inesperado. Reintenta.”.

## Observaciones
- Datos de prueba utilizados; repetir con datos productivos antes de salida a operación.
