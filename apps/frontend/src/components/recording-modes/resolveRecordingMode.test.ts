import { resolveRecordingMode } from "@packages/frontend-shared/recording-modes/resolveRecordingMode";
import { describe, expect, it } from "vitest";

describe("resolveRecordingMode", () => {
  it('returns "manual" for non-time quantityUnit with empty recordingMode', () => {
    expect(
      resolveRecordingMode({
        id: "1",
        name: "Test",
        emoji: "",
        quantityUnit: "回",
        recordingMode: "",
      }),
    ).toBe("manual");
  });

  it('returns "timer" for time quantityUnit with empty recordingMode', () => {
    expect(
      resolveRecordingMode({
        id: "1",
        name: "Test",
        emoji: "",
        quantityUnit: "時間",
        recordingMode: "",
      }),
    ).toBe("timer");
    expect(
      resolveRecordingMode({
        id: "1",
        name: "Test",
        emoji: "",
        quantityUnit: "分",
        recordingMode: "",
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

  it('falls back to "manual" for invalid recordingMode', () => {
    expect(
      resolveRecordingMode({
        id: "1",
        name: "Test",
        emoji: "",
        quantityUnit: "回",
        recordingMode: "invalid_mode",
      }),
    ).toBe("manual");
  });

  it('falls back to "timer" for invalid recordingMode with time unit', () => {
    expect(
      resolveRecordingMode({
        id: "1",
        name: "Test",
        emoji: "",
        quantityUnit: "時間",
        recordingMode: "invalid_mode",
      }),
    ).toBe("timer");
  });
});
