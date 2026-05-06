import Foundation

enum AppConfig {
    /// App Group identifier. Must match the value in generated.entitlements and
    /// app.config.ts `ios.entitlements["com.apple.security.application-groups"]`.
    static let appGroupId = "group.com.actiko.app"
}
