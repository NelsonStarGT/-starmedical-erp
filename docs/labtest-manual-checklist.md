# LabTest Manual QA Checklist

- Fecha: 2026-02-02
- Alcance: LabTest operativo (sin nueva funcionalidad grande)

**Flujo End-to-End**
- [ ] Crear orden con 2+ ítems y prioridad RUTINE; confirmar status de orden deriva de ítems (REQUESTED/READY_FOR_COLLECTION según ayuno).
- [ ] Cancelar todos los ítems de una orden; confirmar orden pasa a CANCELLED.
- [ ] Confirmar que el status de orden refleja el estado con mayor avance (max rank) entre ítems activos.
- [ ] Registrar muestra para todos los ítems; confirmar items pasan a QUEUED y la orden queda en QUEUED.
- [ ] Workbench: marcar ítem en IN_PROCESS solo si tiene sampleId; intento sin muestra debe devolver error.
- [ ] Capturar resultado en Workbench; ítem pasa a RESULT_CAPTURED y orden se actualiza según ítems.
- [ ] Validar resultado; ítem pasa a TECH_VALIDATED y orden se actualiza según ítems.
- [ ] Liberar resultado; ítem pasa a RELEASED y orden pasa a RELEASED solo cuando todos los ítems están RELEASED/CANCELLED.
- [ ] Preview de resultados disponible para la orden liberada.
- [ ] Enviar resultados: solo permite enviar si orden RELEASED, ítems RELEASED/CANCELLED y cada ítem tiene resultados.
- [ ] Intentar enviar dos veces: segundo intento devuelve 409 con code `ALREADY_SENT`.

**Permisos (RBAC)**
- [ ] LAB_TECH puede crear órdenes, registrar muestras, marcar IN_PROCESS, capturar, validar, liberar y enviar.
- [ ] LAB_TECH no puede editar catálogo, plantillas ni settings (API responde 403).
- [ ] LAB_SUPERVISOR y LAB_ADMIN pueden editar catálogo, plantillas y settings.
- [ ] Endpoints de acceso de usuarios LabTest requieren rol ADMIN.

**Multi-sede**
- [ ] Usuario de branch A no ve órdenes/muestras/ítems/resultados/logs/reportes de branch B.
- [ ] Secuencias de specimen/report se incrementan por branchId y dateKey.

**Logs y Reportes**
- [ ] Logs de muestras y resultados responden con filtros de fecha y paginación `take=100`.
- [ ] Reporte resumen respeta rango de fechas y branchId del usuario.

**Performance rápida**
- [ ] Bandejas (Órdenes/Muestras/Workbench/Resultados) cargan sin demoras notables (<2s con dataset grande).
- [ ] Document preview no dispara N+1 ni payload excesivo (solo último resultado por ítem).
