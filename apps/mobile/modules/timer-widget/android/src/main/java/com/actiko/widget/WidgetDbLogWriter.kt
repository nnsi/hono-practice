package com.actiko.widget

import android.content.ContentValues

fun WidgetDbHelper.insertActivityLog(
    id: String,
    activityId: String,
    activityKindId: String?,
    quantity: Double,
    memo: String,
    date: String,
    syncStatus: String,
    createdAt: String,
    updatedAt: String,
): Result<Unit> = runCatching {
    val db = openDatabase() ?: error("Widget database is unavailable")
    try {
        val values = ContentValues().apply {
            put("id", id)
            put("activity_id", activityId)
            put("activity_kind_id", activityKindId)
            put("quantity", quantity)
            put("memo", memo)
            put("date", date)
            putNull("time")
            putNull("task_id")
            put("sync_status", syncStatus)
            putNull("deleted_at")
            put("created_at", createdAt)
            put("updated_at", updatedAt)
        }
        check(db.insertOrThrow("activity_logs", null, values) != -1L) {
            "Widget activity log insert returned -1"
        }
    } finally {
        db.close()
    }
}
