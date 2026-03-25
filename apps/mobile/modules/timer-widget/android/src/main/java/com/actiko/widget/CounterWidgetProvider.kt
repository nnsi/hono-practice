package com.actiko.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class CounterWidgetProvider : AppWidgetProvider() {
    companion object {
        const val ACTION_INCREMENT = "com.actiko.widget.ACTION_INCREMENT"
        const val EXTRA_WIDGET_ID = "com.actiko.widget.EXTRA_WIDGET_ID"
        private const val PI_FLAGS =
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

        fun requestUpdate(context: Context, widgetId: Int) {
            val intent = Intent(context, CounterWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(widgetId))
            }
            context.sendBroadcast(intent)
        }

        fun updateWidget(ctx: Context, mgr: AppWidgetManager, widgetId: Int) {
            // Runtime plan check: show upgrade layout if not allowed
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
                mgr.updateAppWidget(widgetId, views)
                return
            }
            val db = WidgetDbHelper(ctx)
            val activity = db.getActivityById(activityId)
            if (activity == null) {
                views.setTextViewText(resId(ctx, "counter_activity_name"), "\u524A\u9664\u3055\u308C\u305F\u6D3B\u52D5")
                views.setTextViewText(resId(ctx, "counter_count_text"), "-")
                mgr.updateAppWidget(widgetId, views)
                return
            }
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            val count = WidgetLogHelper(ctx).getActivityLogCountForToday(activityId, today)
            views.setTextViewText(resId(ctx, "counter_activity_name"), "${activity.emoji} ${activity.name}")
            views.setTextViewText(resId(ctx, "counter_count_text"), count.toString())
            val pi = actionPi(ctx, widgetId, ACTION_INCREMENT)
            views.setOnClickPendingIntent(resId(ctx, "counter_btn_plus"), pi)
            mgr.updateAppWidget(widgetId, views)
        }

        private fun resId(ctx: Context, name: String, type: String = "id"): Int {
            val id = ctx.resources.getIdentifier(name, type, ctx.packageName)
            if (id == 0) Log.e("CounterWidget", "Resource not found: $name")
            return id
        }

        private fun actionPi(ctx: Context, widgetId: Int, action: String): PendingIntent {
            val intent = Intent(ctx, CounterWidgetProvider::class.java).apply {
                this.action = action
                putExtra(EXTRA_WIDGET_ID, widgetId)
            }
            return PendingIntent.getBroadcast(ctx, widgetId * 10, intent, PI_FLAGS)
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

        val prefs = TimerPreferences(ctx)
        val activityId = prefs.getActivityId(wId) ?: return
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        WidgetLogHelper(ctx).insertLog(
            activityId = activityId, activityKindId = null,
            quantity = 1.0, memo = "", date = today,
        )
        updateWidget(ctx, AppWidgetManager.getInstance(ctx), wId)
    }

    override fun onDeleted(ctx: Context, ids: IntArray) {
        val prefs = TimerPreferences(ctx)
        ids.forEach { prefs.removeWidget(it) }
    }
}
