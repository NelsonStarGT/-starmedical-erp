# StarMedical ERP — UI Rules (No negociable)

## Objetivo
Mantener una interfaz clínica: serena, confiable, compacta (pantalla 16"), consistente y escalable.
Nada de "cada módulo con su propio diseño".

---

## 1) Brand Tokens (EXACTOS)
**Colores de marca (usar HEX exacto, sin aproximaciones):**
- Primary Teal (Acción): **#4aa59c**
- Secondary Sky (Acento): **#4aadf5**
- Corporate Blue (Estructura/encabezados): **#2e75ba**
- Background base: **#FFFFFF**
- Background suave: **#F8FAFC**

**Regla:** cualquier botón primario, foco, estado activo o highlight debe derivar de #4aa59c / #4aadf5 / #2e75ba.

---

## 2) Tipografía (fallbacks aprobados)
- Títulos (Display): **Montserrat** o **Poppins** (600–700)
- Cuerpo (UI/data): **Inter** o **Nunito Sans** (400–600)

**Regla:** tablas y formularios priorizan legibilidad (Inter/Nunito). Títulos/headers: Montserrat/Poppins.

---

## 3) Layout global (AppShell)
### Estructura fija
- **Sidebar fija** (navegación primaria)
- **Header superior** (acción rápida + usuario + búsqueda opcional)
- **Topbar contextual** (navegación secundaria del módulo) con overflow "Más…"

### Densidad (16” friendly)
- Texto base: 14px (Tailwind `text-sm`)
- Títulos de página: 20–24px (`text-xl`–`text-2xl`)
- Padding estándar de cards/sections: 16–20px (`p-4` / `p-5`)
- Gaps: `gap-2`/`gap-3` por defecto

**Regla:** la UI debe "respirar", pero sin desperdiciar verticalidad.

---

## 4) Patrones obligatorios de página
### 4.1 PageHeader (todas las páginas)
Siempre arriba:
- Eyebrow (módulo) en azul: #2e75ba
- Título principal
- Subtítulo breve (1 línea)
- Acciones a la derecha (botón primario + secundarios)

### 4.2 Sections
El contenido se divide en **secciones** (cards) y **tablas**.

- **Cards**: solo para resúmenes/KPIs/tiles/acciones.
- **Tablas**: para catálogos y listados (evitar cards repetitivas para datos tabulares).

---

## 5) Componentes UI (estilo)
### Bordes / sombras
- Bordes: `rounded-xl` (preferido) o `rounded-lg`
- Sombras: `shadow-sm` o `shadow-md` suaves
- Borde estándar de contenedor: `border` con tono frío (ej. slate-200 / azul muy claro)

### Botones
- Primario: fondo **#4aa59c**, texto blanco, `rounded-full`, `shadow-sm`
- Hover primario: puede ir hacia **#4aadf5** (suave)
- Secundario: fondo blanco, borde slate-200, hover borde #4aadf5, texto #2e75ba en hover

### Inputs / Focus
- Focus ring: usar #4aa59c con opacidad (ej. ring 20–30%)
- Nada de rojos chillones por default: error solo cuando aplica.

---

## 6) Tablas (data first)
- Header: background **#F8FAFC**, texto **#2e75ba**
- Zebra striping: alternar `bg-white` con `bg-slate-50/60`
- Densidad: `text-sm`, celdas `px-3 py-2`
- Acción de fila: botones pequeños `rounded-full`

---

## 7) Estados (semánticos)
Marca manda, pero necesitamos semáforo:
- Success: verde (Tailwind estándar permitido)
- Warning: ámbar permitido
- Danger: rojo permitido

**Regla:** nunca uses esos colores para navegación/branding. Solo estados.

---

## 8) Reglas de consistencia (anti-caos)
- Ningún módulo puede crear su propio "mini layout".
- Nada de hex sueltos en componentes si ya existe token/variable/clase.
- Si algo se repite 3 veces → componente reusable.
- Si algo es catálogo/listado → tabla, no cards.

---

## 9) Checklist de aceptación UI (por PR)
- Respeta tokens de marca exactos (#4aa59c/#4aadf5/#2e75ba)
- PageHeader presente
- Tablas con zebra + header correcto
- Sidebar/header con tamaños consistentes
- No layouts locales duplicados
- No mocks en páginas productivas
