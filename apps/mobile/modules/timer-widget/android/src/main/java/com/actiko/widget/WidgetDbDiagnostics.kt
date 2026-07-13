package com.actiko.widget

fun WidgetDbHelper.debugInfo(): String {
    val db = openDatabase() ?: return "DB failed to open"
    return try {
        val userId = db.rawQuery(
            "SELECT user_id FROM auth_state WHERE id = 'current'",
            null,
        ).use { if (it.moveToFirst()) it.getString(0) else null }
        val modes = db.rawQuery(
            "SELECT count(*), recording_mode FROM activities WHERE deleted_at IS NULL GROUP BY recording_mode",
            null,
        ).use { cursor ->
            buildList {
                while (cursor.moveToNext()) add("${cursor.getString(1)}=${cursor.getInt(0)}")
            }
        }
        "DB OK | auth_user=$userId | modes: ${modes.joinToString()}"
    } finally {
        db.close()
    }
}
