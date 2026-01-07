export type EstadoGenerico = "Activo" | "Inactivo";

export interface CategoriaProducto {
  id: string;
  nombre: string;
  name?: string;
  slug: string;
  tipo: string;
  estado?: EstadoGenerico;
  status?: EstadoGenerico;
  order?: number;
}

export interface CategoriaServicio {
  id: string;
  nombre: string;
  name?: string;
  slug: string;
  area: string;
  estado?: EstadoGenerico;
  status?: EstadoGenerico;
  order?: number;
}

export interface Subcategoria {
  id: string;
  categoriaId: string;
  nombre: string;
  name?: string;
  slug: string;
  estado?: EstadoGenerico;
  status?: EstadoGenerico;
  order?: number;
}

export interface InventoryArea {
  id: string;
  nombre: string;
  slug: string;
  order?: number;
  isExternal?: boolean;
}

export interface Proveedor {
  id: string;
  nombre: string;
  contacto?: string;
}

export interface UnidadMedida {
  id: string;
  nombre: string;
  abreviatura: string;
}

export interface SucursalInventario {
  id: string;
  nombre: string;
}

export interface Producto {
  id: string;
  nombre: string;
  codigo: string;
  categoriaId: string;
  subcategoriaId?: string;
  areaId?: string;
  unidadMedida: string;
  costoUnitario: number;
  precioVenta: number;
  baseSalePrice?: number;
  avgCost?: number;
  marginPct?: number;
  presentacion?: string;
  stockActual: number;
  stockMinimo: number;
  cantidadAlerta?: number;
  proveedorId: string;
  sucursalId: string;
  puntosDescuento?: number;
  fechaExpiracion?: string;
  imageUrl?: string;
  estado: EstadoGenerico;
  categoriaNombre?: string;
  subcategoriaNombre?: string;
  areaNombre?: string;
  stockPorSucursal?: Array<{ branchId: string; stock: number; minStock: number }>;
}

export interface ProductStock {
  id: string;
  productId: string;
  branchId: string;
  stock: number;
  minStock: number;
  updatedAt: string;
}

export type MovementType = "ENTRY" | "EXIT" | "ADJUSTMENT" | "COST_UPDATE" | "PRICE_UPDATE";

export interface InventoryMovement {
  id: string;
  productId: string;
  branchId: string;
  type: MovementType;
  quantity?: number | null;
  unitCost?: number | null;
  salePrice?: number | null;
  reference?: string | null;
  reason?: string | null;
  createdById: string;
  createdAt: string;
}

export interface ServicioProducto {
  productoId: string;
  cantidad: number;
}

export interface Servicio {
  id: string;
  nombre: string;
  categoriaId: string;
  subcategoriaId?: string;
  salaPreferidaId?: string;
  rolRequeridoId?: string;
  area?: string;
  proveedorId?: string;
  codigoServicio?: string;
  duracionMin: number;
  precioVenta: number;
  costoBase?: number;
  marginPct?: number;
  puntosDescuento?: number;
  productosAsociados: ServicioProducto[];
  costoCalculado: number;
  imageUrl?: string;
  estado: EstadoGenerico;
}

export interface ComboProducto {
  productoId: string;
  cantidad: number;
}

export interface Combo {
  id: string;
  nombre: string;
  descripcion?: string;
  serviciosAsociados: string[];
  productosAsociados: ComboProducto[];
  precioFinal: number;
  costoProductosTotal: number;
  costoCalculado: number;
  imageUrl?: string;
  estado: EstadoGenerico;
}

export interface Movimiento {
  id: string;
  productoId: string;
  cantidad: number;
  tipo: "Entrada" | "Salida" | "Ajuste";
  responsableId: string;
  sucursalId: string;
  fecha: string;
  comentario?: string;
}

export type RolInventario = "Administrador" | "Recepcion" | "Operador";

export type PurchaseRequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "ORDERED"
  | "RECEIVED_PARTIAL"
  | "RECEIVED"
  | "CANCELLED";

