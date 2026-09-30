import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("mobile security dependency compatibility patches", () => {
  it("parses Expo Router URLs with the patched ESM decoder", () => {
    const routerRequire = createRequire(
      require.resolve("expo-router/package.json"),
    );
    const queryString = routerRequire("query-string");
    expect(queryString.parse("name=%E6%97%A5%E6%9C%AC&space=a%20b")).toEqual({
      name: "日本",
      space: "a b",
    });
    expect(() => queryString.parse("value=%C2%25")).not.toThrow();
  });

  it("reads image assets through Metro with image-size 2", async () => {
    const expoRequire = createRequire(require.resolve("expo/package.json"));
    const metroConfigRequire = createRequire(
      expoRequire.resolve("@expo/metro-config/package.json"),
    );
    const metroRequire = createRequire(
      metroConfigRequire.resolve("metro/package.json"),
    );
    const { getAssetData } = metroRequire("./src/Assets.js");
    const image = require.resolve("expo-router/assets/file.png");
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
});
