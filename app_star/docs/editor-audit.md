# Editor Audit: `/dev/text-editor`

Fecha: 2026-02-06  
Estado: implementado (auditoría + hardening + mejoras incrementales)

## 1) Mapa del editor

### 1.1 Rutas y puntos de entrada
- UI dev: `app/dev/text-editor/page.tsx`
- Sandbox dev: `modules/text-editor/dev/TextEditorSandbox.tsx`
- Engine principal: `modules/text-editor/TextEditorEngine.tsx`
- Toolbar: `modules/text-editor/EditorToolbar.tsx`
- Menú tipo documento: `modules/text-editor/dev/DocMenuBar.tsx`
- Rules/rulers: `modules/text-editor/Rulers.tsx`

### 1.2 APIs relacionadas
- Listado/creación docs: `app/api/text-docs/route.ts`
- Lectura/actualización por id: `app/api/text-docs/[id]/route.ts`
- Export DOCX: `app/api/text-docs/export/route.ts`
- Upload imágenes: `app/api/text-docs/upload/route.ts`

### 1.3 Extensiones activas (Tiptap)
- `StarterKit`
- `TextStyle`
- `Color`
- `Highlight`
- `Underline`
- `Link`
- `Image`
- `TextAlign`
- `Placeholder`
- `Table`, `TableRow`, `TableHeader`, `TableCell`
- `TaskList`, `TaskItem`
- Extensión custom `IndentExtension`

### 1.4 Comandos disponibles (API/editor)
- Historial: undo/redo
- Texto: bold/italic/underline/strike
- Bloques: paragraph, heading
- Alineación: left/center/right/justify
- Listas: bullet/ordered/task
- Tablas: insertar/eliminar, filas y columnas
- Contenido: imagen (URL), texto, regla horizontal
- Estado: get/set HTML/JSON/Text
- Selección: selectAll
- Sangría custom: indentMore/indentLess/setIndent/setFirstIndent

### 1.5 Fuentes de verdad y sincronización
- El engine emite `json`, `html`, `text` por `onCreate` y `onUpdate`.
- Sandbox mantiene estado local:
  - `content` (JSON)
  - `html`
  - `text`
- Header/footer opcional se sincronizan vía listeners `update` dedicados.

### 1.6 Feature flags y variantes
- Variante implementada:
  - `variant: "general" | "medical"` en `TextEditorEngine`.
  - `general`: muestra rulers.
  - `medical`: oculta rulers y handles de drag.
- `showFutureFeatures` en UI cliente:
  - visible en desarrollo.
  - oculto en producción para elementos “próximamente”.

## 2) Hallazgos y riesgos

### 2.1 Riesgos funcionales
- TAB/SHIFT+TAB no tiene keymap contextual completo (tablas/listas/párrafo).
- En módulo médico, las reglas visuales interfieren con flujo clínico.

### 2.2 Riesgos de seguridad
- `/dev/text-editor` no está bloqueado explícitamente en producción.
- Upload de imagen validaba MIME reportado por cliente, no magic bytes reales.
- `contentHtml` en text-docs se persiste sin sanitización server-side homogénea.
- Auth de rutas text-docs estaba condicionada por entorno y podía ser inconsistente.

### 2.3 Deuda UX/operativa
- Flujo imagen por archivo incompleto (input sin pipeline completo al editor).
- Uso de `window.prompt` para link/imagen URL.
- Placeholders de features no implementadas visibles en UI.
- Print con chrome de edición visible en algunos escenarios.

## 3) Backlog ejecutable

## P0 (seguridad y control)
1. Bloquear `/dev/text-editor` en producción.
2. Homogeneizar auth en todas las rutas `text-docs` (sin bypass por entorno).
3. Endurecer upload con validación de magic bytes + extensión segura.
4. Sanitizar HTML server-side en create/update de text-docs.

## P1 (UX profesional sin rediseño)
1. Completar flujo imagen local: file -> upload -> insertar.
2. Reemplazar prompts por modal para link e imagen por URL.
3. Ocultar placeholders “próximamente” en producción.
4. Mejorar print para dejar solo hoja/documento.

## P2 (calidad)
1. Reducir costo de `onUpdate` con debounce para cambios de alto volumen.
2. Checklist y pruebas mínimas de rutas críticas (upload/export/sanitización).
3. Ajustes base de accesibilidad en modales/controles.

## 4) Plan de PRs

### PR1 (bajo riesgo)
- TAB/SHIFT+TAB contextual: `table`, `list`, `paragraph`.
- `variant: "general" | "medical"` en engine.
- Soporte de prueba de variante en `/dev/text-editor`:
  - query: `?variant=medical`
  - selector dev en header.

