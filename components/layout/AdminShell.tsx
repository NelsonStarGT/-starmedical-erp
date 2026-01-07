"use client";

import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-transparent">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen relative">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(800px_at_20%_10%,rgba(12,116,255,0.08),transparent),radial-gradient(700px_at_70%_20%,rgba(44,211,255,0.08),transparent)]" />
        <Header />
        <main className="relative flex-1 p-6 lg:p-10 space-y-6">{children}</main>
      </div>
    </div>
  );
}
