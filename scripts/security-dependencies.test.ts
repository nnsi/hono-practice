import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("security dependency compatibility patches", () => {
  it("merges EAS project configuration with ts-deepmerge 8", async () => {
    const easRequire = createRequire(require.resolve("eas-cli/package.json"));
    const { generateAppConfigAsync } = easRequire(
      "./build/commandUtils/new/projectFiles.js",
    );
    const directory = await mkdtemp(
      path.join(tmpdir(), "actiko-security-eas-"),
    );
    try {
      await writeFile(
        path.join(directory, "app.json"),
        JSON.stringify({ expo: { ios: { supportsTablet: true } } }),
      );
      await generateAppConfigAsync(directory, {
        id: "00000000-0000-4000-8000-000000000001",
        slug: "audit-smoke",
        name: "Audit",
        ownerAccount: { name: "local-test" },
      });
      const config = JSON.parse(
        await readFile(path.join(directory, "app.json"), "utf8"),
      );
      expect(config.expo.ios).toEqual({
        supportsTablet: true,
        bundleIdentifier: "com.localtest.auditsmoke",
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
