import { Platform } from "react-native";

export function getAppGroupDirectory(): string | undefined {
  if (Platform.OS !== "ios") return undefined;
  // SDK 56 preview の Hermes V1 + 新 Swift/C++ JSI interop で
  // Paths.appleSharedContainers の戻り値（Directory 連想配列）変換中に稀に
  // EXC_BAD_ACCESS が出る。E2E では Widget 共有が不要なので skip し、default
  // の Documents 配下に DB を置く。SDK 56 stable リリース後に再評価する。
  if (process.env.EXPO_PUBLIC_E2E_MODE === "1") return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Paths } =
      require("expo-file-system") as typeof import("expo-file-system");
    const containers = Paths.appleSharedContainers;
    const groupId = Object.keys(containers)[0];
    if (!groupId) return undefined;
    const dir = containers[groupId];
    const path = dir.uri.replace(/^file:\/\//, "").replace(/\/$/, "");
    return `${path}/SQLite`;
  } catch {
    return undefined;
  }
}
