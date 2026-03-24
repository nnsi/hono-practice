const {
  withAndroidManifest,
  withEntitlementsPlist,
  createRunOncePlugin,
} = require("expo/config-plugins");

function withTimerWidgetIosEntitlements(config) {
  return withEntitlementsPlist(config, (modConfig) => {
    const bundleId = modConfig.ios?.bundleIdentifier;
    if (bundleId) {
      modConfig.modResults["com.apple.security.application-groups"] = [
        `group.${bundleId}`,
      ];
    }
    return modConfig;
  });
}

function addTimerWidgetToManifest(config) {
  return withAndroidManifest(config, (modConfig) => {
    const mainApp =
      modConfig.modResults.manifest.application?.[0];
    if (!mainApp) return modConfig;

    if (!mainApp.receiver) mainApp.receiver = [];
    if (!mainApp.activity) mainApp.activity = [];

    // Add TimerWidgetProvider receiver
    mainApp.receiver.push({
      $: {
        "android:name": "com.actiko.widget.TimerWidgetProvider",
        "android:exported": "true",
      },
      "intent-filter": [
        {
          action: [
            {
              $: {
                "android:name":
                  "android.appwidget.action.APPWIDGET_UPDATE",
              },
            },
          ],
        },
      ],
      "meta-data": [
        {
          $: {
            "android:name": "android.appwidget.provider",
            "android:resource": "@xml/timer_widget_info",
          },
        },
      ],
    });

    // Add WidgetConfigActivity
    mainApp.activity.push({
      $: {
        "android:name": "com.actiko.widget.WidgetConfigActivity",
        "android:exported": "true",
        "android:theme": "@style/Theme.AppCompat.Light.Dialog",
      },
      "intent-filter": [
        {
          action: [
            {
              $: {
                "android:name":
                  "android.appwidget.action.APPWIDGET_CONFIGURE",
              },
            },
          ],
        },
      ],
    });

    // Add KindSelectActivity
    mainApp.activity.push({
      $: {
        "android:name": "com.actiko.widget.KindSelectActivity",
        "android:exported": "false",
        "android:theme": "@style/Theme.AppCompat.Light.Dialog",
      },
    });

    return modConfig;
  });
}

function withTimerWidget(config) {
  config = addTimerWidgetToManifest(config);
  config = withTimerWidgetIosEntitlements(config);
  return config;
}

module.exports = createRunOncePlugin(
  withTimerWidget,
  "timer-widget",
  "1.0.0",
);
