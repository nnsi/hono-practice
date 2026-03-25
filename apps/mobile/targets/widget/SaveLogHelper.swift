import Foundation

/// Shared logic for saving an activity log from the widget.
/// Extracted from StopTimerIntent so SaveWithKindIntent can reuse it.
enum SaveLogHelper {
    static func saveLog(activityId: String, kindId: String?) {
        let state = TimerState()
        let elapsedSeconds = state.getElapsedMillis(activityId: activityId) / 1000
        let dbHelper = WidgetDbHelper()
        guard let activity = dbHelper.getActivityById(activityId) else { return }
        let unitType = TimeConversion.getTimeUnitType(activity.quantityUnit)
        let quantity = TimeConversion.convertSecondsToUnit(elapsedSeconds, unitType)
        let memo: String = {
            guard let isoStr = state.getStartDateIso(activityId: activityId) else { return "" }
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            guard let startDate = formatter.date(from: isoStr) else { return "" }
            return TimeConversion.generateTimeMemo(startTime: startDate, endTime: Date())
        }()
        let utcFormatter = ISO8601DateFormatter()
        utcFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let now = utcFormatter.string(from: Date())
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let today = dateFormatter.string(from: Date())
        dbHelper.insertActivityLog(
            id: UuidV7.generate(), activityId: activityId,
            activityKindId: kindId, quantity: quantity, memo: memo,
            date: today, syncStatus: "pending", createdAt: now, updatedAt: now
        )
    }
}
