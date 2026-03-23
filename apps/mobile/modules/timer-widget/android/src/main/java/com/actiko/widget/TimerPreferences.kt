package com.actiko.widget

import android.content.Context
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class TimerPreferences(context: Context) {
    private val prefs = context.getSharedPreferences("actiko_timer_widget", Context.MODE_PRIVATE)

    private fun key(widgetId: Int, field: String) = "widget_${widgetId}_$field"

    fun saveWidgetConfig(widgetId: Int, activityId: String, recordingMode: String) {
        prefs.edit()
            .putString(key(widgetId, "activityId"), activityId)
            .putString(key(widgetId, "recordingMode"), recordingMode)
            .putStringSet("all_widget_ids", getAllWidgetIds().map { it.toString() }.toMutableSet().apply { add(widgetId.toString()) })
            .apply()
    }

    fun getActivityId(widgetId: Int): String? = prefs.getString(key(widgetId, "activityId"), null)

    fun getRecordingMode(widgetId: Int): String? = prefs.getString(key(widgetId, "recordingMode"), null)

    fun startTimer(widgetId: Int) {
        val editor = prefs.edit()
        editor.putBoolean(key(widgetId, "isRunning"), true)
        editor.putLong(key(widgetId, "startTimeMillis"), System.currentTimeMillis())
        if (getStartDateIso(widgetId) == null) {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            sdf.timeZone = TimeZone.getTimeZone("UTC")
            editor.putString(key(widgetId, "startDateIso"), sdf.format(Date()))
        }
        editor.apply()
    }

    fun stopTimer(widgetId: Int) {
        val startTimeMillis = prefs.getLong(key(widgetId, "startTimeMillis"), 0L)
        val elapsed = if (startTimeMillis > 0) System.currentTimeMillis() - startTimeMillis else 0L
        val accumulated = prefs.getLong(key(widgetId, "accumulatedMillis"), 0L)
        prefs.edit()
            .putLong(key(widgetId, "accumulatedMillis"), accumulated + elapsed)
            .putBoolean(key(widgetId, "isRunning"), false)
            .putLong(key(widgetId, "startTimeMillis"), 0L)
            .apply()
    }

    fun resetTimer(widgetId: Int) {
        prefs.edit()
            .putLong(key(widgetId, "accumulatedMillis"), 0L)
            .remove(key(widgetId, "startDateIso"))
            .putBoolean(key(widgetId, "isRunning"), false)
            .putLong(key(widgetId, "startTimeMillis"), 0L)
            .apply()
    }

    fun getElapsedMillis(widgetId: Int): Long {
        val accumulated = prefs.getLong(key(widgetId, "accumulatedMillis"), 0L)
        if (!isRunning(widgetId)) return accumulated
        val startTimeMillis = prefs.getLong(key(widgetId, "startTimeMillis"), 0L)
        val current = if (startTimeMillis > 0) System.currentTimeMillis() - startTimeMillis else 0L
        return accumulated + current
    }

    fun getStartDateIso(widgetId: Int): String? = prefs.getString(key(widgetId, "startDateIso"), null)

    fun isRunning(widgetId: Int): Boolean = prefs.getBoolean(key(widgetId, "isRunning"), false)

    fun removeWidget(widgetId: Int) {
        val editor = prefs.edit()
        listOf("activityId", "recordingMode", "isRunning", "startTimeMillis", "accumulatedMillis", "startDateIso")
            .forEach { editor.remove(key(widgetId, it)) }
        val ids = getAllWidgetIds().toMutableSet()
        ids.remove(widgetId)
        editor.putStringSet("all_widget_ids", ids.map { it.toString() }.toSet())
        editor.apply()
    }

    fun getAllWidgetIds(): Set<Int> {
        return prefs.getStringSet("all_widget_ids", emptySet())
            ?.mapNotNull { it.toIntOrNull() }
            ?.toSet()
            ?: emptySet()
    }
}
