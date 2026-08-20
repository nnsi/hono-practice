import { describe, expect, it } from "vitest";

import { classifyStartupRoute } from "./startupRoute";

describe("classifyStartupRoute", () => {
  it("preserves a cold-start Widget kind-selection deep link", () => {
    expect(classifyStartupRoute(["widget", "kind-select"])).toBe("explicit");
  });

  it("allows the startup preference on an ordinary tabs-index launch", () => {
    expect(classifyStartupRoute(["(tabs)"])).toBe("default");
  });

  it.each([
    ["another top-level deep link", ["upgrade"]],
    ["a nested note deep link", ["notes", "note-id"]],
    ["a tab deep link", ["(tabs)", "daily"]],
  ])("preserves %s", (_label, segments) => {
    expect(classifyStartupRoute(segments)).toBe("explicit");
  });

  it("waits while Expo Router has not resolved the initial route", () => {
    expect(classifyStartupRoute([])).toBe("unresolved");
  });
});
