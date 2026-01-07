import { Producto } from "@/lib/types/inventario";

export const productosMock: Producto[] = [
  {
    id: "p1",
    nombre: "Paracetamol 500mg",
    codigo: "MED-001",
    categoriaId: "cp1",
    subcategoriaId: "scp1",
    unidadMedida: "u1",
    costoUnitario: 2.5,
    precioVenta: 5,
    presentacion: "Tableta",
    stockActual: 120,
    stockMinimo: 30,
    cantidadAlerta: 30,
    proveedorId: "prov1",
    sucursalId: "s1",
    puntosDescuento: 0,
    imageUrl: "/uploads/paracetamol.png",
    estado: "Activo"
  },
  {
    id: "p2",
    nombre: "Jeringa 5ml",
    codigo: "INS-010",
    categoriaId: "cp2",
    subcategoriaId: "scp2",
    unidadMedida: "u1",
    costoUnitario: 0.8,
    precioVenta: 2,
    presentacion: "Unidad",
    stockActual: 400,
    stockMinimo: 100,
    cantidadAlerta: 80,
    proveedorId: "prov1",
    sucursalId: "s1",
    imageUrl: "/uploads/jeringa.png",
    estado: "Activo"
  },
  {
    id: "p3",
    nombre: "Placa Rayos X",
    codigo: "IMG-100",
    categoriaId: "cp3",
    subcategoriaId: "scp3",
    unidadMedida: "u2",
    costoUnitario: 25,
    precioVenta: 60,
    presentacion: "Caja",
    stockActual: 50,
    stockMinimo: 10,
    cantidadAlerta: 10,
    proveedorId: "prov2",
    sucursalId: "s2",
    imageUrl: "/uploads/placa.png",
    estado: "Activo"
  }
];
