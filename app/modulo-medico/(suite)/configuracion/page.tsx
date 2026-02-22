import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import RoleGuard from "@/components/medical/RoleGuard";

export default function MedicalConfiguracionPage() {
  return (
    <RoleGuard requirePermissions="SYSTEM:ADMIN">
      <div className="space-y-4">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Configuración del módulo médico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-diagnostics-background p-4">
              Configuración según permisos. Ajustes clínicos se administran como plantillas y catálogos, no desde la atención.
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                { title: "Agenda", desc: "Tipos de cita, duración, salas y reglas de solapamiento." },
                { title: "Worklist", desc: "Estados del flujo, SLA y columnas visibles." },
                { title: "Encounter", desc: "Plantillas SOAP, diagnósticos, firma y bloqueo." },
                { title: "Permisos", desc: "Accesos por rol a Operaciones/Configuración." },
                {
                  title: "Plantillas clínicas",
                  desc: "Builder del documento clínico: secciones, campos y reglas por formulario.",
                  href: "/modulo-medico/configuracion/plantillas-clinicas"
                },
                {
                  title: "Plantillas de signos vitales",
                  desc: "Visibilidad, orden, unidades y fuente de captura de vitales para ConsultaM.",
                  href: "/modulo-medico/configuracion/plantillas-signos-vitales"
                },
                {
                  title: "CIE-10",
                  desc: "Catalogo de codigos CIE-10: busqueda, activacion y auditoria.",
                  href: "/modulo-medico/configuracion/cie10"
                },
                {
                  title: "Documentos clínicos",
                  desc: "Hoja membretada, logo, márgenes y pie para exportaciones clínicas institucionales.",
                  href: "/modulo-medico/configuracion/documentos-clinicos"
                }
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
                  {"href" in item && item.href ? (
                    <Link
                      href={item.href}
                      className="mt-3 inline-flex rounded-lg border border-[#4aa59c]/35 bg-[#4aa59c]/10 px-3 py-1.5 text-xs font-semibold text-[#2e75ba] hover:bg-[#4aa59c]/15"
                    >
                      Administrar
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
