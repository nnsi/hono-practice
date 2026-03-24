import Foundation

enum AppConfig {
    /// App Group identifier derived from the widget extension's bundle ID.
    /// Widget bundle ID is typically "com.example.app.widget",
    /// so the App Group is "group.com.example.app".
    static let appGroupId: String = {
        let bundleId = Bundle.main.bundleIdentifier ?? ""
        let parts = bundleId.components(separatedBy: ".")
        if parts.count > 1 {
            let appBundleId = parts.dropLast().joined(separator: ".")
            return "group.\(appBundleId)"
        }
        return "group.\(bundleId)"
    }()
}
