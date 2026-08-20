import { describe, expect, it, vi } from "vitest";

import { reloadWidgetTimelines } from "./widgetTimeline";
import { createExtensionStorageAdapter } from "./widgetTimelineAdapterCore";

describe("reloadWidgetTimelines", () => {
  it("reloads through the injected adapter on iOS", () => {
    const adapter = { reloadWidget: vi.fn() };

    reloadWidgetTimelines(adapter, "ios");

    expect(adapter.reloadWidget).toHaveBeenCalledOnce();
  });

  it("does not access the native adapter on other platforms", () => {
    const adapter = { reloadWidget: vi.fn() };

    reloadWidgetTimelines(adapter, "android");

    expect(adapter.reloadWidget).not.toHaveBeenCalled();
  });

  it("uses the optional ExtensionStorage module when it is available", () => {
    const nativeReloadWidget = vi.fn();
    const resolveNativeModule = vi.fn(() => ({
      reloadWidget: nativeReloadWidget,
    }));
    const adapter = createExtensionStorageAdapter(resolveNativeModule);

    reloadWidgetTimelines(adapter, "ios");

    expect(resolveNativeModule).toHaveBeenCalledWith("ExtensionStorage");
    expect(nativeReloadWidget).toHaveBeenCalledOnce();
  });

  it("falls back to a no-op when ExtensionStorage is unavailable", () => {
    const adapter = createExtensionStorageAdapter(() => null);

    expect(() => reloadWidgetTimelines(adapter, "ios")).not.toThrow();
  });
});
