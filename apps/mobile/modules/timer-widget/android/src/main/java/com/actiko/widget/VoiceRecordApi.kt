package com.actiko.widget

import android.content.Context
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

object VoiceRecordApi {
    data class RecordResult(val activityName: String, val kindName: String?)

    fun recordFromSpeech(context: Context, speechText: String): RecordResult {
        val prefs = VoiceApiKeyHelper.getPrefs(context)
        val apiKey = prefs.apiKey
            ?: throw IllegalStateException("API key not configured")
        val backendUrl = prefs.backendUrl
            ?: throw IllegalStateException("Backend URL not configured")

        val fullUrl = "$backendUrl/api/v1/ai/activity-logs/from-speech"
        val url = URL(fullUrl)
        require(url.protocol == "https") { "Backend URL must use HTTPS" }
        val connection = url.openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Authorization", "Bearer $apiKey")
            connection.doOutput = true
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000

            val body = JSONObject().put("speechText", speechText).toString()
            connection.outputStream.use { it.write(body.toByteArray()) }

            if (connection.responseCode != 200) {
                val errorBody = try {
                    connection.errorStream?.bufferedReader()?.readText() ?: ""
                } catch (_: Exception) { "" }
                throw IOException("Server returned ${connection.responseCode}: $errorBody")
            }

            val responseText = connection.inputStream.bufferedReader().readText()
            val response = JSONObject(responseText)
            val interpretation = response.getJSONObject("interpretation")

            return RecordResult(
                activityName = interpretation.getString("detectedActivityName"),
                kindName = interpretation.optString("detectedKindName", null)
            )
        } finally {
            connection.disconnect()
        }
    }
}
