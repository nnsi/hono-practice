import type { WidgetTimelineAdapter } from "./widgetTimelineAdapterCore";

/** Non-iOS and test fallback. Metro selects widgetTimelineAdapter.ios.ts on iOS. */
export const extensionStorageAdapter: WidgetTimelineAdapter = {
  reloadWidget() {},
};