export type PurchaseOrderStatus = "DRAFT" | "SENT" | "RECEIVED_PARTIAL" | "RECEIVED" | "CANCELLED";

export type InventoryReportFrequency = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";
export type InventoryReportType = "KARDEX" | "MOVIMIENTOS" | "CIERRE_SAT";
export type InventoryScheduleType = "BIWEEKLY" | "MONTHLY" | "ONE_TIME";
export type InventoryBiweeklyMode = "FIXED_DAYS" | "EVERY_15_DAYS";

export interface PurchaseRequestItem {
  id: string;
  purchaseRequestId: string;
  productId: string;
  quantity: number;
  unitId?: string | null;
  supplierId?: string | null;
  notes?: string | null;
  productName?: string;
  productCode?: string;
}

export interface PurchaseRequest {
  id: string;
  code: string;
  branchId: string;
  requestedById: string;
  status: PurchaseRequestStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: PurchaseRequestItem[];
  orders?: Array<{ id: string; code: string; status: PurchaseOrderStatus; createdAt?: string }>;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  unitCost?: number | null;
  receivedQty: number;
  productName?: string;
  productCode?: string;
}

export interface PurchaseOrder {
  id: string;
  code: string;
  supplierId: string;
  branchId: string;
  createdById: string;
  status: PurchaseOrderStatus;
  requestId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItem[];
  request?: { id: string; code: string; status: PurchaseRequestStatus };
}

export interface InventoryEmailSetting {
  id: string;
  isEnabled: boolean;
  frequency: InventoryReportFrequency;
  reportType: InventoryReportType;
  branchId?: string | null;
  recipients: string;
  recipientsJson: string;
  includeAllProducts: boolean;
  scheduleType: InventoryScheduleType;
  sendTime: string;
  timezone: string;
  biweeklyMode?: InventoryBiweeklyMode | null;
  fixedDays?: string | null;
  startDate?: string | null;
  monthlyDay?: number | null;
  useLastDay?: boolean | null;
  oneTimeDate?: string | null;
  oneTimeTime?: string | null;
  sentAt?: string | null;
  lastSentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryEmailSchedule {
  id: string;
  email: string;
  isEnabled: boolean;
  reportType: InventoryReportType;
  branchId?: string | null;
  scheduleType: InventoryScheduleType;
  sendTime: string;
  timezone: string;
  oneTimeDate?: string | null;
  monthlyDay?: number | null;
  useLastDay?: boolean | null;
  biweeklyMode?: InventoryBiweeklyMode | null;
  fixedDays?: string | null;
  startDate?: string | null;
  lastSentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMarginPolicy {
  id: string;
  marginProductsPct?: number | null;
  marginServicesPct?: number | null;
  roundingMode: string;
  autoApplyOnCreate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryReportLog {
  id: string;
  settingId: string;
  reportType: InventoryReportType;
  periodFrom: string;
  periodTo: string;
  sentAt: string;
  status: string;
  error?: string | null;
}

export type AccionInventario =
  | "ver_costos"
  | "editar_producto"
  | "editar_servicio"
  | "editar_combo"
  | "editar_config"
  | "registrar_movimiento"
  | "registrar_entrada"
  | "registrar_salida"
  | "registrar_ajuste"
  | "actualizar_precio"
  | "importar_inventario"
  | "actualizar_costo"
  | "gestionar_solicitudes"
  | "gestionar_ordenes"
  | "configurar_reportes";

export function hasPermission(rol: RolInventario, accion: AccionInventario) {
  const admin = ["Administrador"];
  const recepcionPuede: AccionInventario[] = ["ver_costos"];
  const operadorPuede: AccionInventario[] = ["registrar_movimiento", "registrar_entrada", "registrar_salida", "gestionar_solicitudes"];
  if (admin.includes(rol)) return true;
  if (rol === "Recepcion") return recepcionPuede.includes(accion);
  if (rol === "Operador") return operadorPuede.includes(accion);
  return false;
}
