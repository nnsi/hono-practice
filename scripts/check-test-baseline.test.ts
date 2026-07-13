import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { assertTestBaseline, collectTestFiles } from "./check-test-baseline.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

describe("test baseline guard", () => {
  it("counts unit tests but excludes E2E and generated directories", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "actiko-tests-"));
    temporaryDirectories.push(root);
    fs.mkdirSync(path.join(root, "src"));
    fs.mkdirSync(path.join(root, "e2e"));
    fs.mkdirSync(path.join(root, "node_modules"));
    fs.writeFileSync(path.join(root, "src", "a.test.ts"), "", "utf8");
    fs.writeFileSync(path.join(root, "e2e", "b.test.ts"), "", "utf8");
    fs.writeFileSync(path.join(root, "node_modules", "c.test.ts"), "", "utf8");
    expect(collectTestFiles(root)).toEqual([path.join("src", "a.test.ts")]);
  });

  it("fails when the file count drops below the recorded baseline", () => {
    expect(() => assertTestBaseline(["one.test.ts"], 2)).toThrow(
      "Unit/integration test files dropped below baseline",
    );
  });
});
