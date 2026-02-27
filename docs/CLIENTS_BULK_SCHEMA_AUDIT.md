# CLIENTS_BULK_SCHEMA_AUDIT

## Objetivo
Definir la plantilla de carga masiva de Clientes con criterio **1:1 real** contra el backend vigente: solo columnas que hoy se pueden persistir en DB con los flujos existentes.

## Fuentes auditadas
- Formularios UI:
  - `components/clients/PersonCreateForm.tsx`
  - `components/clients/ClientOrganizationCreateFormBase.tsx`
- Server actions de creación:
  - `actionCreatePersonClient`
  - `actionCreateCompanyClient`
  - `actionCreateInstitutionClient`
  - `actionCreateInsurerClient`
  - archivo: `app/admin/clientes/actions.ts`
- Ejemplos operativos del usuario:
  - `/Users/nelsonsebastianlopez/Desktop/ejemplo de plantilla.xlsx`
  - `/Users/nelsonsebastianlopez/Desktop/Archivo.zip`
  - CSVs legacy en Downloads (`plantilla-clientes-personas*.csv`, `clientes-*-filtros-2026-02-27.csv`)

## Regla de decisión
- Se incluye en plantilla/import/export solo lo que el backend puede crear/actualizar hoy en:
  - `ClientProfile`
  - `ClientLocation` (ubicación principal)
  - `Company` (`metadata` y campos core) cuando aplica
  - notas administrativas (`ClientNote`) para columnas de nota
- Campos avanzados de wizard que no tienen mapeo robusto tabular en v1 (ej. ramas/sucursales múltiples, contactos múltiples, adjuntos binarios, fotos) quedan fuera de plantilla para evitar promesas falsas.

## Resultado por tipo (UI vs DB vs plantilla)

### PERSON
Incluido en plantilla/import/export:
- Identidad base: nombres/apellidos, sexo, documento, país/tipo documento.
- Contacto base: teléfono principal, email principal.
- Perfil base: fecha nacimiento, tipo de sangre, segmentos de servicio.
- Ubicación residencia principal: país/departamento/ciudad/dirección.
- Adquisición: canal + detalle.
- Notas.

No incluido (queda en flujo de formulario):
- Foto/perfil asset.
- Teléfonos y correos múltiples (canales avanzados).
- Relacionados/afiliaciones complejas.
- Lugar de nacimiento granular completo (admin3/free fields extendidos).

### COMPANY
Incluido en plantilla/import/export:
- Identidad fiscal/comercial: razón social, nombre comercial, NIT.
- Datos corporativos principales: forma jurídica, tamaño, actividad principal/secundaria, website.
- Ubicación principal: dirección/país/departamento/ciudad/código postal.
- Contacto base: teléfono principal, email principal, email facturación.
- Monedas: preferida/aceptadas.
- Adquisición: canal + detalle.
- Nota comercial.

No incluido (queda en flujo de formulario):
- Logo/archivos de documentos.
- Personas de contacto y canales extendidos por persona.
- Sucursales múltiples.

### INSTITUTION
Incluido en plantilla/import/export:
- Identidad institucional: nombre legal/público, tipo, régimen, sector, flag pública.
- Fiscal/comercial base: NIT, website.
- Ubicación principal: dirección/país/departamento/ciudad/código postal.
- Contacto base: teléfono principal, email principal, email facturación.
- Monedas: preferida/aceptadas.
- Adquisición: canal + detalle.
- Nota comercial.

No incluido (queda en flujo de formulario):
- Logo/documentos adjuntos.
- Contactos avanzados por persona.
- Sucursales múltiples.

### INSURER
Incluido en plantilla/import/export:
- Identidad: nombre legal/comercial, NIT.
- Configuración aseguradora: tipo, alcance, código, ramo principal/secundarios.
- Canales operativos: portal autorizaciones, emails autorizaciones/siniestros, teléfonos de soporte.
- Ubicación principal: dirección/país/departamento/ciudad/código postal.
- Contacto base: teléfono/email principal + email facturación.
- Monedas: preferida/aceptadas.
- Adquisición: canal + detalle.
- Nota comercial.

No incluido (queda en flujo de formulario):
- Reglas avanzadas de facturación (cutoff/discount rules detalladas).
- Documentos adjuntos, contactos extendidos por persona y sucursales múltiples.

## Conclusión
La plantilla v1 queda alineada con persistencia real y evita columnas "fantasma". El registry canónico en `lib/clients/bulk/clientBulkSchema.ts` gobierna template CSV/XLSX, export de datos e import (analyze/process) con la misma definición.
