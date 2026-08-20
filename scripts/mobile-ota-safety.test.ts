import { describe, expect, it } from "vitest";

import { hasNativeMobileChanges } from "./mobile-ota-safety.js";

describe("hasNativeMobileChanges", () => {
  it("allows JavaScript-only Mobile changes", () => {
    expect(hasNativeMobileChanges(["apps/mobile/src/hooks/useAuth.ts"])).toBe(
      false,
    );
  });

  it.each([
    "pnpm-lock.yaml",
    "patches/react-native-css-interop@0.2.6.patch",
    "apps/mobile/package.json",
    "apps/mobile/app.config.ts",
    "apps/mobile/eas.json",
    "apps/mobile/android/app/build.gradle",
    "apps/mobile/ios/Actiko/AppDelegate.swift",
    "apps/mobile/modules/timer-widget/index.ts",
    "apps/mobile/plugins/withWidget.ts",
    "apps/mobile/targets/widget.ts",
  ])("rejects native-affecting OTA changes: %s", (file) => {
    expect(hasNativeMobileChanges([file])).toBe(true);
  });
});
