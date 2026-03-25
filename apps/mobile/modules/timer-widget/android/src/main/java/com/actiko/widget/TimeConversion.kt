package com.actiko.widget

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object TimeConversion {
    enum class TimeUnitType { HOUR, MINUTE, SECOND }

    fun getTimeUnitType(quantityUnit: String?): TimeUnitType? {
        if (quantityUnit == null) return null
        val lower = quantityUnit.lowercase()
        return when {
            "\u6642" in lower || "hour" in lower -> TimeUnitType.HOUR
            "\u5206" in lower || "min" in lower -> TimeUnitType.MINUTE
            "\u79D2" in lower || "sec" in lower -> TimeUnitType.SECOND
            else -> null
        }
    }

    fun convertSecondsToUnit(seconds: Long, unitType: TimeUnitType?): Double = when (unitType) {
        TimeUnitType.HOUR -> Math.round(seconds / 3600.0 * 100) / 100.0
        TimeUnitType.MINUTE -> Math.round(seconds / 60.0 * 10) / 10.0
        TimeUnitType.SECOND -> seconds.toDouble()
        null -> seconds.toDouble()
    }

    fun generateTimeMemo(startTime: Date, endTime: Date): String {
        val fmt = SimpleDateFormat("HH:mm", Locale.getDefault())
        return "${fmt.format(startTime)} - ${fmt.format(endTime)}"
    }

    fun formatElapsedTime(elapsedMs: Long): String {
        val totalSeconds = elapsedMs / 1000
        val hours = totalSeconds / 3600
        val minutes = (totalSeconds % 3600) / 60
        val seconds = totalSeconds % 60
        return if (hours > 0) String.format("%d:%02d:%02d", hours, minutes, seconds)
        else String.format("%02d:%02d", minutes, seconds)
    }
}
