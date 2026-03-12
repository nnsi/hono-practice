import { describe, expect, it } from "vitest";

import {
  defaultRecordingModeConfig,
  parseRecordingModeConfig,
  serializeRecordingModeConfig,
} from "./recordingModeConfig";

describe("parseRecordingModeConfig", () => {
  it("returns null for null input", () => {
    expect(parseRecordingModeConfig(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseRecordingModeConfig("")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseRecordingModeConfig("{invalid}")).toBeNull();
  });

  it("returns null for valid JSON but invalid schema", () => {
    expect(parseRecordingModeConfig('{"mode":"unknown"}')).toBeNull();
  });

  it("parses counter config", () => {
    const raw = '{"mode":"counter","steps":[1,5,10]}';
    expect(parseRecordingModeConfig(raw)).toEqual({
      mode: "counter",
      steps: [1, 5, 10],
    });
  });

  it("parses binary config", () => {
    const raw = '{"mode":"binary","labels":["Yes","No"]}';
    expect(parseRecordingModeConfig(raw)).toEqual({
      mode: "binary",
      labels: ["Yes", "No"],
    });
  });

  it("rejects counter config with non-positive steps", () => {
    expect(
      parseRecordingModeConfig('{"mode":"counter","steps":[0]}'),
    ).toBeNull();
    expect(
      parseRecordingModeConfig('{"mode":"counter","steps":[-1]}'),
    ).toBeNull();
  });

  it("rejects counter config with empty steps", () => {
    expect(
      parseRecordingModeConfig('{"mode":"counter","steps":[]}'),
    ).toBeNull();
  });
});

describe("serializeRecordingModeConfig", () => {
  it("returns null for null input", () => {
    expect(serializeRecordingModeConfig(null)).toBeNull();
  });

  it("serializes counter config", () => {
    const config = { mode: "counter" as const, steps: [1, 10, 100] };
    expect(serializeRecordingModeConfig(config)).toBe(
      '{"mode":"counter","steps":[1,10,100]}',
    );
  });
});

describe("round-trip", () => {
  it("counter config survives round-trip", () => {
    const config = { mode: "counter" as const, steps: [1, 5, 10] };
    const serialized = serializeRecordingModeConfig(config);
    expect(parseRecordingModeConfig(serialized)).toEqual(config);
  });

  it("binary config survives round-trip", () => {
    const config = {
      mode: "binary" as const,
      labels: ["できた", "できなかった"] as [string, string],
    };
    const serialized = serializeRecordingModeConfig(config);
    expect(parseRecordingModeConfig(serialized)).toEqual(config);
  });
});

describe("defaultRecordingModeConfig", () => {
  it("returns counter default", () => {
    expect(defaultRecordingModeConfig("counter")).toEqual({
      mode: "counter",
      steps: [1, 10, 100],
    });
  });

  it("returns binary default", () => {
    expect(defaultRecordingModeConfig("binary")).toEqual({
      mode: "binary",
      labels: ["A", "B"],
    });
  });

  it("returns null for manual", () => {
    expect(defaultRecordingModeConfig("manual")).toBeNull();
  });

  it("returns null for timer", () => {
    expect(defaultRecordingModeConfig("timer")).toBeNull();
  });

  it("returns null for check", () => {
    expect(defaultRecordingModeConfig("check")).toBeNull();
  });
});
