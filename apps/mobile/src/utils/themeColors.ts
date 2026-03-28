/**
 * Theme-aware color values for inline styles.
 * Use NativeWind `dark:` variants in className whenever possible.
 * Only use these for StyleSheet/inline styles that can't use className.
 */

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  borderDivider: string;
  amber: string;
  amberLight: string;
  amberBg: string;
  tabBg: string;
  tabBorder: string;
  tabActive: string;
  tabInactive: string;
  tabPill: string;
  shadowColor: string;
  sceneBg: string;
  modalOverlay: string;
  info: string;
};

const light: ThemeColors = {
  // Backgrounds
  bg: "#f5f5f4", // gray-100
  surface: "#ffffff",
  surfaceSecondary: "#fafaf9", // gray-50
  surfaceTertiary: "#f5f5f4", // gray-100

  // Text
  text: "#1c1917", // gray-900
  textSecondary: "#57534e", // gray-600
  textTertiary: "#78716c", // gray-500
  textMuted: "#a8a29e", // gray-400

  // Borders
  border: "#e7e5e4", // gray-200
  borderLight: "#f5f5f4", // gray-100
  borderDivider: "rgba(231,229,228,0.5)",

  // Accents
  amber: "#d97706",
  amberLight: "#f59e0b",
  amberBg: "#fffbeb",

  // Tab bar
  tabBg: "rgba(255,255,255,0.82)",
  tabBorder: "rgba(231,229,228,0.5)",
  tabActive: "#d97706",
  tabInactive: "#a8a29e",
  tabPill: "#f59e0b",

  // Shadows
  shadowColor: "#1c1917",

  // Scene
  sceneBg: "#ffffff",

  // Modal
  modalOverlay: "rgba(28,25,23,0.35)",

  // Status
  info: "#3b82f6",
};

const dark: ThemeColors = {
  // Backgrounds
  bg: "#1c1917", // gray-900
  surface: "#292524", // gray-800
  surfaceSecondary: "#292524", // gray-800
  surfaceTertiary: "#1c1917", // gray-900

  // Text
  text: "#fafaf9", // gray-50
  textSecondary: "#d6d3d1", // gray-300
  textTertiary: "#a8a29e", // gray-400
  textMuted: "#78716c", // gray-500

  // Borders
  border: "#44403c", // gray-700
  borderLight: "#292524", // gray-800
  borderDivider: "rgba(68,64,60,0.5)",

  // Accents
  amber: "#f59e0b",
  amberLight: "#fbbf24",
  amberBg: "rgba(120,53,15,0.3)",

  // Tab bar
  tabBg: "rgba(28,25,23,0.82)",
  tabBorder: "rgba(68,64,60,0.5)",
  tabActive: "#fbbf24",
  tabInactive: "#78716c",
  tabPill: "#f59e0b",

  // Shadows
  shadowColor: "#000000",

  // Scene
  sceneBg: "#292524",

  // Modal
  modalOverlay: "rgba(0,0,0,0.55)",

  // Status
  info: "#60a5fa",
};

export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? dark : light;
}
