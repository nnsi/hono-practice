import { Platform } from "react-native";

import { extensionStorageAdapter } from "./widgetTimelineAdapter";
import type { WidgetTimelineAdapter } from "./widgetTimelineAdapterCore";

export type { WidgetTimelineAdapter } from "./widgetTimelineAdapterCore";

/** Reload iOS WidgetKit timelines after shared SQLite state changes. */
export function reloadWidgetTimelines(
  adapter: WidgetTimelineAdapter = extensionStorageAdapter,
  platform: string = Platform.OS,
): void {
  if (platform !== "ios") return;
  adapter.reloadWidget();
}
