package com.actiko.widget

import android.util.Log

fun WidgetDbHelper.getTimerActivities(): List<ActivityRow> =
    getActivitiesByRecordingMode("timer")

fun WidgetDbHelper.getActivityById(id: String): ActivityRow? {
    val db = openDatabase() ?: return null
    return try {
        db.rawQuery(
            "SELECT id, name, emoji, quantity_unit, recording_mode, recording_mode_config FROM activities WHERE id = ? AND deleted_at IS NULL AND user_id = (SELECT user_id FROM auth_state WHERE id = 'current')",
            arrayOf(id),
        ).use {
            if (it.moveToFirst()) {
                ActivityRow(
                    id = it.getString(0),
                    name = it.getString(1),
                    emoji = it.getString(2) ?: "",
                    quantityUnit = it.getString(3) ?: "",
                    recordingMode = it.getString(4) ?: "timer",
                    recordingModeConfig = it.getString(5),
                )
            } else null
        }
    } finally {
        db.close()
    }
}

fun WidgetDbHelper.getActivityKinds(activityId: String): List<KindRow> {
    val db = openDatabase() ?: return emptyList()
    return try {
        db.rawQuery(
            "SELECT id, name, color FROM activity_kinds WHERE activity_id = ? AND deleted_at IS NULL ORDER BY order_index",
            arrayOf(activityId),
        ).use { cursor ->
            buildList {
                while (cursor.moveToNext()) {
                    add(KindRow(cursor.getString(0), cursor.getString(1), cursor.getString(2)))
                }
            }
        }
    } finally {
        db.close()
    }
}

fun WidgetDbHelper.isKindOwnedByActivity(activityId: String, kindId: String): Boolean {
    val db = openDatabase() ?: return false
    return runCatching {
        db.rawQuery(
            "SELECT COUNT(*) FROM activity_kinds WHERE id = ? AND activity_id = ? AND deleted_at IS NULL",
            arrayOf(kindId, activityId),
        ).use { it.moveToFirst() && it.getInt(0) == 1 }
    }.onFailure {
        Log.e("WidgetDb", "Failed to validate activity kind ownership", it)
    }.getOrDefault(false).also {
        db.close()
    }
}

fun WidgetDbHelper.getActivitiesByRecordingMode(mode: String): List<ActivityRow> {
    val db = openDatabase() ?: return emptyList()
    return try {
        db.rawQuery(
            "SELECT id, name, emoji, quantity_unit, recording_mode, recording_mode_config FROM activities WHERE recording_mode = ? AND deleted_at IS NULL AND user_id = (SELECT user_id FROM auth_state WHERE id = 'current') ORDER BY order_index",
            arrayOf(mode),
        ).use { cursor ->
            buildList {
                while (cursor.moveToNext()) {
                    add(
                        ActivityRow(
                            cursor.getString(0), cursor.getString(1), cursor.getString(2) ?: "",
                            cursor.getString(3) ?: "", cursor.getString(4) ?: mode,
                            cursor.getString(5),
                        ),
                    )
                }
            }
        }
    } finally {
        db.close()
    }
}

fun WidgetDbHelper.getPlan(): String {
    val db = openDatabase() ?: return "free"
    return runCatching {
        db.rawQuery("SELECT plan FROM auth_state WHERE id = 'current'", null).use {
            if (it.moveToFirst()) it.getString(0) ?: "free" else "free"
        }
    }.onFailure {
        Log.w("WidgetDb", "getPlan failed (column may not exist yet): ${it.message}")
    }.getOrDefault("free").also {
        db.close()
    }
}
