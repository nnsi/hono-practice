package com.actiko.widget

import android.content.ComponentName
import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class WidgetIntentSecurityTest {
    private val context = ApplicationProvider.getApplicationContext<android.content.Context>()

    @Test
    fun voiceRecordActivityIsNotExported() {
        val info = context.packageManager.getActivityInfo(
            ComponentName(context, VoiceRecordActivity::class.java),
            0,
        )
        assertFalse(info.exported)
    }

    @Test
    fun explicitCustomBroadcastWithoutPendingIntentTokenIsRejected() {
        val intent = Intent(context, TimerWidgetProvider::class.java).apply {
            action = TimerWidgetProvider.ACTION_START
            putExtra(TimerWidgetProvider.EXTRA_WIDGET_ID, 1234)
        }
        assertFalse(
            WidgetSecurity.isAuthorizedAction(
                context,
                intent,
                1234,
                TimerWidgetProvider::class.java,
            ),
        )
    }
}
