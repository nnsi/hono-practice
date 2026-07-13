import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ reloadWidgetTimelines: vi.fn() }));

vi.mock("./widgetTimeline", () => ({
  reloadWidgetTimelines: mocks.reloadWidgetTimelines,
}));

import { dbEvents } from "../db/dbEvents";
import { startWidgetTimelineSubscription } from "./widgetTimelineSubscription";

describe("widget timeline application subscription", () => {
  beforeEach(() => {
    mocks.reloadWidgetTimelines.mockClear();
  });

  it.each([
    "activities",
    "activity_kinds",
  ])("reloads after %s changes", (table) => {
    const unsubscribe = startWidgetTimelineSubscription();

    dbEvents.emit(table);

    expect(mocks.reloadWidgetTimelines).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("stops reloading after application cleanup", () => {
    const unsubscribe = startWidgetTimelineSubscription();
    unsubscribe();

    dbEvents.emit("activities");

    expect(mocks.reloadWidgetTimelines).not.toHaveBeenCalled();
  });
});
