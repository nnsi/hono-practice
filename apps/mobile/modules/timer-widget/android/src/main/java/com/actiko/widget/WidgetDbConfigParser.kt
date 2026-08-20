package com.actiko.widget

import org.json.JSONObject

internal object WidgetDbConfigParser {
    private const val MAX_COUNTER_STEP = 1_000_000

    fun parseCounterSteps(configJson: String?): List<Int> {
        if (configJson == null) return listOf(1)
        return runCatching {
            val values = JSONObject(configJson).optJSONArray("steps") ?: return listOf(1)
            (0 until values.length()).mapNotNull {
                values.optInt(it, 0).takeIf { step -> step in 1..MAX_COUNTER_STEP }
            }.distinct().take(3).ifEmpty { listOf(1) }
        }.getOrDefault(listOf(1))
    }
}
