"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HrIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/hr/employees");
  }, [router]);

  return <div className="p-6 text-sm text-slate-600">Redirigiendo a empleados…</div>;
}
