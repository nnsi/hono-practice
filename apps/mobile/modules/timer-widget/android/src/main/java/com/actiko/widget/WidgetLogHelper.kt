package com.actiko.widget

import android.content.ContentValues
import android.content.Context
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class WidgetLogHelper(private val context: Context) {
    private val dbHelper = WidgetDbHelper(context)

    fun getActivityLogCountForToday(activityId: String, today: String): Int {
        val db = dbHelper.openDatabase() ?: return 0
        return try {
            val cursor = db.rawQuery(
                "SELECT COALESCE(SUM(quantity), 0) FROM activity_logs WHERE activity_id = ? AND date = ? AND deleted_at IS NULL",
                arrayOf(activityId, today),
            )
            cursor.use { if (it.moveToFirst()) it.getInt(0) else 0 }
        } finally {
            db.close()
        }
    }

    fun hasActivityLogForToday(activityId: String, today: String): Boolean {
        val db = dbHelper.openDatabase() ?: return false
        return try {
            val cursor = db.rawQuery(
                "SELECT COUNT(*) FROM activity_logs WHERE activity_id = ? AND date = ? AND deleted_at IS NULL",
                arrayOf(activityId, today),
            )
            cursor.use { it.moveToFirst() && it.getInt(0) > 0 }
        } finally {
            db.close()
        }
    }

    fun softDeleteTodayLog(activityId: String, today: String) {
        val db = dbHelper.openDatabase() ?: return
        try {
            val utcFmt = SimpleDateFormat(
                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US,
            ).apply { timeZone = TimeZone.getTimeZone("UTC") }
            val now = utcFmt.format(Date())
            db.execSQL(
                "UPDATE activity_logs SET deleted_at = ?, sync_status = 'pending', updated_at = ? WHERE id = (SELECT id FROM activity_logs WHERE activity_id = ? AND date = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1)",
                arrayOf(now, now, activityId, today),
            )
        } finally {
            db.close()
        }
    }

    fun insertLog(
        activityId: String,
        activityKindId: String?,
        quantity: Double,
        memo: String,
        date: String,
    ) {
        val db = dbHelper.openDatabase() ?: return
        try {
            val utcFmt = SimpleDateFormat(
                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US,
            ).apply { timeZone = TimeZone.getTimeZone("UTC") }
            val now = utcFmt.format(Date())
            val values = ContentValues().apply {
                put("id", UuidV7.generate())
                put("activity_id", activityId)
                put("activity_kind_id", activityKindId)
                put("quantity", quantity)
                put("memo", memo)
                put("date", date)
                putNull("time")
                putNull("task_id")
                put("sync_status", "pending")
                putNull("deleted_at")
                put("created_at", now)
                put("updated_at", now)
            }
            db.insert("activity_logs", null, values)
        } finally {
            db.close()
        }
    }
}
