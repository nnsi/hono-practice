package com.actiko.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import android.widget.ListView
import android.widget.TextView

class KindSelectActivity : Activity() {
    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private var activityId: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        appWidgetId = intent?.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID,
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID
        activityId = intent?.getStringExtra("activityId") ?: ""

        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID || activityId.isEmpty()) {
            finish()
            return
        }

        val dbHelper = WidgetDbHelper(this)
        val kinds = dbHelper.getActivityKinds(activityId)

        if (kinds.isEmpty()) {
            saveLog(null)
            finish()
            return
        }

        val layoutId = resources.getIdentifier("kind_select", "layout", packageName)
        setContentView(layoutId)

        val listViewId = resources.getIdentifier("kind_list", "id", packageName)
        val listView = findViewById<ListView>(listViewId)

        val itemLayoutId = resources.getIdentifier("item_kind", "layout", packageName)
        val colorViewId = resources.getIdentifier("kind_color", "id", packageName)
        val nameViewId = resources.getIdentifier("kind_name", "id", packageName)

        listView.adapter = object : BaseAdapter() {
            override fun getCount() = kinds.size
            override fun getItem(position: Int) = kinds[position]
            override fun getItemId(position: Int) = position.toLong()

            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                val view = convertView ?: layoutInflater.inflate(itemLayoutId, parent, false)
                val kind = kinds[position]
                val colorView = view.findViewById<View>(colorViewId)
                val nameView = view.findViewById<TextView>(nameViewId)
                nameView.text = kind.name
                if (kind.color != null) {
                    try {
                        val drawable = GradientDrawable().apply {
                            shape = GradientDrawable.OVAL
                            setColor(Color.parseColor(kind.color))
                        }
                        colorView.background = drawable
                        colorView.visibility = View.VISIBLE
                    } catch (_: IllegalArgumentException) {
                        colorView.visibility = View.INVISIBLE
                    }
                } else {
                    colorView.visibility = View.INVISIBLE
                }
                return view
            }
        }

        listView.setOnItemClickListener { _, _, position, _ ->
            saveLog(kinds[position].id)
            finish()
        }
    }

    private fun saveLog(kindId: String?) {
        TimerWidgetProvider.saveLogDirect(this, appWidgetId, activityId, kindId)
        TimerPreferences(this).resetTimer(appWidgetId)
        TimerWidgetProvider.requestUpdate(this, appWidgetId)
    }
}
