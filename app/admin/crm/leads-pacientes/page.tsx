"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function LeadsPacientesPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3rem] text-slate-400">CRM · Leads pacientes</p>
        <h1 className="text-2xl font-semibold text-slate-900">Flujo rapido B2C</h1>
        <p className="text-sm text-slate-500">La creacion legacy queda deshabilitada. Usa el Wizard v1 para cierres directos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unico flujo permitido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-700">B2C se gestiona solo por el Wizard v1 con cotizacion inmediata y cierre directo.</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/crm/new?type=b2c"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800"
            >
              Abrir Wizard B2C
            </Link>
            <Link
              href="/admin/crm/inbox?type=b2c"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ir a Bandeja
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
