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

class BinaryWidgetProvider : AppWidgetProvider() {
    companion object {
        const val ACTION_KIND = "com.actiko.widget.ACTION_BINARY_KIND"
        const val EXTRA_WIDGET_ID = "com.actiko.widget.EXTRA_WIDGET_ID"
        const val EXTRA_KIND_ID = "com.actiko.widget.EXTRA_KIND_ID"
        private const val PI_FLAGS =
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

        fun requestUpdate(context: Context, widgetId: Int) {
            val intent = Intent(context, BinaryWidgetProvider::class.java).apply {
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
            val views = RemoteViews(pkg, resId(ctx, "widget_binary", "layout"))

            val activityId = prefs.getActivityId(widgetId)
            if (activityId == null) {
                setPlaceholder(ctx, views, "\u30BF\u30C3\u30D7\u3057\u3066\u8A2D\u5B9A")
                mgr.updateAppWidget(widgetId, views)
                return
            }
            val db = WidgetDbHelper(ctx)
            val activity = db.getActivityById(activityId)
            if (activity == null) {
                setPlaceholder(ctx, views, "\u524A\u9664\u3055\u308C\u305F\u6D3B\u52D5")
                mgr.updateAppWidget(widgetId, views)
                return
            }
            val kinds = db.getActivityKinds(activityId)
            views.setTextViewText(resId(ctx, "binary_activity_name"), "${activity.emoji} ${activity.name}")
            if (kinds.size >= 2) {
                views.setTextViewText(resId(ctx, "binary_btn_kind1"), kinds[0].name)
                views.setTextViewText(resId(ctx, "binary_btn_kind2"), kinds[1].name)
                views.setOnClickPendingIntent(
                    resId(ctx, "binary_btn_kind1"),
                    kindPi(ctx, widgetId, kinds[0].id, 0),
                )
                views.setOnClickPendingIntent(
                    resId(ctx, "binary_btn_kind2"),
                    kindPi(ctx, widgetId, kinds[1].id, 1),
                )
            }
            mgr.updateAppWidget(widgetId, views)
        }

        private fun setPlaceholder(ctx: Context, views: RemoteViews, label: String) {
            views.setTextViewText(resId(ctx, "binary_activity_name"), label)
            views.setTextViewText(resId(ctx, "binary_btn_kind1"), "-")
            views.setTextViewText(resId(ctx, "binary_btn_kind2"), "-")
        }

        private fun resId(ctx: Context, name: String, type: String = "id"): Int {
            val id = ctx.resources.getIdentifier(name, type, ctx.packageName)
            if (id == 0) Log.e("BinaryWidget", "Resource not found: $name")
            return id
        }

        private fun kindPi(ctx: Context, widgetId: Int, kindId: String, idx: Int): PendingIntent {
            val intent = Intent(ctx, BinaryWidgetProvider::class.java).apply {
                action = ACTION_KIND
                putExtra(EXTRA_WIDGET_ID, widgetId)
                putExtra(EXTRA_KIND_ID, kindId)
            }
            return PendingIntent.getBroadcast(ctx, widgetId * 10 + idx, intent, PI_FLAGS)
        }
    }

    override fun onUpdate(ctx: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { updateWidget(ctx, mgr, it) }
    }

    override fun onReceive(ctx: Context, intent: Intent) {
        super.onReceive(ctx, intent)
        if (intent.action != ACTION_KIND) return
        val wId = intent.getIntExtra(EXTRA_WIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        if (wId == AppWidgetManager.INVALID_APPWIDGET_ID) return
        if (!WidgetPlanHelper.isWidgetAllowed(ctx, wId)) return
        val kindId = intent.getStringExtra(EXTRA_KIND_ID) ?: return

        val prefs = TimerPreferences(ctx)
        val activityId = prefs.getActivityId(wId) ?: return
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        WidgetLogHelper(ctx).insertLog(
            activityId = activityId, activityKindId = kindId,
            quantity = 1.0, memo = "", date = today,
        )
        updateWidget(ctx, AppWidgetManager.getInstance(ctx), wId)
    }

    override fun onDeleted(ctx: Context, ids: IntArray) {
        val prefs = TimerPreferences(ctx)
        ids.forEach { prefs.removeWidget(it) }
    }
}
