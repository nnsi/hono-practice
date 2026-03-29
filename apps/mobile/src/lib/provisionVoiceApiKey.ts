import { Platform } from "react-native";

import { customFetch, getApiUrl } from "../utils/apiClient";
import { hasVoiceApiKey, saveVoiceCredentials } from "./voiceApiKeyBridge";

const API_URL = getApiUrl();

/**
 * Proユーザーのショートカット用APIキーを自動プロビジョニングする。
 * 既にキーが保存済みの場合はスキップ。
 * iOS: Keychain (App Group), Android: EncryptedSharedPreferences
 */
export async function provisionVoiceApiKey(): Promise<void> {
  if (Platform.OS === "web") return;

  const existing = await hasVoiceApiKey();
  if (existing) return;

  const res = await customFetch(`${API_URL}/users/api-keys`, {
    method: "POST",
    body: JSON.stringify({ name: "Voice Shortcut", scopes: ["voice"] }),
  });
  if (!res.ok) return;

  const data = await res.json();
  const rawKey: string | undefined = data.apiKey?.key;
  if (!rawKey) return;

  await saveVoiceCredentials(rawKey, API_URL);
}
