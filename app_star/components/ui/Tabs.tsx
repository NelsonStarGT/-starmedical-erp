"use client";

import type { LinkProps } from "next/link";
import ModuleTopTabs from "@/components/navigation/ModuleTopTabs";

type TabItem = {
  label: string;
  href?: LinkProps["href"];
};

export function Tabs({ items }: { items: TabItem[] }) {
  const normalized = items.map((item) => {
    if (typeof item.href === "string") {
      return { label: item.label, href: item.href };
    }

    if (item.href && typeof item.href === "object" && "pathname" in item.href) {
      const pathname = item.href.pathname ? String(item.href.pathname) : "";
      return { label: item.label, href: pathname || undefined, disabled: !pathname };
    }

    return { label: item.label, href: undefined, disabled: true };
  });

  return <ModuleTopTabs items={normalized} />;
}
