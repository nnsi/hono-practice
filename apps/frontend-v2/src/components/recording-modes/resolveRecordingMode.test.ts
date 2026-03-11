import { resolveRecordingMode } from "@packages/frontend-shared/recording-modes/resolveRecordingMode";
import { describe, expect, it } from "vitest";

describe("resolveRecordingMode", () => {
  it('returns "manual" for non-time quantityUnit without explicit recordingMode', () => {
    expect(
      resolveRecordingMode({
        id: "1",
        name: "Test",
        emoji: "",
        quantityUnit: "回",
      }),
    ).toBe("manual");
  });

  it('returns "timer" for time quantityUnit without explicit recordingMode', () => {
    expect(
      resolveRecordingMode({
        id: "1",
        name: "Test",
        emoji: "",
        quantityUnit: "時間",
      }),
    ).toBe("timer");
    expect(
      resolveRecordingMode({
        id: "1",
        name: "Test",
        emoji: "",
        quantityUnit: "分",
      }),
    ).toBe("timer");
  });

  it("returns explicit recordingMode when set", () => {
    expect(
      resolveRecordingMode({
        id: "1",
        name: "Test",
        emoji: "",
        quantityUnit: "回",
        recordingMode: "counter",
      }),
    ).toBe("counter");
    expect(
      resolveRecordingMode({
        id: "1",
        name: "Test",
        emoji: "",
        quantityUnit: "時間",
        recordingMode: "manual",
      }),
    ).toBe("manual");
  });
});
