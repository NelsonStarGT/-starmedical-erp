function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toValidDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatDateTimeStable(value?: string | null) {
  const date = toValidDate(value);
  if (!date) return "Sin dato";
  const year = date.getUTCFullYear();
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());
  const hours = pad2(date.getUTCHours());
  const minutes = pad2(date.getUTCMinutes());
  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
}
