package com.actiko.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.ListView
import android.widget.TextView
import android.widget.Toast

class CounterConfigActivity : Activity() {
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

        if (!WidgetPlanHelper.isWidgetAllowed(this, appWidgetId)) {
            Toast.makeText(this, "Pro\u306B\u30A2\u30C3\u30D7\u30B0\u30EC\u30FC\u30C9\u3057\u3066\u30A6\u30A3\u30B8\u30A7\u30C3\u30C8\u3092\u8FFD\u52A0", Toast.LENGTH_LONG).show()
            finish()
            return
        }

        val db = WidgetDbHelper(this)
        val activities = db.getActivitiesByRecordingMode("counter")
        if (activities.isEmpty()) {
            Toast.makeText(this, "\u30AB\u30A6\u30F3\u30BF\u30FC\u6D3B\u52D5\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093", Toast.LENGTH_LONG).show()
            finish()
            return
        }

        showActivityList(activities)
    }

    private fun showActivityList(activities: List<ActivityRow>) {
        val layoutId = resources.getIdentifier("activity_config", "layout", packageName)
        setContentView(layoutId)
        val listView = findViewById<ListView>(resources.getIdentifier("activity_list", "id", packageName))
        val itemLayoutId = resources.getIdentifier("item_activity", "layout", packageName)
        val itemTextId = resources.getIdentifier("activity_item_text", "id", packageName)
        val names = activities.map { "${it.emoji} ${it.name}" }

        listView.adapter = object : ArrayAdapter<String>(this, itemLayoutId, itemTextId, names) {
            override fun getView(pos: Int, cv: View?, parent: ViewGroup): View {
                return super.getView(pos, cv, parent).also {
                    it.findViewById<TextView>(itemTextId)?.text = names[pos]
                }
            }
        }
        listView.setOnItemClickListener { _, _, pos, _ ->
            val selected = activities[pos]
            val prefs = TimerPreferences(this)
            prefs.saveWidgetConfig(appWidgetId, selected.id, "counter")
            CounterWidgetProvider.updateWidget(this, AppWidgetManager.getInstance(this), appWidgetId)
            setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId))
            finish()
        }
    }
}
