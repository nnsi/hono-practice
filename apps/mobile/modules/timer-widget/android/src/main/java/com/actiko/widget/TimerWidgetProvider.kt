package com.actiko.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class TimerWidgetProvider : AppWidgetProvider() {
    companion object {
        const val ACTION_START = "com.actiko.widget.ACTION_START"
        const val ACTION_PAUSE = "com.actiko.widget.ACTION_PAUSE"
        const val ACTION_STOP = "com.actiko.widget.ACTION_STOP"
        const val ACTION_RESET = "com.actiko.widget.ACTION_RESET"
        const val EXTRA_WIDGET_ID = "com.actiko.widget.EXTRA_WIDGET_ID"
        private const val PI_FLAGS = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

        fun requestUpdate(context: Context, widgetId: Int) {
            val intent = Intent(context, TimerWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(widgetId))
            }
            context.sendBroadcast(intent)
        }

        fun updateWidget(context: Context, mgr: AppWidgetManager, widgetId: Int) {
            if (!WidgetPlanHelper.isWidgetAllowed(context, widgetId)) {
                val pkg = context.packageName
                val views = RemoteViews(pkg, context.resources.getIdentifier("widget_upgrade", "layout", pkg))
                mgr.updateAppWidget(widgetId, views)
                return
            }
            val prefs = TimerPreferences(context)
            val pkg = context.packageName
            val views = RemoteViews(pkg, context.resources.getIdentifier("widget_timer", "layout", pkg))
            val activityId = prefs.getActivityId(widgetId)
            if (activityId == null) {
                setPlaceholder(context, views, "\u30BF\u30C3\u30D7\u3057\u3066\u8A2D\u5B9A")
                mgr.updateAppWidget(widgetId, views)
                return
            }
            val activity = WidgetDbHelper(context).getActivityById(activityId)
            if (activity == null) {
                setPlaceholder(context, views, "\u524A\u9664\u3055\u308C\u305F\u6D3B\u52D5")
                mgr.updateAppWidget(widgetId, views)
                return
            }
            val isRunning = prefs.isRunning(widgetId)
            val elapsedMs = prefs.getElapsedMillis(widgetId)
            val timerId = id(context, "widget_timer_text")
            views.setTextViewText(id(context, "widget_activity_name"), "${activity.emoji} ${activity.name}")
            // Chronometer: base = elapsedRealtime - elapsed → counts up from elapsed
            val base = SystemClock.elapsedRealtime() - elapsedMs
            views.setChronometer(timerId, base, null, isRunning)
            if (!isRunning) {
                // When stopped, show static formatted time instead of ticking
                views.setTextViewText(timerId, TimeConversion.formatElapsedTime(elapsedMs))
            }
            val paused = !isRunning && elapsedMs > 0
            // Running: pause + stop | Paused: start(resume) + stop | Idle: start
            views.setViewVisibility(id(context, "widget_btn_start"), if (!isRunning) View.VISIBLE else View.GONE)
            views.setViewVisibility(id(context, "widget_btn_pause"), if (isRunning) View.VISIBLE else View.GONE)
            views.setViewVisibility(id(context, "widget_btn_stop"), if (isRunning || paused) View.VISIBLE else View.GONE)
            views.setViewVisibility(id(context, "widget_btn_reset"), if (paused) View.VISIBLE else View.GONE)
            views.setOnClickPendingIntent(id(context, "widget_btn_start"), actionPi(context, widgetId, ACTION_START, 0))
            views.setOnClickPendingIntent(id(context, "widget_btn_pause"), actionPi(context, widgetId, ACTION_PAUSE, 3))
            views.setOnClickPendingIntent(id(context, "widget_btn_stop"), actionPi(context, widgetId, ACTION_STOP, 1))
            views.setOnClickPendingIntent(id(context, "widget_btn_reset"), actionPi(context, widgetId, ACTION_RESET, 2))
            mgr.updateAppWidget(widgetId, views)
        }

        private fun setPlaceholder(context: Context, views: RemoteViews, label: String) {
            views.setTextViewText(id(context, "widget_activity_name"), label)
            views.setChronometer(id(context, "widget_timer_text"), SystemClock.elapsedRealtime(), null, false)
            views.setTextViewText(id(context, "widget_timer_text"), "00:00")
            views.setViewVisibility(id(context, "widget_btn_start"), View.GONE)
            views.setViewVisibility(id(context, "widget_btn_pause"), View.GONE)
            views.setViewVisibility(id(context, "widget_btn_stop"), View.GONE)
            views.setViewVisibility(id(context, "widget_btn_reset"), View.GONE)
        }

        private fun id(context: Context, name: String): Int {
            val resId = context.resources.getIdentifier(name, "id", context.packageName)
            if (resId == 0) Log.e("TimerWidget", "Resource not found: $name")
            return resId
        }

        private fun actionPi(context: Context, widgetId: Int, action: String, idx: Int): PendingIntent {
            val intent = Intent(context, TimerWidgetProvider::class.java).apply {
                this.action = action
                putExtra(EXTRA_WIDGET_ID, widgetId)
            }
            return PendingIntent.getBroadcast(context, widgetId * 10 + idx, intent, PI_FLAGS)
        }

        fun saveLogDirect(context: Context, widgetId: Int, activityId: String, kindId: String?) {
            if (!WidgetPlanHelper.isWidgetAllowed(context, widgetId)) return
            val prefs = TimerPreferences(context)
            val elapsedSeconds = prefs.getElapsedMillis(widgetId) / 1000
            val dbHelper = WidgetDbHelper(context)
            val activity = dbHelper.getActivityById(activityId) ?: return
            val unitType = TimeConversion.getTimeUnitType(activity.quantityUnit)
            val quantity = TimeConversion.convertSecondsToUnit(elapsedSeconds, unitType)
            val startDateIso = prefs.getStartDateIso(widgetId)
            val memo = if (startDateIso != null) {
                try {
                    val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                    sdf.timeZone = TimeZone.getTimeZone("UTC")
                    val d = sdf.parse(startDateIso)
                    if (d != null) TimeConversion.generateTimeMemo(d, Date()) else ""
                } catch (_: Exception) { "" }
            } else ""
            val utcFmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val now = utcFmt.format(Date())
            val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            dbHelper.insertActivityLog(
                id = UuidV7.generate(), activityId = activityId, activityKindId = kindId,
                quantity = quantity, memo = memo, date = today,
                syncStatus = "pending", createdAt = now, updatedAt = now,
            )
        }
    }

    override fun onUpdate(context: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { updateWidget(context, mgr, it) }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val wId = intent.getIntExtra(EXTRA_WIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        if (wId == AppWidgetManager.INVALID_APPWIDGET_ID) return
        if (!WidgetPlanHelper.isWidgetAllowed(context, wId)) return
        val mgr = AppWidgetManager.getInstance(context)
        when (intent.action) {
            ACTION_START -> {
                TimerPreferences(context).startTimer(wId)
                updateWidget(context, mgr, wId)
            }
            ACTION_PAUSE -> {
                TimerPreferences(context).stopTimer(wId)
                updateWidget(context, mgr, wId)
            }
            ACTION_STOP -> handleStop(context, wId, mgr)
            ACTION_RESET -> {
                TimerPreferences(context).resetTimer(wId)
                updateWidget(context, mgr, wId)
            }
        }
    }

    private fun handleStop(context: Context, widgetId: Int, mgr: AppWidgetManager) {
        val prefs = TimerPreferences(context)
        if (prefs.isRunning(widgetId)) {
            prefs.stopTimer(widgetId)
        }
        val activityId = prefs.getActivityId(widgetId) ?: return
        val kinds = WidgetDbHelper(context).getActivityKinds(activityId)
        if (kinds.isNotEmpty()) {
            val intent = Intent(context, KindSelectActivity::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                putExtra("activityId", activityId)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } else {
            saveLogDirect(context, widgetId, activityId, null)
            prefs.resetTimer(widgetId)
            updateWidget(context, mgr, widgetId)
        }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        val prefs = TimerPreferences(context)
        appWidgetIds.forEach { prefs.removeWidget(it) }
    }
}
