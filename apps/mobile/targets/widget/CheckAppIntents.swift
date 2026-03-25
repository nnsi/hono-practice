import AppIntents
import WidgetKit

/// Toggles the check state for a specific activity.
/// If not done today, inserts a log with quantity=1 and optional kindId.
/// If already done, soft-deletes today's log(s).
struct ToggleCheckIntent: AppIntent {
    static var title: LocalizedStringResource = "Toggle Check"
    static var description: IntentDescription = "Toggle the activity check for today"

    @Parameter(title: "Activity ID")
    var activityId: String

    @Parameter(title: "Kind ID")
    var kindId: String?

    init() {}

    init(activityId: String, kindId: String?) {
        self.activityId = activityId
        self.kindId = kindId
    }

    func perform() async throws -> some IntentResult {
        let dbHelper = WidgetDbHelper()
        let isDone = dbHelper.hasActivityLogForToday(activityId)
        if isDone {
            dbHelper.softDeleteTodayLog(activityId)
        } else {
            await SimpleLogHelper.saveLog(
                activityId: activityId, kindId: kindId, quantity: 1
            )
        }
        WidgetCenter.shared.reloadTimelines(ofKind: "CheckWidget")
        return .result()
    }
}
