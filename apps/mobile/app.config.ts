import type { ExpoConfig } from "expo/config";

const bundleId = process.env.BUNDLE_ID ?? "com.actiko.app";
const easProjectId = process.env.EAS_PROJECT_ID;
const appleTeamId = process.env.APPLE_TEAM_ID;

const config: ExpoConfig = {
  name: "Actiko",
  slug: "actiko",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "actiko",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
    deploymentTarget: "16.4",
    ...(appleTeamId && { appleTeamId }),
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    ...(bundleId && {
      entitlements: {
        "com.apple.security.application-groups": [`group.${bundleId}`],
      },
    }),
  },
  android: {
    package: bundleId,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FFFFFF",
    },
  },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-sqlite",
    "expo-secure-store",
    "expo-web-browser",
    "expo-updates",
    "expo-apple-authentication",
    "expo-image-picker",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash.png",
        resizeMode: "contain",
        backgroundColor: "#FFFFFF",
      },
    ],
    [
      "expo-build-properties",
      {
        // SDK 56 preview.12 では Hermes V1 が iOS で EXC_BAD_ACCESS を稀に発火させる
        // （expo-modules の sync function が string 配列を返す経路で segfault）。
        // V0 への opt-out は hermes-compiler@0.15.0 が必須だが当該版は private class
        // fields (#x) を解釈できず main.jsbundle 段階で fail するため、暫定的に
        // デフォルト V1 のまま運用し、Maestro runner 側で retry 回数を増やす方針。
        // 再評価時刻: SDK 56 stable リリース後。
      },
    ],
    "./plugins/with-android-cleartext.js",
    "./modules/timer-widget/app.plugin.js",
    "@bacons/apple-targets",
  ],
  extra: {
    router: {},
    eas: {
      projectId: easProjectId,
    },
  },
  owner: process.env.EAS_OWNER,
  runtimeVersion: {
    policy: "appVersion",
  },
  ...(easProjectId && {
    updates: {
      url: `https://u.expo.dev/${easProjectId}`,
    },
  }),
};

export default config;
