import type { ExpoConfig } from "expo/config";

const bundleId = process.env.BUNDLE_ID;
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
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#FFFFFF",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
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
  runtimeVersion: "1.0.0",
  ...(easProjectId && {
    updates: {
      url: `https://u.expo.dev/${easProjectId}`,
    },
  }),
};

export default config;
