import { Combo } from "@/lib/types/inventario";

export const combosMock: Combo[] = [
  {
    id: "cmb1",
    nombre: "Check-up básico",
    descripcion: "Consulta + Rayos X",
    serviciosAsociados: ["srv1", "srv2"],
    productosAsociados: [{ productoId: "p2", cantidad: 1 }, { productoId: "p3", cantidad: 1 }],
    precioFinal: 380,
    costoProductosTotal: 25.8,
    costoCalculado: 25.8,
    imageUrl: "/uploads/checkup.png",
    estado: "Activo"
  }
];
