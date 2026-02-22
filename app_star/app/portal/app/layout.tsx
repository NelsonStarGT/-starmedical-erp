import { getPortalPersonDisplayName } from "@/lib/portal/identity";
import { requirePortalSessionContext } from "@/lib/portal/session";
import { PortalAppNavResponsive } from "@/components/portal/PortalAppNavResponsive";
import { PortalLogoutButton } from "@/components/portal/PortalLogoutButton";
import { PortalSessionRefresher } from "@/components/portal/PortalSessionRefresher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PortalAppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await requirePortalSessionContext();
  const fullName = getPortalPersonDisplayName(session.client);

  return (
    <div className="min-h-screen">
      <PortalSessionRefresher
        enabled
        authSource={session.authSource}
        accessExpiresAt={session.expiresAt.getTime()}
      />
      <header className="border-b border-[#d2e2f6] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Portal Paciente</p>
            <h1 className="text-xl font-semibold text-slate-900">{fullName}</h1>
            <p className="text-sm text-slate-600">{session.client.email || "Sin correo registrado"}</p>
          </div>
          <PortalLogoutButton />
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 pb-5">
          <PortalAppNavResponsive />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:py-6">{children}</main>
    </div>
  );
}
