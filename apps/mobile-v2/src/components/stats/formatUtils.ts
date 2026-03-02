/** 表示用に小数点第1位で四捨五入する */
export function roundQuantity(value: number): number {
  return Math.round(value * 10) / 10;
}

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
  const rounded = roundQuantity(quantity);
  return `${rounded.toLocaleString()}${unit}`;
}
