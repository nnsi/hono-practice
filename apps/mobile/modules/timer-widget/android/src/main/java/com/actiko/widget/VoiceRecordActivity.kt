package com.actiko.widget

import android.app.Activity
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class VoiceRecordActivity : Activity() {
    companion object {
        private const val TAG = "VoiceRecord"
    }

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

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

        scope.launch {
            try {
                val result = withContext(Dispatchers.IO) {
                    VoiceRecordApi.recordFromSpeech(
                        context = this@VoiceRecordActivity,
                        speechText = speechText
                    )
                }
                val message = if (result.kindName != null) {
                    "「${result.activityName} / ${result.kindName}」を記録しました"
                } else {
                    "「${result.activityName}」を記録しました"
                }
                showToast(message)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to record", e)
                showToast("記録に失敗しました")
            } finally {
                finish()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }

    private fun showToast(message: String) {
        if (!isFinishing) {
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
        }
    }
}
