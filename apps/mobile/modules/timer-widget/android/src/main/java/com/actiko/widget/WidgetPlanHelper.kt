package com.actiko.widget

import android.content.Context

object WidgetPlanHelper {
    private const val FREE_WIDGET_LIMIT = 1

    fun canAddWidget(context: Context): Boolean {
        return canAddWidget(
            isPro = WidgetDbHelper(context).getPlan() == "premium",
            configuredWidgetIds = TimerPreferences(context).getAllWidgetIds(),
        )
    }

    internal fun canAddWidget(isPro: Boolean, configuredWidgetIds: Set<Int>): Boolean {
        return isPro || configuredWidgetIds.size < FREE_WIDGET_LIMIT
    }

    /**
     * Admission check used by configuration activities. A newly allocated ID is
     * not in SharedPreferences yet, so it must consume the next free-plan slot
     * instead of being checked as an already configured widget.
     */
    fun canConfigureWidget(context: Context, widgetId: Int): Boolean {
        val configuredIds = TimerPreferences(context).getAllWidgetIds()
        val isPro = WidgetDbHelper(context).getPlan() == "premium"
        return canConfigureWidget(isPro, configuredIds, widgetId)
    }

    internal fun canConfigureWidget(
        isPro: Boolean,
        configuredWidgetIds: Set<Int>,
        widgetId: Int,
    ): Boolean {
        return if (widgetId in configuredWidgetIds) {
            isWidgetAllowed(isPro, configuredWidgetIds, widgetId)
        } else {
            canAddWidget(isPro, configuredWidgetIds)
        }
    }

    fun isPro(context: Context): Boolean {
        return WidgetDbHelper(context).getPlan() == "premium"
    }

    /**
     * Check if an existing widget is allowed to operate.
     * Free plan: only the oldest widget (lowest ID) is allowed.
     * Pro→Free downgrade: widgets beyond the limit show upgrade prompt.
     */
    fun isWidgetAllowed(context: Context, widgetId: Int): Boolean {
        return isWidgetAllowed(
            isPro = WidgetDbHelper(context).getPlan() == "premium",
            configuredWidgetIds = TimerPreferences(context).getAllWidgetIds(),
            widgetId = widgetId,
        )
    }

    internal fun isWidgetAllowed(
        isPro: Boolean,
        configuredWidgetIds: Set<Int>,
        widgetId: Int,
    ): Boolean {
        if (isPro) return widgetId in configuredWidgetIds
        // Pro -> Free: retain exactly the oldest allocated widget (lowest ID).
        return configuredWidgetIds.sorted().take(FREE_WIDGET_LIMIT).contains(widgetId)
    }
}
