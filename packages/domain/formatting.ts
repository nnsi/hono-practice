/** 表示用に小数点第1位で四捨五入する */
export function roundQuantity(value: number): number {
  return Math.round(value * 10) / 10;
}
