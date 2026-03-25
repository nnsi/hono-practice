package com.actiko.widget

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import java.io.File

data class ActivityRow(
    val id: String,
    val name: String,
    val emoji: String,
    val quantityUnit: String,
    val recordingMode: String,
)

data class KindRow(
    val id: String,
    val name: String,
    val color: String?,
)

class WidgetDbHelper(private val context: Context) {
    private val dbPath: String
        get() = File(context.filesDir, "SQLite/actiko.db").absolutePath

    fun debugInfo(): String {
        val file = File(dbPath)
        if (!file.exists()) return "DB not found at: $dbPath"
        val db = openDatabase() ?: return "DB failed to open"
        return try {
            val authCursor = db.rawQuery("SELECT user_id FROM auth_state WHERE id = 'current'", null)
            val userId = authCursor.use { if (it.moveToFirst()) it.getString(0) else null }
            val countCursor = db.rawQuery("SELECT count(*), recording_mode FROM activities WHERE deleted_at IS NULL GROUP BY recording_mode", null)
            val modes = mutableListOf<String>()
            countCursor.use { while (it.moveToNext()) modes.add("${it.getString(1)}=${it.getInt(0)}") }
            "DB OK | auth_user=$userId | modes: ${modes.joinToString()}"
        } finally {
            db.close()
        }
    }

    private fun openDatabase(): SQLiteDatabase? {
        val file = File(dbPath)
        if (!file.exists()) {
            Log.e("WidgetDb", "DB not found at: $dbPath")
            return null
        }
        return SQLiteDatabase.openDatabase(
            dbPath,
            null,
            SQLiteDatabase.OPEN_READWRITE,
        ).also {
            it.enableWriteAheadLogging()
        }
    }

    fun getTimerActivities(): List<ActivityRow> {
        val db = openDatabase() ?: return emptyList()
        return try {
            val cursor = db.rawQuery(
                "SELECT id, name, emoji, quantity_unit, recording_mode FROM activities WHERE recording_mode = ? AND deleted_at IS NULL AND user_id = (SELECT user_id FROM auth_state WHERE id = 'current') ORDER BY order_index",
                arrayOf("timer"),
            )
            val results = mutableListOf<ActivityRow>()
            cursor.use {
                while (it.moveToNext()) {
                    results.add(
                        ActivityRow(
                            id = it.getString(0),
                            name = it.getString(1),
                            emoji = it.getString(2) ?: "",
                            quantityUnit = it.getString(3) ?: "",
                            recordingMode = it.getString(4) ?: "timer",
                        ),
                    )
                }
            }
            results
        } finally {
            db.close()
        }
    }

    fun getActivityById(id: String): ActivityRow? {
        val db = openDatabase() ?: return null
        return try {
            val cursor = db.rawQuery(
                "SELECT id, name, emoji, quantity_unit, recording_mode FROM activities WHERE id = ? AND deleted_at IS NULL AND user_id = (SELECT user_id FROM auth_state WHERE id = 'current')",
                arrayOf(id),
            )
            cursor.use {
                if (it.moveToFirst()) {
                    ActivityRow(
                        id = it.getString(0),
                        name = it.getString(1),
                        emoji = it.getString(2) ?: "",
                        quantityUnit = it.getString(3) ?: "",
                        recordingMode = it.getString(4) ?: "timer",
                    )
                } else null
            }
        } finally {
            db.close()
        }
    }

    fun getActivityKinds(activityId: String): List<KindRow> {
        val db = openDatabase() ?: return emptyList()
        return try {
            val cursor = db.rawQuery(
                "SELECT id, name, color FROM activity_kinds WHERE activity_id = ? AND deleted_at IS NULL ORDER BY order_index",
                arrayOf(activityId),
            )
            val results = mutableListOf<KindRow>()
            cursor.use {
                while (it.moveToNext()) {
                    results.add(
                        KindRow(
                            id = it.getString(0),
                            name = it.getString(1),
                            color = it.getString(2),
                        ),
                    )
                }
            }
            results
        } finally {
            db.close()
        }
    }

    fun getPlan(): String {
        val db = openDatabase() ?: return "free"
        return try {
            val cursor = db.rawQuery(
                "SELECT plan FROM auth_state WHERE id = 'current'",
                null,
            )
            cursor.use {
                if (it.moveToFirst()) it.getString(0) ?: "free" else "free"
            }
        } finally {
            db.close()
        }
    }

    fun insertActivityLog(
        id: String,
        activityId: String,
        activityKindId: String?,
        quantity: Double,
        memo: String,
        date: String,
        syncStatus: String,
        createdAt: String,
        updatedAt: String,
    ) {
        val db = openDatabase() ?: return
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
            db.insert("activity_logs", null, values)
        } finally {
            db.close()
        }
    }
}
