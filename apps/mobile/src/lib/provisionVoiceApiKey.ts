import { Platform } from "react-native";

import { customFetch, getApiUrl } from "../utils/apiClient";
import {
  getVoiceApiKey,
  saveVoiceApiKey,
  saveVoiceBackendUrl,
} from "./voiceApiKey";

const API_URL = getApiUrl();

/**
 * Proユーザーのショートカット用APIキーを自動プロビジョニングする。
 * Keychainにキーが未保存の場合のみ、バックエンドでvoiceスコープのキーを作成して保存する。
 */
export async function provisionVoiceApiKey(): Promise<void> {
  if (Platform.OS !== "ios") return;

  const existing = await getVoiceApiKey();
  if (existing) return;

  const res = await customFetch(`${API_URL}/users/api-keys`, {
    method: "POST",
    body: JSON.stringify({ name: "Siri Shortcut", scope: "voice" }),
  });
  if (!res.ok) return;

  const data = await res.json();
  const rawKey: string | undefined = data.apiKey?.key;
  if (!rawKey) return;

  await saveVoiceApiKey(rawKey);
  saveVoiceBackendUrl(API_URL);
}
