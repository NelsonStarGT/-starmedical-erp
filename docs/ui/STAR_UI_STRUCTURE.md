# StarMedical ERP — Estructura Visual del Sistema

## 1) Navegación (2 niveles)
Nivel 1: Sidebar (módulos)
- Clientes
- CRM
- Agenda
- Usuarios
- Inventario
- Facturación
- Configuración
- Reportes
- (etc)

Nivel 2: Topbar contextual (sub-secciones por módulo)
Ejemplo Clientes:
- Dashboard
- Personas
- Empresas
- Instituciones
- Aseguradoras
- Configuración
- Reportes

**Regla:** el usuario siempre debe saber:
- "Dónde está" (módulo + sección)
- "Qué puede hacer aquí" (acciones visibles)
- "Cómo vuelve" (tabs/links consistentes)

---

## 2) Esqueleto de página (wireframe textual)

[Header global]
  - Título corto del sistema / buscador / usuario

[Sidebar fijo]
  - Icono + label
  - Estado activo visible
  - Collapsible (persistente)

[Topbar contextual del módulo]
  - Chips/tabs horizontales
  - Overflow "Más…"

[PageHeader]
  - Eyebrow (módulo)
  - Título
  - Subtítulo
  - Acciones (derecha)

[Contenido]
  - Sección A (Card) → KPIs/Resumen
  - Sección B (Tabla) → listados
  - Sección C (Form/Detalle) → ediciones

---

## 3) Densidad y legibilidad
- La UI debe ser compacta (16") pero no apretada.
- Prioridad: lectura rápida de texto y datos (tablas limpias).
- Espaciado consistente por sistema, no por "gusto del módulo".

---

## 4) Catálogos: regla de oro
Catálogos = tabla + búsqueda + filtros + acciones.
Nunca cards repetidas para 200 registros.
