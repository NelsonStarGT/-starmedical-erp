// @ts-nocheck
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ImportInventoryPanel } from "@/components/inventario/ImportInventoryPanel";
import { PriceCalculator } from "@/components/inventario/PriceCalculator";
import { ProductCategoriesManager } from "@/components/inventario/ProductCategoriesManager";
import { ServiceCategoriesManager } from "@/components/inventario/ServiceCategoriesManager";
import { InventoryEmailSchedules } from "@/components/inventario/InventoryEmailSchedules";
import { MarginPolicy } from "@/components/inventario/MarginPolicy";
import { QADiagnostics } from "@/components/inventario/QADiagnostics";
import { RolInventario } from "@/lib/types/inventario";

const rolActual: RolInventario = "Administrador";
const token = process.env.NEXT_PUBLIC_INVENTORY_TOKEN;

export default function InventarioConfigPage() {
  return (
    <div className="space-y-6">
      <ImportInventoryPanel role={rolActual} />

      <Card id="price-calculator">
        <CardHeader>
          <CardTitle>Calculadora de precio final</CardTitle>
        </CardHeader>
        <CardContent>
          <PriceCalculator rol={rolActual} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorías de productos</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductCategoriesManager role={rolActual} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorías de servicios</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceCategoriesManager role={rolActual} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Correo electrónico – Reportes de Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          <InventoryEmailSchedules token={token} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Política de margen</CardTitle>
        </CardHeader>
        <CardContent>
          <MarginPolicy token={token} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auditoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/inventario/auditoria/export/xlsx"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Exportar auditoría (Excel)
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>QA & Diagnóstico</CardTitle>
        </CardHeader>
        <CardContent>
          <QADiagnostics token={token} />
        </CardContent>
      </Card>
    </div>
  );
}
// @ts-nocheck
