import UsersAdminPanel from "@/components/users/UsersAdminPanel";
import { getUsersAdminMeta, listAdminUsers } from "@/lib/users/admin-data";

export default async function UsuariosListaPage() {
  const [data, meta] = await Promise.all([
    listAdminUsers({ page: 1, pageSize: 20 }),
    getUsersAdminMeta()
  ]);

  return (
    <UsersAdminPanel
      initialItems={data.items}
      initialTotal={data.total}
      initialPage={data.page}
      initialPageSize={data.pageSize}
      roles={meta.roles}
      branches={meta.branches}
    />
  );
}
