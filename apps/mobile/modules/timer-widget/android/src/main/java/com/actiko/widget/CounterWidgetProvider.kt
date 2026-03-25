package com.actiko.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class CounterWidgetProvider : AppWidgetProvider() {
    companion object {
        const val ACTION_INCREMENT = "com.actiko.widget.ACTION_INCREMENT"
        const val EXTRA_WIDGET_ID = "com.actiko.widget.EXTRA_WIDGET_ID"
        const val EXTRA_STEP = "com.actiko.widget.EXTRA_STEP"
        private const val PI_FLAGS =
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

        private val STEP_BTN_IDS = arrayOf("counter_btn_step1", "counter_btn_step2", "counter_btn_step3")

        fun requestUpdate(context: Context, widgetId: Int) {
            val intent = Intent(context, CounterWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(widgetId))
            }
            context.sendBroadcast(intent)
        }

        fun updateWidget(ctx: Context, mgr: AppWidgetManager, widgetId: Int) {
            if (!WidgetPlanHelper.isWidgetAllowed(ctx, widgetId)) {
                val pkg = ctx.packageName
                val views = RemoteViews(pkg, resId(ctx, "widget_upgrade", "layout"))
                mgr.updateAppWidget(widgetId, views)
                return
            }
            val prefs = TimerPreferences(ctx)
            val pkg = ctx.packageName
            val views = RemoteViews(pkg, resId(ctx, "widget_counter", "layout"))

            val activityId = prefs.getActivityId(widgetId)
            if (activityId == null) {
                views.setTextViewText(resId(ctx, "counter_activity_name"), "\u30BF\u30C3\u30D7\u3057\u3066\u8A2D\u5B9A")
                views.setTextViewText(resId(ctx, "counter_count_text"), "-")
                hideAllStepButtons(ctx, views)
                mgr.updateAppWidget(widgetId, views)
                return
            }
            val db = WidgetDbHelper(ctx)
            val activity = db.getActivityById(activityId)
            if (activity == null) {
                views.setTextViewText(resId(ctx, "counter_activity_name"), "\u524A\u9664\u3055\u308C\u305F\u6D3B\u52D5")
                views.setTextViewText(resId(ctx, "counter_count_text"), "-")
                hideAllStepButtons(ctx, views)
                mgr.updateAppWidget(widgetId, views)
                return
            }
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val count = WidgetLogHelper(ctx).getActivityLogCountForToday(activityId, today)
            val steps = WidgetDbHelper.parseCounterSteps(activity.recordingModeConfig)

            views.setTextViewText(resId(ctx, "counter_activity_name"), "${activity.emoji} ${activity.name}")
            views.setTextViewText(resId(ctx, "counter_count_text"), count.toString())

            // Set up step buttons (up to 3)
            for (i in STEP_BTN_IDS.indices) {
                val btnId = resId(ctx, STEP_BTN_IDS[i])
                if (i < steps.size) {
                    val step = steps[i]
                    views.setViewVisibility(btnId, View.VISIBLE)
                    views.setTextViewText(btnId, "+$step")
                    views.setOnClickPendingIntent(btnId, stepPi(ctx, widgetId, step, i))
                } else {
                    views.setViewVisibility(btnId, View.GONE)
                }
            }

            mgr.updateAppWidget(widgetId, views)
        }

        private fun hideAllStepButtons(ctx: Context, views: RemoteViews) {
            for (name in STEP_BTN_IDS) {
                views.setViewVisibility(resId(ctx, name), View.GONE)
            }
        }

        private fun resId(ctx: Context, name: String, type: String = "id"): Int {
            val id = ctx.resources.getIdentifier(name, type, ctx.packageName)
            if (id == 0) Log.e("CounterWidget", "Resource not found: $name")
            return id
        }

        private fun stepPi(ctx: Context, widgetId: Int, step: Int, idx: Int): PendingIntent {
            val intent = Intent(ctx, CounterWidgetProvider::class.java).apply {
                action = ACTION_INCREMENT
                putExtra(EXTRA_WIDGET_ID, widgetId)
                putExtra(EXTRA_STEP, step)
            }
            return PendingIntent.getBroadcast(ctx, widgetId * 10 + idx, intent, PI_FLAGS)
        }
    }

    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { updateWidget(ctx, mgr, it) }
    }

    override fun onReceive(ctx: Context, intent: Intent) {
        super.onReceive(ctx, intent)
        if (intent.action != ACTION_INCREMENT) return
        val wId = intent.getIntExtra(EXTRA_WIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        if (wId == AppWidgetManager.INVALID_APPWIDGET_ID) return
        if (!WidgetPlanHelper.isWidgetAllowed(ctx, wId)) return

        val step = intent.getIntExtra(EXTRA_STEP, 1)
        val prefs = TimerPreferences(ctx)
        val activityId = prefs.getActivityId(wId) ?: return
        val kindId = prefs.getKindId(wId)
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        WidgetLogHelper(ctx).insertLog(
            activityId = activityId, activityKindId = kindId,
            quantity = step.toDouble(), memo = "", date = today,
        )
        updateWidget(ctx, AppWidgetManager.getInstance(ctx), wId)
    }

    override fun onDeleted(ctx: Context, ids: IntArray) {
        val prefs = TimerPreferences(ctx)
        ids.forEach { prefs.removeWidget(it) }
    }
}
