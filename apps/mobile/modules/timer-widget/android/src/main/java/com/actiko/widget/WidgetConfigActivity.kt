package com.actiko.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.ListView
import android.widget.TextView
import android.util.Log
import android.widget.Toast

class WidgetConfigActivity : Activity() {
    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)

        appWidgetId = intent?.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID,
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        val dbHelper = WidgetDbHelper(this)
        val activities = dbHelper.getTimerActivities()

        if (activities.isEmpty()) {
            val debug = dbHelper.debugInfo()
            Log.e("WidgetConfig", "No activities found: $debug")
            Toast.makeText(this, "タイマー活動が見つかりません: $debug", Toast.LENGTH_LONG).show()
            finish()
            return
        }

        val layoutId = resources.getIdentifier("activity_config", "layout", packageName)
        setContentView(layoutId)

        val listViewId = resources.getIdentifier("activity_list", "id", packageName)
        val listView = findViewById<ListView>(listViewId)

        val itemLayoutId = resources.getIdentifier("item_activity", "layout", packageName)
        val itemTextId = resources.getIdentifier("activity_item_text", "id", packageName)

        val displayNames = activities.map { "${it.emoji} ${it.name}" }

        val adapter = object : ArrayAdapter<String>(this, itemLayoutId, itemTextId, displayNames) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                return super.getView(position, convertView, parent).also { view ->
                    view.findViewById<TextView>(itemTextId)?.text = displayNames[position]
                }
            }
        }
        listView.adapter = adapter

        listView.setOnItemClickListener { _, _, position, _ ->
            val selected = activities[position]
            val prefs = TimerPreferences(this)
            prefs.saveWidgetConfig(appWidgetId, selected.id, selected.recordingMode)

            val appWidgetManager = AppWidgetManager.getInstance(this)
            TimerWidgetProvider.updateWidget(this, appWidgetManager, appWidgetId)

            val resultValue = Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            setResult(RESULT_OK, resultValue)
            finish()
        }
    }
}
