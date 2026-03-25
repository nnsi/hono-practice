import AppIntents
import WidgetKit

/// Toggles the check state for a specific activity.
/// If not done today, inserts a log with quantity=1.
/// If already done, soft-deletes today's log(s).
struct ToggleCheckIntent: AppIntent {
    static var title: LocalizedStringResource = "Toggle Check"
    static var description: IntentDescription = "Toggle the activity check for today"

    @Parameter(title: "Activity ID")
    var activityId: String

    init() {}

    init(activityId: String) {
        self.activityId = activityId
    }

    func perform() async throws -> some IntentResult {
        let dbHelper = WidgetDbHelper()
        let isDone = dbHelper.hasActivityLogForToday(activityId)
        if isDone {
            dbHelper.softDeleteTodayLog(activityId)
        } else {
            SimpleLogHelper.saveLog(
                activityId: activityId, kindId: nil, quantity: 1
            )
        }
        WidgetCenter.shared.reloadTimelines(ofKind: "CheckWidget")
        return .result()
    }
}
