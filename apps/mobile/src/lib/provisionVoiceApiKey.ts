import { Platform } from "react-native";

import { getApiUrl } from "../api/apiClient";
import { customFetch } from "../api/customFetch";
import {
  clearVoiceCredentials,
  getVoiceCredentialOwner,
  hasVoiceApiKey,
  saveVoiceCredentials,
} from "./voiceApiKeyBridge";

const API_URL = getApiUrl();

/**
 * Proユーザーのショートカット用APIキーを自動プロビジョニングする。
 * 既にキーが保存済みの場合はスキップ。
 * iOS: Keychain (App Group), Android: EncryptedSharedPreferences
 */
export async function provisionVoiceApiKey(userId: string): Promise<void> {
  if (Platform.OS === "web") return;

  const [existing, ownerUserId] = await Promise.all([
    hasVoiceApiKey(),
    getVoiceCredentialOwner(),
  ]);
  if (existing && ownerUserId === userId) return;
  await clearVoiceCredentials();

  const res = await customFetch(`${API_URL}/users/api-keys`, {
    method: "POST",
    body: JSON.stringify({ name: "Voice Shortcut", scopes: ["voice"] }),
  });
  if (!res.ok) return;

  const data = await res.json();
  const rawKey: string | undefined = data.apiKey?.key;
  if (!rawKey) return;

  await saveVoiceCredentials(rawKey, API_URL, userId);
}
