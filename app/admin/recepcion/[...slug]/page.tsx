import { redirect } from "next/navigation";
import { resolveReceptionAliasPath } from "@/lib/reception/alias";

type SearchParams = Record<string, string | string[] | undefined>;

function toQueryString(searchParams: SearchParams | undefined) {
  if (!searchParams) return "";
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item != null) params.append(key, item);
      });
      return;
    }
    if (value != null) params.set(key, value);
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export default function RecepcionAliasCatchAllPage({
  params,
  searchParams
}: {
  params: { slug?: string[] };
  searchParams?: SearchParams;
}) {
  const slugPath = (params.slug || []).join("/");
  const pathname = slugPath ? `/admin/recepcion/${slugPath}` : "/admin/recepcion";
  const targetPath = resolveReceptionAliasPath(pathname) ?? "/admin/reception/dashboard";
  redirect(`${targetPath}${toQueryString(searchParams)}`);
}
