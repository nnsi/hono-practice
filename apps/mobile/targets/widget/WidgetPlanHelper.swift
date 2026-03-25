import Foundation

/// Manages widget plan enforcement (Free: 1 widget, Pro: unlimited).
/// Tracks the number of active widget configurations via a counter in UserDefaults.
enum WidgetPlanHelper {
    private static let countKey = "widget_active_count"

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: AppConfig.appGroupId)
    }

    /// Increment the active widget count (call when a new widget is configured).
    static func incrementCount() {
        let current = getActiveCount()
        defaults?.set(current + 1, forKey: countKey)
    }

    /// Decrement the active widget count (call when a widget is removed).
    static func decrementCount() {
        let current = getActiveCount()
        defaults?.set(max(0, current - 1), forKey: countKey)
    }

    /// Get the current active widget count.
    static func getActiveCount() -> Int {
        defaults?.integer(forKey: countKey) ?? 0
    }

    /// Check if a new widget can be added under the current plan.
    /// Free plan: max 1 widget. Pro plan: unlimited.
    static func canAddWidget() -> Bool {
        let plan = WidgetDbHelper().getPlan()
        if plan == "premium" { return true }
        return getActiveCount() < 1
    }

    /// Check if an existing widget is allowed to operate.
    /// Free plan: allowed if count <= 1. Pro plan: always allowed.
    static func isWidgetAllowed() -> Bool {
        let plan = WidgetDbHelper().getPlan()
        if plan == "premium" { return true }
        // For free plan, allow if there's at most 1 widget
        return getActiveCount() <= 1
    }
}
