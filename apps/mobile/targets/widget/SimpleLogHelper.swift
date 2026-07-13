import Foundation

/// Shared logic for saving a simple activity log (counter, check, binary).
/// Unlike SaveLogHelper (timer-specific), this inserts a fixed quantity.
enum SimpleLogHelper {
    static func saveLog(
        activityId: String,
        kindId: String?,
        quantity: Double,
        isPlanAllowed: Bool
    ) async -> Result<Void, WidgetSaveError> {
        guard isPlanAllowed else { return .failure(.planNotAllowed) }
        let dbHelper = WidgetDbHelper()
        if let kindId, !dbHelper.isKindOwnedByActivity(activityId, kindId: kindId) {
            return .failure(.database(.noMatchingRow))
        }
        let utcFormatter = ISO8601DateFormatter()
        utcFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let now = utcFormatter.string(from: Date())
        let today = WidgetDbHelper.todayDateString()
        return dbHelper.insertActivityLog(
            id: UuidV7.generate(), activityId: activityId,
            activityKindId: kindId, quantity: quantity, memo: "",
            date: today, syncStatus: "pending", createdAt: now, updatedAt: now
        ).mapError(WidgetSaveError.database)
    }
}
