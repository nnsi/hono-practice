#!/usr/bin/env node
import fs from "node:fs";

const NATIVE_MOBILE_FILES = new Set([
  "pnpm-lock.yaml",
  "patches/react-native-css-interop@0.2.6.patch",
  "apps/mobile/package.json",
  "apps/mobile/app.config.ts",
  "apps/mobile/eas.json",
]);

const NATIVE_MOBILE_PREFIXES = [
  "apps/mobile/android/",
  "apps/mobile/ios/",
  "apps/mobile/modules/",
  "apps/mobile/plugins/",
  "apps/mobile/targets/",
];

export function hasNativeMobileChanges(inputFiles) {
  return inputFiles.some((inputFile) => {
    const file = inputFile.trim().replace(/^\.\//, "");
    return (
      NATIVE_MOBILE_FILES.has(file) ||
      NATIVE_MOBILE_PREFIXES.some((prefix) => file.startsWith(prefix))
    );
  });
}

function main() {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf("--files");
  const filesPath = fileIndex >= 0 ? args[fileIndex + 1] : undefined;
  if (!filesPath) throw new Error("--files is required");

  const files = fs.readFileSync(filesPath, "utf8").split(/\r?\n/);
  if (hasNativeMobileChanges(files)) {
    throw new Error(
      "OTA rejected: native-affecting files changed since the selected native build",
    );
  }
}

if (process.argv[1]?.endsWith("mobile-ota-safety.js")) main();
