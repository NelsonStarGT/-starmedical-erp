# Modulo de Recepcion (separado de Diagnostico)

Este modulo es independiente del modulo de Diagnostico Clinico. Su responsabilidad es el flujo operativo de ingreso, colas y trazabilidad administrativa. No debe mezclar ordenes clinicas ni ejecucion diagnostica.

## Limites del modulo
- UI: `app/admin/reception/*`
- Servicios: `lib/reception/*`
- Componentes: `components/reception/*`
- API interna: `app/api/reception/*`

## Contrato con Diagnostico
- La integracion con areas clinicas se hace solo via `ServiceRequest`.
- Recepcion crea solicitudes y encola la visita.
- Diagnostico toma y completa solicitudes. No importa codigo de Recepcion.

## Reglas de independencia
- Recepcion no debe importar `lib/diagnostics`, `components/diagnostics` ni rutas `app/diagnostics`.
- Diagnostico no debe importar `lib/reception`, `components/reception` ni rutas `app/admin/reception`.
- ESLint aplica restricciones con `no-restricted-imports`.

## Nota operativa
Si existe un flujo de intake en Diagnostico, debe vivir en `/diagnostics/intake` y no usar el termino "recepcion" en rutas ni UI.
