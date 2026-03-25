package com.actiko.widget

import android.app.Activity
import android.os.Bundle
import android.util.Log
import android.widget.Toast

class VoiceRecordActivity : Activity() {
    companion object {
        private const val TAG = "VoiceRecord"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val speechText = intent?.data?.getQueryParameter("speechText")
            ?: intent?.getStringExtra("speechText")

        if (speechText.isNullOrBlank()) {
            showToast("音声テキストが取得できませんでした")
            finish()
            return
        }

        Log.d(TAG, "Received speechText (${speechText.length} chars)")

        Thread {
            try {
                val result = VoiceRecordApi.recordFromSpeech(
                    context = this,
                    speechText = speechText
                )
                val message = if (result.kindName != null) {
                    "「${result.activityName} / ${result.kindName}」を記録しました"
                } else {
                    "「${result.activityName}」を記録しました"
                }
                runOnUiThread {
                    showToast(message)
                    finish()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to record", e)
                runOnUiThread {
                    showToast("記録に失敗しました")
                    finish()
                }
            }
        }.start()
    }

    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
}
