import type { ExpoConfig } from "expo/config";

type MobileExpoConfig = ExpoConfig & {
  splash: {
    image: string;
    resizeMode: "contain" | "cover" | "native";
    backgroundColor: string;
  };
};

const APP_VERSION = "1.1.0";
const DEVELOPMENT_BUNDLE_ID = "com.actiko.app";
const isProductionBuild = process.env.EAS_BUILD_PROFILE === "production";

function requireProductionEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (isProductionBuild && !value) {
    throw new Error(`${name} is required for the production mobile config`);
  }
  return value;
}

const configuredBundleId = requireProductionEnv("BUNDLE_ID");
const bundleId = configuredBundleId ?? DEVELOPMENT_BUNDLE_ID;
const easProjectId = process.env.EAS_PROJECT_ID;
const easOwner = process.env.EAS_OWNER;
const appleTeamId = requireProductionEnv("APPLE_TEAM_ID");

if (isProductionBuild) {
  requireProductionEnv("EAS_PROJECT_ID");
  requireProductionEnv("EAS_OWNER");
  requireProductionEnv("EXPO_PUBLIC_API_URL");
  requireProductionEnv("EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS");
  requireProductionEnv("EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID");
  requireProductionEnv("EXPO_PUBLIC_CONTACT_EMAIL");
  requireProductionEnv("EXPO_PUBLIC_WEB_URL");
  requireProductionEnv("EXPO_PUBLIC_REVENUECAT_API_KEY_IOS");
  requireProductionEnv("EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID");
  if (bundleId === DEVELOPMENT_BUNDLE_ID) {
    throw new Error(
      "Production BUNDLE_ID must not use the development default",
    );
  }
}

if (!/^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(bundleId)) {
  throw new Error("BUNDLE_ID must be a reverse-DNS identifier");
}
if (appleTeamId && !/^[A-Z0-9]{10}$/.test(appleTeamId)) {
  throw new Error(
    "APPLE_TEAM_ID must contain exactly 10 uppercase letters or digits",
  );
}

const sharedKeychainAccessGroup = appleTeamId
  ? `${appleTeamId}.${bundleId}.widget-shared`
  : undefined;

const config: MobileExpoConfig = {
  name: "Actiko",
  slug: "actiko",
  version: APP_VERSION,
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
    "expo-localization",
    "expo-sharing",
    "./plugins/with-android-cleartext.js",
    "./modules/timer-widget/app.plugin.js",
    "@bacons/apple-targets",
  ],
  extra: {
    router: {},
    sharedKeychainAccessGroup,
    eas: {
      projectId: easProjectId,
    },
  },
  owner: easOwner,
  runtimeVersion: APP_VERSION,
  ...(easProjectId && {
    updates: {
      url: `https://u.expo.dev/${easProjectId}`,
    },
  }),
};

export default config;
