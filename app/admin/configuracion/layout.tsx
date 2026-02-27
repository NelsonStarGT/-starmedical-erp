import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ConfigSectionNav from "@/components/configuracion/ConfigSectionNav";
import ConfigSessionStatusBanner from "@/components/configuracion/ConfigSessionStatusBanner";
import { getSessionUserFromCookies } from "@/lib/auth";

export default async function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-4">
      <ConfigSectionNav />
      <ConfigSessionStatusBanner />
      {children}
    </div>
  );
}
