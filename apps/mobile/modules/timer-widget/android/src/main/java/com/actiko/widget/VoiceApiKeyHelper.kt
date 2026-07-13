package com.actiko.widget

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object VoiceApiKeyHelper {
    private const val PREF_NAME = "actiko_voice_api"
    private const val KEY_API_KEY = "api_key"
    private const val KEY_BACKEND_URL = "backend_url"
    private const val KEY_OWNER_USER_ID = "owner_user_id"

    data class VoicePrefs(val apiKey: String?, val backendUrl: String?, val ownerUserId: String?)

    private fun getEncryptedPrefs(context: Context): SharedPreferences {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        return EncryptedSharedPreferences.create(
            context,
            PREF_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    fun saveCredentials(context: Context, apiKey: String, url: String, ownerUserId: String) {
        getEncryptedPrefs(context).edit()
            .putString(KEY_API_KEY, apiKey)
            .putString(KEY_BACKEND_URL, url)
            .putString(KEY_OWNER_USER_ID, ownerUserId)
            .apply()
    }

    fun getPrefs(context: Context): VoicePrefs {
        val prefs = getEncryptedPrefs(context)
        return VoicePrefs(
            apiKey = prefs.getString(KEY_API_KEY, null),
            backendUrl = prefs.getString(KEY_BACKEND_URL, null),
            ownerUserId = prefs.getString(KEY_OWNER_USER_ID, null)
        )
    }

    fun clear(context: Context) {
        getEncryptedPrefs(context).edit().clear().apply()
    }
}
