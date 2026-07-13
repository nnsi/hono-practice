import Foundation

/// Shared logic for saving an activity log from the widget.
/// Extracted from StopTimerIntent so SaveWithKindIntent can reuse it.
enum SaveLogHelper {
    static func saveLog(
        activityId: String,
        timerInstanceId: String,
        kindId: String?,
        state: TimerState = TimerState(),
        dbHelper: WidgetDbHelper = WidgetDbHelper(),
        now: Date = Date(),
        logId: String = UuidV7.generate()
    ) -> Result<Void, WidgetDbError> {
        let elapsedSeconds = state.getElapsedMillis(timerInstanceId: timerInstanceId) / 1000
        guard let activity = dbHelper.getActivityById(activityId) else {
            return .failure(.noMatchingRow)
        }
        if let kindId, !dbHelper.isKindOwnedByActivity(activityId, kindId: kindId) {
            return .failure(.noMatchingRow)
        }
        let unitType = TimeConversion.getTimeUnitType(activity.quantityUnit)
        let quantity = TimeConversion.convertSecondsToUnit(elapsedSeconds, unitType)
        let memo: String = {
            guard let isoStr = state.getStartDateIso(timerInstanceId: timerInstanceId) else {
                return ""
            }
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            guard let startDate = formatter.date(from: isoStr) else { return "" }
            return TimeConversion.generateTimeMemo(startTime: startDate, endTime: now)
        }()
        let utcFormatter = ISO8601DateFormatter()
        utcFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let nowIso = utcFormatter.string(from: now)
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let today = dateFormatter.string(from: now)
        return dbHelper.insertActivityLog(
            id: logId, activityId: activityId,
            activityKindId: kindId, quantity: quantity, memo: memo,
            date: today, syncStatus: "pending", createdAt: nowIso, updatedAt: nowIso
        )
    }
}
