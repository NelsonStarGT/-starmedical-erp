"use client";

import { useEffect } from "react";
import { redirect } from "next/navigation";

export default function PayrollPlaceholderPage() {
  useEffect(() => {
    redirect("/hr/employees");
  }, []);

  return <div className="p-6 text-sm text-slate-600">Redirigiendo a empleados…</div>;
}
