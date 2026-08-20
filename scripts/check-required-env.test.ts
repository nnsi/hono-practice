import { describe, expect, it } from "vitest";

import { formatMissingEnv, missingRequiredEnv } from "./check-required-env.js";

describe("required environment preflight", () => {
  it("reports only missing variable names", () => {
    const secret = "do-not-log-this-secret";
    const missing = missingRequiredEnv(["TOKEN", "PROJECT_ID"], {
      TOKEN: secret,
    });
    const message = formatMissingEnv(missing);
    expect(message).toBe("Missing required variable names: PROJECT_ID");
    expect(message).not.toContain(secret);
  });

  it("treats blank values as missing", () => {
    expect(missingRequiredEnv(["A", "B"], { A: " ", B: "ok" })).toEqual(["A"]);
  });
});
