import { LabArea } from "@prisma/client";

export const areasUI: { slug: string; label: string; area: LabArea }[] = [
  { slug: "hematologia", label: "Hematología", area: "HEMATOLOGY" },
  { slug: "quimica", label: "Química", area: "CHEMISTRY" },
  { slug: "electrolitos", label: "Electrolitos", area: "ELECTROLYTES" },
  { slug: "orina", label: "Orina", area: "URINE" },
  { slug: "heces", label: "Heces", area: "STOOL" },
  { slug: "otros", label: "Otros", area: "OTHER" }
];

export const slugToArea: Record<string, LabArea> = Object.fromEntries(areasUI.map((a) => [a.slug, a.area])) as Record<
  string,
  LabArea
>;
export const areaToSlug: Record<LabArea, string> = Object.fromEntries(
  areasUI.map((a) => [a.area, a.slug])
) as Record<LabArea, string>;
