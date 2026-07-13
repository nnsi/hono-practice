package com.actiko.widget

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
    val recordingModeConfig: String?,
)

data class KindRow(
    val id: String,
    val name: String,
    val color: String?,
)

class WidgetDbHelper(private val context: Context) {
    companion object {
        const val SUPPORTED_SCHEMA_VERSION = 12

        fun parseCounterSteps(configJson: String?): List<Int> =
            WidgetDbConfigParser.parseCounterSteps(configJson)
    }

    private val dbPath: String
        get() = File(context.filesDir, "SQLite/actiko.db").absolutePath

    internal fun openDatabase(): SQLiteDatabase? {
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
            it.execSQL("PRAGMA busy_timeout = 5000")
        }
    }

}
