/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "ActikoTimerWidget",
  bundleIdentifier: ".widget",
  deploymentTarget: "17.0",
  frameworks: ["WidgetKit", "SwiftUI", "AppIntents"],
  entitlements: {
    "com.apple.security.application-groups":
      config.ios?.entitlements?.["com.apple.security.application-groups"] ?? [],
    "keychain-access-groups": config.ios?.bundleIdentifier
      ? [`$(AppIdentifierPrefix)${config.ios.bundleIdentifier}.widget-shared`]
      : [],
  },
  colors: {
    $widgetBackground: { light: "#1A1A2E", dark: "#1A1A2E" },
    $accent: "#4CAF50",
  },
});
