import { MovementType, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RegisterMovementInput = {
  productId: string;
  branchId: string;
  type: MovementType;
  quantity?: number | null;
  unitCost?: number | null;
  salePrice?: number | null;
  reference?: string | null;
  reason?: string | null;
  createdById: string;
};

export async function registerInventoryMovement(input: RegisterMovementInput, client: PrismaClient | Prisma.TransactionClient = prisma) {
  const { productId, branchId, type, quantity = 0, unitCost, salePrice, reference, reason, createdById } = input;

  const product = await client.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Producto no encontrado");

  const stockRecord = await client.productStock.upsert({
    where: { productId_branchId: { productId, branchId } },
    create: { productId, branchId, stock: 0, minStock: 0 },
    update: {}
  });

  const totalStock = await client.productStock.aggregate({
    where: { productId },
    _sum: { stock: true }
  });
  const totalBefore = totalStock._sum.stock || 0;

  let delta = 0;
  let newBranchStock = stockRecord.stock;
  const currentAvg = product.avgCost && (product.avgCost as any).toNumber ? Number((product.avgCost as any).toNumber()) : Number(product.avgCost || 0);
  const currentBasePrice =
    product.baseSalePrice && (product.baseSalePrice as any).toNumber
      ? Number((product.baseSalePrice as any).toNumber())
      : Number(product.baseSalePrice || 0);
  const currentCost =
    product.cost && (product.cost as any).toNumber ? Number((product.cost as any).toNumber()) : Number(product.cost || 0);
  const currentPrice =
    product.price && (product.price as any).toNumber ? Number((product.price as any).toNumber()) : Number(product.price || 0);

  let newAvg = currentAvg;
  let newBasePrice = currentBasePrice;

  if (type === "ENTRY") {
    if (!quantity || quantity <= 0) throw new Error("Cantidad requerida para entrada");
    delta = quantity;
    newBranchStock = stockRecord.stock + quantity;
    if (unitCost !== null && unitCost !== undefined) {
      const oldAvg = newAvg || 0;
      newAvg = calculateWeightedAvg(oldAvg, totalBefore, unitCost, quantity);
    }
  } else if (type === "EXIT") {
    if (!quantity || quantity <= 0) throw new Error("Cantidad requerida para salida");
    if (stockRecord.stock - quantity < 0) throw new Error("Stock insuficiente en sucursal");
    if (totalBefore - quantity < 0) throw new Error("Stock total insuficiente");
    delta = -quantity;
    newBranchStock = stockRecord.stock - quantity;
  } else if (type === "ADJUSTMENT") {
    if (quantity === null || quantity === undefined) throw new Error("Cantidad requerida para ajuste");
    delta = quantity - stockRecord.stock;
    newBranchStock = quantity;
    if (newBranchStock < 0) throw new Error("El stock no puede ser negativo");
  } else if (type === "PRICE_UPDATE") {
    if (salePrice === null || salePrice === undefined) throw new Error("Precio requerido");
    newBasePrice = salePrice;
  } else if (type === "COST_UPDATE") {
    if (unitCost === null || unitCost === undefined) throw new Error("Costo requerido");
    newAvg = unitCost;
  }

  if ((type === "ENTRY" || type === "EXIT" || type === "ADJUSTMENT") && newBranchStock < 0) {
    throw new Error("El stock no puede quedar negativo");
  }

  const movementQuantity = type === "ADJUSTMENT" ? delta : delta;
  const autoReference =
    type === "ADJUSTMENT"
      ? `Ajuste ${stockRecord.stock}→${newBranchStock} (Δ ${delta})`
      : type === "EXIT"
        ? `Salida ${quantity}`
        : type === "ENTRY"
          ? `Entrada ${quantity}`
          : undefined;
  const refToSave = reference || autoReference || null;

  const movementData: Prisma.InventoryMovementCreateInput = {
    product: { connect: { id: productId } },
    branchId,
    type,
    quantity: type === "PRICE_UPDATE" || type === "COST_UPDATE" ? null : movementQuantity,
    unitCost: unitCost ?? null,
    salePrice: salePrice ?? null,
    reference: refToSave,
    reason: reason || null,
    createdById
  };

  const run = typeof (client as any)?.$transaction === "function" ? (client as any).$transaction.bind(client) : Promise.all.bind(Promise);

  const [movement, updatedStock, updatedProduct] = await run([
    client.inventoryMovement.create({ data: movementData }),
    client.productStock.update({
      where: { productId_branchId: { productId, branchId } },
      data: { stock: newBranchStock }
    }),
    client.product.update({
      where: { id: productId },
      data: {
        avgCost: newAvg,
        baseSalePrice: newBasePrice,
        cost: type === "ENTRY" || type === "COST_UPDATE" ? newAvg : currentCost,
        price: type === "PRICE_UPDATE" ? newBasePrice : currentPrice,
        updatedAt: new Date()
      }
    })
  ]);

  const minStockAlert = updatedStock.stock <= updatedStock.minStock;

  return { movement, stock: updatedStock, product: updatedProduct, minStockAlert };
}

const calculateWeightedAvg = (oldAvg: number, oldQty: number, newCost: number, newQty: number) => {
  const totalQty = oldQty + newQty;
  if (totalQty === 0) return newCost;
  return (oldAvg * oldQty + newCost * newQty) / totalQty;
};
