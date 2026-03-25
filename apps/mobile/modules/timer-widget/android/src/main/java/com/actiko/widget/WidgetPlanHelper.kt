package com.actiko.widget

import android.content.Context

object WidgetPlanHelper {
    private const val FREE_WIDGET_LIMIT = 1

    fun canAddWidget(context: Context): Boolean {
        val plan = WidgetDbHelper(context).getPlan()
        if (plan == "premium") return true
        val currentCount = TimerPreferences(context).getAllWidgetIds().size
        return currentCount < FREE_WIDGET_LIMIT
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
        val plan = WidgetDbHelper(context).getPlan()
        if (plan == "premium") return true
        val allIds = TimerPreferences(context).getAllWidgetIds().sorted()
        // Free plan: only the first N widgets (by ID order) are allowed
        return allIds.take(FREE_WIDGET_LIMIT).contains(widgetId)
    }
}
