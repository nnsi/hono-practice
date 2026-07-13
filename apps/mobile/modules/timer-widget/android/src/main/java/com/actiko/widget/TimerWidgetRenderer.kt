package com.actiko.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.widget.RemoteViews

internal object TimerWidgetRenderer {
    private const val PI_FLAGS = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

    fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        if (!WidgetPlanHelper.isWidgetAllowed(context, widgetId)) {
            val views = RemoteViews(
                context.packageName,
                context.resources.getIdentifier("widget_upgrade", "layout", context.packageName),
            )
            manager.updateAppWidget(widgetId, views)
            return
        }

        val preferences = TimerPreferences(context)
        val views = RemoteViews(
            context.packageName,
            context.resources.getIdentifier("widget_timer", "layout", context.packageName),
        )
        val activityId = preferences.getActivityId(widgetId)
        if (activityId == null) {
            setPlaceholder(context, views, "タップして設定")
            manager.updateAppWidget(widgetId, views)
            return
        }
        val activity = WidgetDbHelper(context).getActivityById(activityId)
        if (activity == null) {
            setPlaceholder(context, views, "削除された活動")
            manager.updateAppWidget(widgetId, views)
            return
        }

        val isRunning = preferences.isRunning(widgetId)
        val elapsedMs = preferences.getElapsedMillis(widgetId)
        val timerId = id(context, "widget_timer_text")
        views.setTextViewText(
            id(context, "widget_activity_name"),
            "${activity.emoji} ${activity.name}",
        )
        views.setChronometer(timerId, SystemClock.elapsedRealtime() - elapsedMs, null, isRunning)
        if (!isRunning) {
            views.setTextViewText(timerId, TimeConversion.formatElapsedTime(elapsedMs))
        }

        val paused = !isRunning && elapsedMs > 0
        views.setViewVisibility(
            id(context, "widget_btn_start"),
            if (!isRunning) View.VISIBLE else View.GONE,
        )
        views.setViewVisibility(
            id(context, "widget_btn_pause"),
            if (isRunning) View.VISIBLE else View.GONE,
        )
        views.setViewVisibility(
            id(context, "widget_btn_stop"),
            if (isRunning || paused) View.VISIBLE else View.GONE,
        )
        views.setViewVisibility(
            id(context, "widget_btn_reset"),
            if (paused) View.VISIBLE else View.GONE,
        )
        views.setOnClickPendingIntent(
            id(context, "widget_btn_start"),
            actionPendingIntent(context, widgetId, TimerWidgetProvider.ACTION_START, 0),
        )
        views.setOnClickPendingIntent(
            id(context, "widget_btn_pause"),
            actionPendingIntent(context, widgetId, TimerWidgetProvider.ACTION_PAUSE, 3),
        )
        views.setOnClickPendingIntent(
            id(context, "widget_btn_stop"),
            actionPendingIntent(context, widgetId, TimerWidgetProvider.ACTION_STOP, 1),
        )
        views.setOnClickPendingIntent(
            id(context, "widget_btn_reset"),
            actionPendingIntent(context, widgetId, TimerWidgetProvider.ACTION_RESET, 2),
        )
        manager.updateAppWidget(widgetId, views)
    }

    private fun setPlaceholder(context: Context, views: RemoteViews, label: String) {
        views.setTextViewText(id(context, "widget_activity_name"), label)
        views.setChronometer(
            id(context, "widget_timer_text"),
            SystemClock.elapsedRealtime(),
            null,
            false,
        )
        views.setTextViewText(id(context, "widget_timer_text"), "00:00")
        listOf("widget_btn_start", "widget_btn_pause", "widget_btn_stop", "widget_btn_reset")
            .forEach { views.setViewVisibility(id(context, it), View.GONE) }
    }

    private fun id(context: Context, name: String): Int {
        val resourceId = context.resources.getIdentifier(name, "id", context.packageName)
        if (resourceId == 0) Log.e("TimerWidget", "Resource not found: $name")
        return resourceId
    }

    private fun actionPendingIntent(
        context: Context,
        widgetId: Int,
        action: String,
        index: Int,
    ): PendingIntent {
        val intent = Intent(context, TimerWidgetProvider::class.java).apply {
            this.action = action
            putExtra(TimerWidgetProvider.EXTRA_WIDGET_ID, widgetId)
            putExtra(
                WidgetSecurity.EXTRA_ACTION_TOKEN,
                TimerPreferences(context).getOrCreateActionToken(widgetId),
            )
        }
        return PendingIntent.getBroadcast(context, widgetId * 10 + index, intent, PI_FLAGS)
    }
}
