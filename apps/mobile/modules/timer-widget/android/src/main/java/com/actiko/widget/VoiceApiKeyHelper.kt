package com.actiko.widget

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

object VoiceApiKeyHelper {
    private const val PREF_NAME = "actiko_voice_api"
    private const val KEY_API_KEY = "api_key"
    private const val KEY_BACKEND_URL = "backend_url"

    data class VoicePrefs(val apiKey: String?, val backendUrl: String?)

    private fun getEncryptedPrefs(context: Context): SharedPreferences {
        return EncryptedSharedPreferences.create(
            PREF_NAME,
            MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC),
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    fun saveApiKey(context: Context, apiKey: String) {
        getEncryptedPrefs(context).edit().putString(KEY_API_KEY, apiKey).apply()
    }

    fun saveBackendUrl(context: Context, url: String) {
        getEncryptedPrefs(context).edit().putString(KEY_BACKEND_URL, url).apply()
    }

    fun getPrefs(context: Context): VoicePrefs {
        val prefs = getEncryptedPrefs(context)
        return VoicePrefs(
            apiKey = prefs.getString(KEY_API_KEY, null),
            backendUrl = prefs.getString(KEY_BACKEND_URL, null)
        )
    }

    fun clear(context: Context) {
        getEncryptedPrefs(context).edit().clear().apply()
    }
}
