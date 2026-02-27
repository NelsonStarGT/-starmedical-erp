import { ClientProfileType } from "@prisma/client";
import { getClientSelfRegistrationPublicContext } from "@/lib/reception/clientSelfRegistration.server";
import PublicClientRegistrationForm from "@/app/r/registro/[token]/PublicClientRegistrationForm";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

function typeLabel(type: ClientProfileType) {
  if (type === ClientProfileType.PERSON) return "Persona";
  if (type === ClientProfileType.COMPANY) return "Empresa";
  if (type === ClientProfileType.INSTITUTION) return "Institución";
  return "Aseguradora";
}

export default async function ClientSelfRegistrationPage({ params }: PageProps) {
  const { token } = await params;
  const context = await getClientSelfRegistrationPublicContext(token);

  if (!context) {
    return (
      <main className="min-h-screen bg-[#f8fafc] px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">Registro de clientes</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Enlace no disponible</h1>
          <p className="mt-2 text-sm text-slate-600">
            Este link de registro expiró o no es válido. Solicita uno nuevo al equipo de recepción.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-4 rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">StarMedical ERP · Registro</p>
          <h1 className="text-2xl font-semibold text-[#102a43]">Auto-registro de cliente</h1>
          <p className="text-sm text-slate-600">
            Tipo: <span className="font-semibold text-slate-800">{typeLabel(context.invite.clientType)}</span> · Vence:
            <span className="font-semibold text-slate-800"> {new Date(context.invite.expiresAt).toLocaleString("es-GT")}</span>
          </p>
          {context.invite.note && (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{context.invite.note}</p>
          )}
        </div>

        <PublicClientRegistrationForm token={token} invite={context.invite} options={context.options} />
      </div>
    </main>
  );
}
