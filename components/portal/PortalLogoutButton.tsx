"use client";

import { useState } from "react";

export function PortalLogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/portal/api/auth/logout", {
        method: "POST"
      });
    } finally {
      window.location.href = "/portal";
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center rounded-full border border-[#d2e2f6] bg-white px-4 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm transition hover:border-[#4aadf5] hover:text-[#245f96] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}
