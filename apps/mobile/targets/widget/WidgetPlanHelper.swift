import Foundation
import WidgetKit

/// Manages widget plan enforcement (Free: 1 widget, Pro: unlimited).
/// Uses WidgetCenter to count actual active widget instances.
enum WidgetPlanHelper {
    /// Check if widgets are allowed under the current plan.
    /// Free plan: allowed only if total widget count <= 1.
    /// Pro plan: always allowed.
    static func isWidgetAllowed() async -> Bool {
        let plan = WidgetDbHelper().getPlan()
        let count = await getActiveWidgetCount()
        return WidgetPlanPolicy.isWidgetAllowed(plan: plan, activeWidgetCount: count)
    }

    /// Get the actual number of active widget instances from WidgetCenter.
    /// A nil count means WidgetCenter could not enumerate configurations. The
    /// policy treats that state as denied for free plans instead of guessing 0.
    private static func getActiveWidgetCount() async -> Int? {
        await withCheckedContinuation { continuation in
            WidgetCenter.shared.getCurrentConfigurations { result in
                switch result {
                case .success(let configs):
                    continuation.resume(returning: configs.count)
                case .failure:
                    continuation.resume(returning: nil)
                }
            }
        }
    }
}
