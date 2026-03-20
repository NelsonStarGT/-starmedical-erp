import { requireUsersAdminPageAccess } from "@/lib/users/access";

export default async function UsuariosLayout({ children }: { children: React.ReactNode }) {
  await requireUsersAdminPageAccess();
  return <div className="space-y-6">{children}</div>;
}
