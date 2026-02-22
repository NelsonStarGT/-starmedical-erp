export function getPathParam(pathname: string, key: string) {
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.indexOf(key);
  if (idx === -1 || idx + 1 >= parts.length) return null;
  return parts[idx + 1];
}
