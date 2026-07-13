package com.actiko.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

object WidgetSecurity {
    const val EXTRA_ACTION_TOKEN = "com.actiko.widget.EXTRA_ACTION_TOKEN"

    fun isRegisteredWidget(
        context: Context,
        widgetId: Int,
        providerClass: Class<out AppWidgetProvider>,
    ): Boolean {
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return false
        return runCatching {
            AppWidgetManager.getInstance(context)
                .getAppWidgetIds(ComponentName(context, providerClass))
                .contains(widgetId)
        }.getOrDefault(false)
    }

    /**
     * Custom provider actions are accepted only when delivered through an
     * immutable PendingIntent created by this app. An explicit broadcast from
     * another app cannot know the per-widget random token.
     */
    fun isAuthorizedAction(
        context: Context,
        intent: Intent,
        widgetId: Int,
        providerClass: Class<out AppWidgetProvider>,
    ): Boolean {
        if (!isRegisteredWidget(context, widgetId, providerClass)) return false
        val expected = TimerPreferences(context).getActionToken(widgetId) ?: return false
        val actual = intent.getStringExtra(EXTRA_ACTION_TOKEN) ?: return false
        return MessageDigest.isEqual(
            expected.toByteArray(StandardCharsets.UTF_8),
            actual.toByteArray(StandardCharsets.UTF_8),
        )
    }
}
