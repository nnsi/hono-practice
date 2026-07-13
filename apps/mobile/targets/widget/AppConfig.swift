import Foundation

enum AppConfig {
    private static let widgetBundleSuffix = ".widget"

    static let mainAppBundleId: String = {
        guard let widgetBundleId = Bundle.main.bundleIdentifier,
              widgetBundleId.hasSuffix(widgetBundleSuffix)
        else {
            preconditionFailure("Widget bundle identifier must end in \(widgetBundleSuffix)")
        }
        return String(widgetBundleId.dropLast(widgetBundleSuffix.count))
    }()

    /// Derived from the generated widget bundle identifier, so preview,
    /// staging, and production builds never share a hard-coded container.
    static let appGroupId = "group.\(mainAppBundleId)"
}
