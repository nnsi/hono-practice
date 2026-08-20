const {
  withAndroidManifest,
  withEntitlementsPlist,
  createRunOncePlugin,
} = require("expo/config-plugins");

function withTimerWidgetIosEntitlements(config) {
  return withEntitlementsPlist(config, (modConfig) => {
    const bundleId = modConfig.ios?.bundleIdentifier;
    if (bundleId) {
      const sharedKeychainGroup = `$(AppIdentifierPrefix)${bundleId}.widget-shared`;
      modConfig.modResults["com.apple.security.application-groups"] = [
        `group.${bundleId}`,
      ];
      // Keep the main app's default group first so unrelated SecureStore data
      // is not exposed to the extension. Voice credentials explicitly use the
      // second, widget-shared group.
      modConfig.modResults["keychain-access-groups"] = [
        `$(AppIdentifierPrefix)${bundleId}`,
        sharedKeychainGroup,
      ];
    }
    return modConfig;
  });
}

function addWidgetReceiver(mainApp, providerClass, xmlResource) {
  mainApp.receiver.push({
    $: {
      "android:name": providerClass,
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
          "android:resource": xmlResource,
        },
      },
    ],
  });
}

function addConfigActivity(mainApp, activityClass) {
  mainApp.activity.push({
    $: {
      "android:name": activityClass,
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
}

function addTimerWidgetToManifest(config) {
  return withAndroidManifest(config, (modConfig) => {
    const mainApp =
      modConfig.modResults.manifest.application?.[0];
    if (!mainApp) return modConfig;

    if (!mainApp.receiver) mainApp.receiver = [];
    if (!mainApp.activity) mainApp.activity = [];

    // Widget receivers
    addWidgetReceiver(mainApp, "com.actiko.widget.TimerWidgetProvider", "@xml/timer_widget_info");
    addWidgetReceiver(mainApp, "com.actiko.widget.CounterWidgetProvider", "@xml/counter_widget_info");
    addWidgetReceiver(mainApp, "com.actiko.widget.CheckWidgetProvider", "@xml/check_widget_info");
    addWidgetReceiver(mainApp, "com.actiko.widget.BinaryWidgetProvider", "@xml/binary_widget_info");

    // Config activities
    addConfigActivity(mainApp, "com.actiko.widget.WidgetConfigActivity");
    addConfigActivity(mainApp, "com.actiko.widget.CounterConfigActivity");
    addConfigActivity(mainApp, "com.actiko.widget.CheckConfigActivity");
    addConfigActivity(mainApp, "com.actiko.widget.BinaryConfigActivity");

    // KindSelectActivity (not a config activity, no intent-filter)
    mainApp.activity.push({
      $: {
        "android:name": "com.actiko.widget.KindSelectActivity",
        "android:exported": "false",
        "android:theme": "@style/Theme.AppCompat.Light.Dialog",
      },
    });

    // Voice App Actions are intentionally disabled. An exported activity could
    // otherwise invoke an authenticated API using attacker-controlled text.
    mainApp.activity.push({
      $: {
        "android:name": "com.actiko.widget.VoiceRecordActivity",
        "android:exported": "false",
        "android:theme": "@android:style/Theme.NoDisplay",
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
