#!/usr/bin/env node
import fs from "node:fs";

const ROOT_BUILD_FILES = new Set([
  ".npmrc",
  "biome.json",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "vite.config.ts",
  "vitest.config.ts",
  "vitest.e2e.config.ts",
]);

const normalizePath = (file) => file.trim().replace(/^\.\//, "");
const startsWithAny = (file, prefixes) =>
  prefixes.some((prefix) => file.startsWith(prefix));

export function classifyReleaseImpact(inputFiles) {
  const files = inputFiles.map(normalizePath).filter(Boolean);
  const rootBuildChanged = files.some(
    (file) => ROOT_BUILD_FILES.has(file) || file.startsWith("patches/"),
  );
  const sharedPackageChanged = files.some((file) => file.startsWith("packages/"));
  const migrationsChanged = files.some((file) =>
    startsWithAny(file, ["infra/drizzle/", "terraform/"]),
  );

  const backend =
    rootBuildChanged ||
    sharedPackageChanged ||
    migrationsChanged ||
    files.some((file) => file.startsWith("apps/backend/") || file === "wrangler.toml");
  const frontend =
    rootBuildChanged ||
    sharedPackageChanged ||
    files.some((file) => file.startsWith("apps/frontend/"));
  const admin =
    rootBuildChanged ||
    sharedPackageChanged ||
    files.some((file) => file.startsWith("apps/admin-frontend/"));
  const mobile =
    rootBuildChanged ||
    sharedPackageChanged ||
    files.some((file) => file.startsWith("apps/mobile/"));
  const tail =
    rootBuildChanged || files.some((file) => file.startsWith("apps/tail-worker/"));

  const nativeMobile = files.some(
    (file) =>
      file === "pnpm-lock.yaml" ||
      file === "patches/react-native-css-interop@0.2.6.patch" ||
      file === "apps/mobile/package.json" ||
      file === "apps/mobile/app.config.ts" ||
      file === "apps/mobile/eas.json" ||
      startsWithAny(file, [
        "apps/mobile/android/",
        "apps/mobile/ios/",
        "apps/mobile/modules/",
        "apps/mobile/plugins/",
        "apps/mobile/targets/",
      ]),
  );

  return {
    admin,
    backend,
    frontend,
    migrations: migrationsChanged,
    mobile,
    native_mobile: nativeMobile,
    tail,
  };
}

function parseArgs(argv) {
  const fileIndex = argv.indexOf("--files");
  const outputIndex = argv.indexOf("--github-output");
  return {
    assertOtaSafe: argv.includes("--assert-ota-safe"),
    filesPath: fileIndex >= 0 ? argv[fileIndex + 1] : undefined,
    githubOutput: outputIndex >= 0 ? argv[outputIndex + 1] : undefined,
  };
}

function main() {
  const { assertOtaSafe, filesPath, githubOutput } = parseArgs(process.argv.slice(2));
  const raw = filesPath ? fs.readFileSync(filesPath, "utf8") : fs.readFileSync(0, "utf8");
  const impact = classifyReleaseImpact(raw.split(/\r?\n/));
  const lines = Object.entries(impact).map(([key, value]) => `${key}=${value}`);
  if (githubOutput) fs.appendFileSync(githubOutput, `${lines.join("\n")}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(impact)}\n`);
  if (assertOtaSafe && impact.native_mobile) {
    throw new Error("OTA rejected: native-affecting files changed since the selected native build");
  }
}

if (process.argv[1]?.endsWith("release-impact.js")) main();
