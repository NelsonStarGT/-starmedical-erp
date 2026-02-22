export async function safeFetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", credentials: "include", ...init });
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.toLowerCase().includes("application/json");

  if (!isJson) {
    const text = await res.text().catch(() => "");
    const fallback = text?.slice(0, 200) || "Respuesta no JSON del servidor";
    throw new Error(`Respuesta no válida (se esperaba JSON): ${fallback}`);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (json as any).error || "No se pudo procesar la solicitud";
    throw new Error(err);
  }
  return json as T;
}
