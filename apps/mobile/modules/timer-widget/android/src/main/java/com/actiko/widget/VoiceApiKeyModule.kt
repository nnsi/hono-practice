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

        Function("saveVoiceCredentials") { apiKey: String, backendUrl: String ->
            val context = appContext.reactContext
                ?: throw IllegalStateException("React context is not available")
            VoiceApiKeyHelper.saveApiKey(context, apiKey)
            VoiceApiKeyHelper.saveBackendUrl(context, backendUrl)
        }
    }
}
