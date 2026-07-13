import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const guardPath = path.resolve("scripts/check-backend-rules.js");
const temporaryDirectories: string[] = [];

function runGuard(files: Record<string, string>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "backend-rules-"));
  temporaryDirectories.push(root);

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents, "utf8");
  }

  try {
    execFileSync(process.execPath, [guardPath], {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    });
    return { exitCode: 0, output: "" };
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : 1;
    const stdout =
      typeof error === "object" &&
      error !== null &&
      "stdout" in error &&
      typeof error.stdout === "string"
        ? error.stdout
        : "";
    const stderr =
      typeof error === "object" &&
      error !== null &&
      "stderr" in error &&
      typeof error.stderr === "string"
        ? error.stderr
        : "";
    return {
      exitCode: status,
      output: `${stdout}${stderr}`,
    };
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

describe("backend dependency guard", () => {
  it("allows an application usecase to depend on the application-owned port", () => {
    const result = runGuard({
      "apps/backend/feature/example/exampleUsecase.ts":
        'import type { RateLimitPorts } from "@backend/port/rateLimit";\n',
      "apps/backend/port/rateLimit.ts": "export type RateLimitPorts = {};\n",
    });

    expect(result).toEqual({ exitCode: 0, output: "" });
  });

  it.each([
    {
      file: "apps/backend/feature/example/exampleUsecase.ts",
      source: 'import type { AppContext } from "@backend/context";\n',
    },
    {
      file: "apps/backend/feature/example/exampleGuard.ts",
      source: 'import type { HonoContext } from "../../context";\n',
    },
  ])("rejects a context import from $file", ({ file, source }) => {
    const result = runGuard({ [file]: source });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain(
      "Application services must receive narrow dependencies",
    );
  });

  it("rejects an infrastructure rate-limit dependency from an inner layer", () => {
    const result = runGuard({
      "apps/backend/feature/example/exampleUsecase.ts":
        'import type { RateLimitStore } from "@backend/infra/rateLimit";\n',
    });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain(
      "Inner layers must depend on the application-owned rate-limit port",
    );
  });
});
