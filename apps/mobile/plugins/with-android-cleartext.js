const {
  createRunOncePlugin,
  withAndroidManifest,
} = require("expo/config-plugins");

function withAndroidCleartext(config) {
  return withAndroidManifest(config, (modConfig) => {
    if (process.env.ANDROID_USES_CLEARTEXT_TRAFFIC !== "true") {
      return modConfig;
    }

    const mainApp =
      modConfig.modResults.manifest.application?.[0];
    if (!mainApp) return modConfig;

    if (!mainApp.$) mainApp.$ = {};
    mainApp.$["android:usesCleartextTraffic"] = "true";

    return modConfig;
  });
}

module.exports = createRunOncePlugin(
  withAndroidCleartext,
  "with-android-cleartext",
  "1.0.0",
);
