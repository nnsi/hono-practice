import { requireNativeModule } from "expo";
import { Platform } from "react-native";

/**
 * Android: Expo Module経由でEncryptedSharedPreferencesに保存
 * iOS: expo-secure-store + App Group Keychainに保存
 */
export async function saveVoiceCredentials(
  apiKey: string,
  backendUrl: string,
): Promise<void> {
  if (Platform.OS === "android") {
    const bridge = requireNativeModule("VoiceApiKeyBridge");
    bridge.saveVoiceCredentials(apiKey, backendUrl);
  } else if (Platform.OS === "ios") {
    const { saveVoiceApiKey, saveVoiceBackendUrl } = await import(
      "./voiceApiKey"
    );
    await saveVoiceApiKey(apiKey);
    saveVoiceBackendUrl(backendUrl);
  }
}

/**
 * 既にVoice APIキーが保存済みかチェックする。
 */
export async function hasVoiceApiKey(): Promise<boolean> {
  if (Platform.OS === "android") {
    const bridge = requireNativeModule("VoiceApiKeyBridge");
    return bridge.hasVoiceApiKey() as boolean;
  } else if (Platform.OS === "ios") {
    const { getVoiceApiKey } = await import("./voiceApiKey");
    const key = await getVoiceApiKey();
    return key != null;
  }
  return false;
}
