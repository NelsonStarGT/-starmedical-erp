import { Movimiento } from "@/lib/types/inventario";

export const movimientosMock: Movimiento[] = [
  {
    id: "mov1",
    productoId: "p1",
    cantidad: 50,
    tipo: "Entrada",
    responsableId: "admin-1",
    sucursalId: "s1",
    fecha: "2024-05-01",
    comentario: "Compra proveedor"
  },
  {
    id: "mov2",
    productoId: "p1",
    cantidad: -10,
    tipo: "Salida",
    responsableId: "admin-1",
    sucursalId: "s1",
    fecha: "2024-05-03",
    comentario: "Consumo consulta"
  }
];
