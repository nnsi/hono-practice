export const COLOR_PALETTE = [
  "#0173B2",
  "#DE8F05",
  "#029E73",
  "#D55E00",
  "#CC79A7",
  "#F0E442",
  "#56B4E9",
  "#999999",
  "#7570B3",
  "#1B9E77",
];

export const DEFAULT_BAR_COLOR = "#3b82f6";

export function getUniqueColorForKind(
  kindName: string,
  usedColors: Set<string>,
): string {
  let hash = 0;
  for (let i = 0; i < kindName.length; i++) {
    const char = kindName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const initialIndex = Math.abs(hash) % COLOR_PALETTE.length;

  if (!usedColors.has(COLOR_PALETTE[initialIndex])) {
    return COLOR_PALETTE[initialIndex];
  }

  for (const color of COLOR_PALETTE) {
    if (!usedColors.has(color)) {
      return color;
    }
  }

  return COLOR_PALETTE[initialIndex];
}
