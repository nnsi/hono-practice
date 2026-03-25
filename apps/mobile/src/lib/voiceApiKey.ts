import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const VOICE_API_KEY_STORE_KEY = "actiko-voice-api-key";
const VOICE_BACKEND_URL_KEY = "voice_backend_url";

/**
 * Save voice API key to shared Keychain (accessible by widget extension).
 * Uses expo-secure-store with accessGroup for App Group sharing.
 */
export async function saveVoiceApiKey(apiKey: string): Promise<void> {
  if (Platform.OS !== "ios") {
    // Android uses EncryptedSharedPreferences written from native code
    console.warn("saveVoiceApiKey: not supported on this platform");
    return;
  }
  const groupId = getAppGroupId();
  if (!groupId) return;
  await SecureStore.setItemAsync(VOICE_API_KEY_STORE_KEY, apiKey, {
    accessGroup: groupId,
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

/**
 * Read voice API key from shared Keychain.
 */
export async function getVoiceApiKey(): Promise<string | null> {
  if (Platform.OS !== "ios") return null;
  const groupId = getAppGroupId();
  if (!groupId) return null;
  return SecureStore.getItemAsync(VOICE_API_KEY_STORE_KEY, {
    accessGroup: groupId,
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

/**
 * Delete voice API key from shared Keychain.
 */
export async function deleteVoiceApiKey(): Promise<void> {
  if (Platform.OS !== "ios") return;
  const groupId = getAppGroupId();
  if (!groupId) return;
  await SecureStore.deleteItemAsync(VOICE_API_KEY_STORE_KEY, {
    accessGroup: groupId,
  });
}

/**
 * Save backend URL to App Group UserDefaults (accessible by widget extension).
 * Uses @bacons/apple-targets ExtensionStorage.
 */
export function saveVoiceBackendUrl(backendUrl: string): void {
  if (Platform.OS !== "ios") return;
  if (!backendUrl.startsWith("https://")) {
    console.warn("saveVoiceBackendUrl: URL must use HTTPS");
    return;
  }
  const storage = getExtensionStorage();
  if (!storage) return;
  storage.set(VOICE_BACKEND_URL_KEY, backendUrl);
}

/**
 * Read backend URL from App Group UserDefaults.
 */
export function getVoiceBackendUrl(): string | null {
  if (Platform.OS !== "ios") return null;
  const storage = getExtensionStorage();
  if (!storage) return null;
  return (storage.get(VOICE_BACKEND_URL_KEY) as string) ?? null;
}

// MARK: - Helpers

function getAppGroupId(): string | undefined {
  try {
    const { Paths } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("expo-file-system") as typeof import("expo-file-system");
    const containers = Paths.appleSharedContainers;
    return Object.keys(containers)[0];
  } catch {
    return undefined;
  }
}

function getExtensionStorage() {
  try {
    const { ExtensionStorage } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("@bacons/apple-targets") as typeof import("@bacons/apple-targets");
    const groupId = getAppGroupId();
    if (!groupId) return null;
    return new ExtensionStorage(groupId);
  } catch {
    return null;
  }
}
