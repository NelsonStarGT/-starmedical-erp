import { Servicio } from "@/lib/types/inventario";

export const serviciosMock: Servicio[] = [
  {
    id: "srv1",
    nombre: "Consulta general",
    categoriaId: "cs1",
    subcategoriaId: "scp1",
    proveedorId: "prov2",
    codigoServicio: "CONS-001",
    duracionMin: 30,
    precioVenta: 120,
    costoBase: 0.8,
    puntosDescuento: 0,
    productosAsociados: [{ productoId: "p2", cantidad: 1 }],
    costoCalculado: 0.8,
    imageUrl: "/uploads/consulta.png",
    estado: "Activo"
  },
  {
    id: "srv2",
    nombre: "Rayos X simple",
    categoriaId: "cs2",
    subcategoriaId: "scp3",
    proveedorId: "prov2",
    codigoServicio: "RX-001",
    duracionMin: 20,
    precioVenta: 300,
    costoBase: 25,
    puntosDescuento: 10,
    productosAsociados: [{ productoId: "p3", cantidad: 1 }],
    costoCalculado: 25,
    imageUrl: "/uploads/rx.png",
    estado: "Activo"
  }
];
