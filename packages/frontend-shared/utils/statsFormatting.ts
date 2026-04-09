import { roundQuantity } from "@packages/domain/formatting";

// roundQuantity は domain 層に移動 — 後方互換のため re-export
export { roundQuantity };

export function formatQuantityWithUnit(quantity: number, unit: string): string {
  if (unit === "時間" || unit === "hour" || unit === "hours") {
    const hours = Math.floor(quantity);
    const minutes = Math.round((quantity - hours) * 60);
    if (hours === 0) return `${minutes}分`;
    if (minutes === 0) return `${hours}時間`;
    return `${hours}時間${minutes}分`;
  }
  if (unit === "分" || unit === "minute" || unit === "minutes") {
    const totalMinutes = Math.round(quantity);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}分`;
    if (minutes === 0) return `${hours}時間`;
    return `${hours}時間${minutes}分`;
  }
  const rounded = roundQuantity(quantity);
  return `${rounded.toLocaleString()}${unit}`;
}
