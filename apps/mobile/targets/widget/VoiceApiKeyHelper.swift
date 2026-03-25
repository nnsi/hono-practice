import Foundation
import Security

/// Manages voice API key storage in App Group Keychain and backend URL in UserDefaults.
/// Keychain queries match expo-secure-store's format so both sides can read the same item.
enum VoiceApiKeyHelper {
    /// expo-secure-store default service name with `:no-auth` suffix.
    private static let keychainService = "app:no-auth"
    /// The key string used in expo-secure-store's setItemAsync call.
    private static let keychainKey = "actiko-voice-api-key"
    private static let backendUrlKey = "voice_backend_url"

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: AppConfig.appGroupId)
    }

    // MARK: - API Key (Keychain) — read-only from widget side

    static func getApiKey() -> String? {
        let keyData = Data(keychainKey.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: keyData,
            kSecAttrAccessGroup as String: AppConfig.appGroupId,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    // MARK: - Backend URL (UserDefaults)

    static func getBackendUrl() -> String? {
        defaults?.string(forKey: backendUrlKey)
    }
}
