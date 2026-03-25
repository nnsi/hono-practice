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

    // VoiceRecordActivity (invisible, receives intent from Google Assistant App Actions)
    // BROWSABLE category removed to prevent browser/external app access
    mainApp.activity.push({
      $: {
        "android:name": "com.actiko.widget.VoiceRecordActivity",
        "android:exported": "true",
        "android:theme": "@android:style/Theme.NoDisplay",
      },
      "intent-filter": [
        {
          action: [
            {
              $: { "android:name": "android.intent.action.VIEW" },
            },
          ],
          category: [
            {
              $: { "android:name": "android.intent.category.DEFAULT" },
            },
          ],
          data: [
            {
              $: {
                "android:scheme": "actiko",
                "android:host": "voice-record",
              },
            },
          ],
        },
      ],
    });

    // Google Assistant App Actions metadata
    if (!mainApp["meta-data"]) mainApp["meta-data"] = [];
    mainApp["meta-data"].push({
      $: {
        "android:name": "com.google.android.actions",
        "android:resource": "@xml/actions",
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
