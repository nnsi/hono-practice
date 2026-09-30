import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("security dependency compatibility patches", () => {
  it("parses Expo Router URLs with the patched ESM decoder", () => {
    const routerRequire = createRequire(
      require.resolve("../apps/mobile/node_modules/expo-router/package.json"),
    );
    const queryString = routerRequire("query-string");
    expect(queryString.parse("name=%E6%97%A5%E6%9C%AC&space=a%20b")).toEqual({
      name: "日本",
      space: "a b",
    });
    expect(() => queryString.parse("value=%C2%25")).not.toThrow();
  });

  it("reads image assets through Metro with image-size 2", async () => {
    const expoRequire = createRequire(
      require.resolve("../apps/mobile/node_modules/expo/package.json"),
    );
    const metroConfigRequire = createRequire(
      expoRequire.resolve("@expo/metro-config/package.json"),
    );
    const metroRequire = createRequire(
      metroConfigRequire.resolve("metro/package.json"),
    );
    const { getAssetData } = metroRequire("./src/Assets.js");
    const image = require.resolve(
      "../apps/mobile/node_modules/expo-router/assets/file.png",
    );
    const asset = await getAssetData(
      image,
      "assets/file.png",
      [],
      "ios",
      "/assets",
    );
    expect(asset.width).toBeGreaterThan(0);
    expect(asset.height).toBeGreaterThan(0);
  });

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
