import { Platform } from "react-native";

export function getAppGroupDirectory(): string | undefined {
  if (Platform.OS !== "ios") return undefined;
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
