"use client";

import { UserProvider } from "@/components/users/UserProvider";

export default function UsuariosLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <div className="space-y-4">{children}</div>
    </UserProvider>
  );
}
