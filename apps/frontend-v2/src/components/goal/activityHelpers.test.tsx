import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { getActivityEmoji, getActivityIcon } from "./activityHelpers";
import type { DexieActivity } from "../../db/schema";
import type { SyncStatus } from "../../db/schema";

function createActivity(
  overrides: Partial<DexieActivity> = {},
): DexieActivity {
  return {
    id: "act-1",
    userId: "user-1",
    name: "Test",
    label: "",
    emoji: "🏃",
    iconType: "emoji",
    iconUrl: null,
    iconThumbnailUrl: null,
    description: "",
    quantityUnit: "回",
    orderIndex: "000001",
    showCombinedStats: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    deletedAt: null,
    _syncStatus: "synced" as SyncStatus,
    ...overrides,
  };
}

describe("getActivityEmoji", () => {
  it("returns default emoji for undefined activity", () => {
    expect(getActivityEmoji(undefined)).toBe("📝");
  });

  it("returns emoji when iconType is emoji and emoji is set", () => {
    const activity = createActivity({ iconType: "emoji", emoji: "🏃" });
    expect(getActivityEmoji(activity)).toBe("🏃");
  });

  it("returns default emoji when iconType is upload", () => {
    const activity = createActivity({ iconType: "upload", emoji: "" });
    expect(getActivityEmoji(activity)).toBe("📝");
  });

  it("returns default emoji when iconType is emoji but emoji is empty", () => {
    const activity = createActivity({ iconType: "emoji", emoji: "" });
    expect(getActivityEmoji(activity)).toBe("📝");
  });
});

describe("getActivityIcon", () => {
  it("returns span with default emoji for undefined activity", () => {
    const { container } = render(<>{getActivityIcon(undefined)}</>);
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe("📝");
    expect(span?.className).toContain("text-2xl");
  });

  it("returns span with emoji when iconType is emoji", () => {
    const activity = createActivity({ iconType: "emoji", emoji: "🔥" });
    const { container } = render(<>{getActivityIcon(activity)}</>);
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe("🔥");
    expect(span?.className).toContain("text-2xl");
  });

  it("returns img with iconThumbnailUrl when iconType is upload and thumbnail exists", () => {
    const activity = createActivity({
      iconType: "upload",
      emoji: "",
      iconThumbnailUrl: "https://example.com/thumb.jpg",
      iconUrl: "https://example.com/full.jpg",
    });
    const { container } = render(<>{getActivityIcon(activity)}</>);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.com/thumb.jpg");
    expect(img?.className).toContain("w-8");
    expect(img?.className).toContain("h-8");
  });

  it("returns img with iconUrl when iconType is upload and no thumbnail", () => {
    const activity = createActivity({
      iconType: "upload",
      emoji: "",
      iconThumbnailUrl: null,
      iconUrl: "https://example.com/full.jpg",
    });
    const { container } = render(<>{getActivityIcon(activity)}</>);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.com/full.jpg");
  });

  it("returns span with default emoji when iconType is upload and no URLs", () => {
    const activity = createActivity({
      iconType: "upload",
      emoji: "",
      iconThumbnailUrl: null,
      iconUrl: null,
    });
    const { container } = render(<>{getActivityIcon(activity)}</>);
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe("📝");
  });
});
