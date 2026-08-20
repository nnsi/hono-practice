package com.actiko.widget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VoiceApiKeyModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("VoiceApiKeyBridge")

        Function("hasVoiceApiKey") {
            val context = appContext.reactContext
                ?: return@Function false
            VoiceApiKeyHelper.getPrefs(context).apiKey != null
        }

        Function("getVoiceCredentialOwner") {
            val context = appContext.reactContext
                ?: return@Function null
            VoiceApiKeyHelper.getPrefs(context).ownerUserId
        }

        Function("saveVoiceCredentials") { apiKey: String, backendUrl: String, ownerUserId: String ->
            val context = appContext.reactContext
                ?: throw IllegalStateException("React context is not available")
            VoiceApiKeyHelper.saveCredentials(context, apiKey, backendUrl, ownerUserId)
        }

        Function("clearVoiceCredentials") {
            val context = appContext.reactContext
                ?: return@Function null
            VoiceApiKeyHelper.clear(context)
            null
        }
    }
}
