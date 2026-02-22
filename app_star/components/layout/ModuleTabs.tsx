"use client";

import ModuleTopTabs, { type ModuleTopTabItem } from "@/components/navigation/ModuleTopTabs";

export type ModuleTab = Pick<ModuleTopTabItem, "label" | "href" | "matchPrefix" | "disabled" | "activeMatch">;

type Props = {
  tabs: ModuleTab[];
  variant?: "default" | "diagnostics";
};

export default function ModuleTabs({ tabs, variant = "default" }: Props) {
  void variant;
  return <ModuleTopTabs items={tabs} />;
}
