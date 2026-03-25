import Foundation

/// Shared logic for saving a simple activity log (counter, check, binary).
/// Unlike SaveLogHelper (timer-specific), this inserts a fixed quantity.
enum SimpleLogHelper {
    static func saveLog(
        activityId: String, kindId: String?, quantity: Double
    ) async {
        // Plan check: block log creation if widget is not allowed
        guard await WidgetPlanHelper.isWidgetAllowed() else { return }
        let dbHelper = WidgetDbHelper()
        let utcFormatter = ISO8601DateFormatter()
        utcFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let now = utcFormatter.string(from: Date())
        let today = WidgetDbHelper.todayDateString()
        dbHelper.insertActivityLog(
            id: UuidV7.generate(), activityId: activityId,
            activityKindId: kindId, quantity: quantity, memo: "",
            date: today, syncStatus: "pending", createdAt: now, updatedAt: now
        )
    }
}
