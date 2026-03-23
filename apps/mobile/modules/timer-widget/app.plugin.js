const { withAndroidManifest } = require("expo/config-plugins");

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

module.exports = addTimerWidgetToManifest;
