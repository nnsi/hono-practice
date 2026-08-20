import { requireNativeModule } from "expo";
import { Platform } from "react-native";

/**
 * Android: Expo Module経由でEncryptedSharedPreferencesに保存
 * iOS: expo-secure-store + App Group Keychainに保存
 */
export async function saveVoiceCredentials(
  apiKey: string,
  backendUrl: string,
  userId: string,
): Promise<void> {
  if (Platform.OS === "android") {
    const bridge = requireNativeModule("VoiceApiKeyBridge");
    bridge.saveVoiceCredentials(apiKey, backendUrl, userId);
  } else if (Platform.OS === "ios") {
    const { saveVoiceApiKey, saveVoiceBackendUrl, saveVoiceCredentialOwner } =
      await import("./voiceApiKey");
    await saveVoiceApiKey(apiKey);
    await saveVoiceCredentialOwner(userId);
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

export async function getVoiceCredentialOwner(): Promise<string | null> {
  if (Platform.OS === "android") {
    const bridge = requireNativeModule("VoiceApiKeyBridge");
    const owner = bridge.getVoiceCredentialOwner();
    return typeof owner === "string" ? owner : null;
  }
  if (Platform.OS === "ios") {
    const voiceApiKey = await import("./voiceApiKey");
    return voiceApiKey.getVoiceCredentialOwner();
  }
  return null;
}

export async function clearVoiceCredentials(): Promise<void> {
  if (Platform.OS === "android") {
    const bridge = requireNativeModule("VoiceApiKeyBridge");
    bridge.clearVoiceCredentials();
    return;
  }
  if (Platform.OS === "ios") {
    const voiceApiKey = await import("./voiceApiKey");
    await voiceApiKey.clearVoiceCredentials();
  }
}
