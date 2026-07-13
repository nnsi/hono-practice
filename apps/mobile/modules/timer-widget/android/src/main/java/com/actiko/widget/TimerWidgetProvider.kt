package com.actiko.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.util.Log
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
        fun requestUpdate(context: Context, widgetId: Int) {
            val intent = Intent(context, TimerWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(widgetId))
            }
            context.sendBroadcast(intent)
        }

        fun updateWidget(context: Context, mgr: AppWidgetManager, widgetId: Int) {
            TimerWidgetRenderer.updateWidget(context, mgr, widgetId)
        }

        fun saveLogDirect(
            context: Context,
            widgetId: Int,
            activityId: String,
            kindId: String?,
        ): Result<Unit> {
            if (!WidgetSecurity.isRegisteredWidget(context, widgetId, TimerWidgetProvider::class.java) ||
                !WidgetPlanHelper.isWidgetAllowed(context, widgetId)
            ) {
                return Result.failure(SecurityException("Widget is not registered or allowed"))
            }
            val prefs = TimerPreferences(context)
            val elapsedSeconds = prefs.getElapsedMillis(widgetId) / 1000
            val dbHelper = WidgetDbHelper(context)
            val activity = dbHelper.getActivityById(activityId)
                ?: return Result.failure(IllegalStateException("Configured activity no longer exists"))
            if (kindId != null && !dbHelper.isKindOwnedByActivity(activityId, kindId)) {
                return Result.failure(SecurityException("Activity kind does not belong to activity"))
            }
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
            return dbHelper.insertActivityLog(
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
        if (intent.action !in setOf(ACTION_START, ACTION_PAUSE, ACTION_STOP, ACTION_RESET)) return
        val wId = intent.getIntExtra(EXTRA_WIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        if (!WidgetSecurity.isAuthorizedAction(
                context,
                intent,
                wId,
                TimerWidgetProvider::class.java,
            )
        ) return
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
            saveLogDirect(context, widgetId, activityId, null).onSuccess {
                prefs.resetTimer(widgetId)
            }.onFailure {
                Log.e("TimerWidget", "Failed to save timer log; preserving elapsed state", it)
            }
            updateWidget(context, mgr, widgetId)
        }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        val prefs = TimerPreferences(context)
        appWidgetIds.forEach { prefs.removeWidget(it) }
    }
}
