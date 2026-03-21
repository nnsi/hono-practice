import type { ExpoConfig } from "expo/config";

const bundleId = process.env.BUNDLE_ID;
const easProjectId = process.env.EAS_PROJECT_ID;

const config: ExpoConfig = {
  name: "Actiko",
  slug: "actiko",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "actiko",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: bundleId,
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