### PR2 (controlado, seguridad)
- Bloqueo `/dev/text-editor` en producción.
- Auth homogénea en APIs text-docs.
- Upload hardening (magic bytes y extensión segura).
- Sanitización HTML server-side en create/update.

### PR3 (incremental UX/calidad)
- Imagen local completa.
- Modales (link/imagen URL).
- Ocultar placeholders en prod.
- Print cleanup + mejoras de performance/accesibilidad.

## 5) Implementado en esta iteración

### PR1 (aplicado)
- `TabKeymapExtension` en `modules/text-editor/TextEditorEngine.tsx`.
- Soporte:
  - Tabla: `Tab` siguiente celda, `Shift+Tab` celda previa.
  - Lista: sink/lift list item.
  - Texto normal: `indentMore` / `indentLess`.
- `variant` integrado en engine y activado en módulo médico:
  - `components/medical/encounter/EvolutionPanel.tsx`
  - `components/medical/encounter/ClinicalHistoryPanel.tsx`
- `/dev/text-editor` con selector y query de variante:
  - `modules/text-editor/dev/TextEditorSandbox.tsx`

### PR2 (aplicado)
- Guard de ruta dev en producción:
  - `app/dev/text-editor/page.tsx` (usa `notFound()`).
- Auth homogénea en:
  - `app/api/text-docs/route.ts`
  - `app/api/text-docs/[id]/route.ts`
  - `app/api/text-docs/export/route.ts`
  - `app/api/text-docs/upload/route.ts`
- Upload hardening con magic bytes:
  - `lib/text-docs/upload.ts`
- Sanitización HTML server-side:
  - `lib/text-docs/sanitizeHtml.ts`
  - aplicado en create/update/export de text-docs.

### PR3 (aplicado)
- Flujo de imagen local completo (upload + insert):
  - `modules/text-editor/dev/TextEditorSandbox.tsx`
  - `modules/text-editor/dev/DocMenuBar.tsx`
- Reemplazo de prompts por modal:
  - `modules/text-editor/UrlInputModal.tsx`
  - `modules/text-editor/EditorToolbar.tsx` (enlaces)
  - `modules/text-editor/TextEditorEngine.tsx` (imagen URL)
  - `modules/text-editor/dev/DocMenuBar.tsx` (imagen URL)
- Placeholders “próximamente” ocultables en prod:
  - `modules/text-editor/EditorToolbar.tsx`
  - `modules/text-editor/dev/DocMenuBar.tsx`
- Print cleanup:
  - `data-editor-nonprint` + CSS print en sandbox/engine.
- Mejora de performance:
  - debounce de `onUpdate` en `TextEditorEngine`.
- A11y base:
  - foco visible y `aria-expanded`/`aria-haspopup` en menús clave.

## 6) Pruebas automáticas ejecutadas

1. `npx eslint app/dev/text-editor/page.tsx modules/text-editor app/api/text-docs lib/text-docs tests/text-docs.security.test.ts --ext .ts,.tsx`
2. `npm run -s typecheck`
3. `npm run -s test`

Resultado: verde.

## 7) Checklist QA manual (ejecutable)

## Editor (TAB/SHIFT+TAB)
1. TAB en párrafo normal:
   - Cursor en párrafo.
   - Presionar `Tab`.
   - Esperado: aumenta sangría, no cambia foco fuera del editor.
2. SHIFT+TAB en párrafo normal:
   - Presionar `Shift+Tab`.
   - Esperado: disminuye sangría.
3. TAB en lista:
   - En ítem de lista (bullet/ordered/task).
   - `Tab` debe indentar nivel.
4. SHIFT+TAB en lista:
   - `Shift+Tab` debe desindentar nivel.
5. TAB en tabla:
   - En celda de tabla.
   - `Tab` mueve a siguiente celda.
6. SHIFT+TAB en tabla:
   - Mueve a celda anterior.

## Variante medical
1. Abrir `/dev/text-editor?variant=medical`.
2. Confirmar que rulers no se muestran.
3. Confirmar que edición, toolbar y exportes siguen funcionando.
4. Confirmar que `/dev/text-editor` (general) mantiene comportamiento actual.

## Seguridad/API
1. `/api/text-docs/upload` con PNG/JPG/WEBP válido -> `200`.
2. Upload con MIME declarado válido pero bytes inválidos -> rechazo.
3. Upload > tamaño máximo -> rechazo.
4. `POST/PUT /api/text-docs` con HTML inseguro (`script`, `onerror`) -> persistencia saneada.
5. `/dev/text-editor` en producción -> no disponible (404/redirect de seguridad).
