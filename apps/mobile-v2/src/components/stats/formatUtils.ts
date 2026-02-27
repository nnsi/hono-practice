export function formatQuantityWithUnit(
  quantity: number,
  unit: string,
): string {
  if (unit === "時間" || unit === "hour" || unit === "hours") {
    const hours = Math.floor(quantity);
    const minutes = Math.round((quantity - hours) * 60);
    if (hours === 0) return `${minutes}分`;
    if (minutes === 0) return `${hours}時間`;
    return `${hours}時間${minutes}分`;
  }
  const rounded = Math.round(quantity * 100) / 100;
  return `${rounded.toLocaleString()}${unit}`;
}
