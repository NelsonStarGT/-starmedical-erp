"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function LeadsEmpresasPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3rem] text-slate-400">CRM · Leads empresas</p>
        <h1 className="text-2xl font-semibold text-slate-900">Flujo unificado</h1>
        <p className="text-sm text-slate-500">La creacion legacy queda bloqueada; usa el Wizard v1 para nuevas negociaciones.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Creacion centralizada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-700">Solo se permite crear oportunidades desde el Wizard v1 con captador, preferencias y servicios completos.</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/crm/new?type=b2b"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-soft hover:bg-slate-800"
            >
              Abrir Wizard B2B
            </Link>
            <Link
              href="/admin/crm/list?type=b2b"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver Worklist
            </Link>
            <Link
              href="/admin/crm/pipeline?type=b2b"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ir a Pipeline
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
