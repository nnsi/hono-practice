import { describe, expect, it } from "vitest";

import { shouldShowCSVPreview } from "./csvImportViewState";

describe("shouldShowCSVPreview", () => {
  it("shows preview only before import completes", () => {
    expect(shouldShowCSVPreview("preview", 3, null)).toBe(true);
    expect(shouldShowCSVPreview("preview", 3, 0)).toBe(false);
    expect(shouldShowCSVPreview("preview", 3, 2)).toBe(false);
    expect(shouldShowCSVPreview("file", 3, null)).toBe(false);
    expect(shouldShowCSVPreview("preview", 0, null)).toBe(false);
  });
});
