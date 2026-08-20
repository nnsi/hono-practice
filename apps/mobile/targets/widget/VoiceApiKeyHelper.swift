import Foundation
import Security

protocol KeychainReading {
    func copyMatching(_ query: CFDictionary, result: UnsafeMutablePointer<AnyObject?>) -> OSStatus
}

struct SecurityKeychainReader: KeychainReading {
    func copyMatching(_ query: CFDictionary, result: UnsafeMutablePointer<AnyObject?>) -> OSStatus {
        SecItemCopyMatching(query, result)
    }
}

enum VoiceApiKeyQueryFactory {
    static func makeQuery() -> [String: Any] {
        let keyData = Data("actiko-voice-api-key".utf8)
        return [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "app:no-auth",
            kSecAttrAccount as String: keyData,
            kSecAttrGeneric as String: keyData,
            // The widget target has exactly one Keychain group: the explicit
            // widget-shared group. Omitting kSecAttrAccessGroup selects it and
            // avoids confusing the App Group ID with a Keychain group.
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
    }
}

/// Manages voice API key storage in App Group Keychain and backend URL in UserDefaults.
/// Keychain queries match expo-secure-store's format so both sides can read the same item.
enum VoiceApiKeyHelper {
    private static let backendUrlKey = "voice_backend_url"

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: AppConfig.appGroupId)
    }

    // MARK: - API Key (Keychain) — read-only from widget side

    static func getApiKey(reader: KeychainReading = SecurityKeychainReader()) -> String? {
        let query = VoiceApiKeyQueryFactory.makeQuery()
        var result: AnyObject?
        let status = reader.copyMatching(query as CFDictionary, result: &result)
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
