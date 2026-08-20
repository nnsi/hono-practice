/// Pure entitlement policy shared by widget runtime checks and native tests.
enum WidgetPlanPolicy {
    static func isWidgetAllowed(plan: String, activeWidgetCount: Int?) -> Bool {
        if plan == "premium" { return true }
        guard let activeWidgetCount else { return false }
        return activeWidgetCount <= 1
    }
}
